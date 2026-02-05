/**
 * OAuthButtons Component
 * Firebase Authentication with Google Sign-In
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth } from "../../config/firebase";

import {
  colorTokens,
  spacingTokens,
  borderTokens,
  componentTokens,
  typographyTokens,
  shadowTokens,
} from "../../theme/tokens";
import { sessionManager } from "../../utils/sessionManager";
import {
  oauthService,
  isUserCancellation,
  formatOAuthError,
} from "../../services/oauthService";
import type {
  OAuthButtonsProps,
  OAuthSuccessData,
} from "../../types/oauth";
import GoogleLogo from "../GoogleLogo";

// ============================================================================
// Constants
// ============================================================================

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Configure Google Sign-In with Firebase
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

console.log("[Firebase] Configured with Web Client ID:", GOOGLE_WEB_CLIENT_ID);

// ============================================================================
// Helper Functions
// ============================================================================

function isGoogleConfigured(): boolean {
  return !!(GOOGLE_WEB_CLIENT_ID && !GOOGLE_WEB_CLIENT_ID.includes("XXXXX"));
}

// ============================================================================
// Component
// ============================================================================

export function OAuthButtons({
  onSuccess,
  onError,
  disabled = false,
}: OAuthButtonsProps): React.ReactElement {
  const googleConfigured = useMemo(() => isGoogleConfigured(), []);

  /**
   * Process Firebase user and send to backend
   */
  const handleFirebaseUser = useCallback(
    async (firebaseUser: any) => {
      try {
        console.log("[Firebase] Getting ID token...");
        const idToken = await firebaseUser.getIdToken();

        console.log("[Firebase] Sending ID token to backend for verification...");
        const data = await oauthService.signInWithGoogle(idToken);

        console.log("[Firebase] Backend response:", JSON.stringify(data, null, 2));

        // Save session
        await sessionManager.saveSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });

        // Prepare success callback data
        const successData: OAuthSuccessData = {
          isNewUser: data.isNewUser,
          user: data.user,
        };

        // Check if onboarding is needed
        if (data.needsOnboarding && data.missingFields?.length > 0) {
          console.log("[Firebase] Onboarding needed. Missing fields:", data.missingFields);
          successData.needsOnboarding = true;
          successData.oauthData = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user,
            needsOnboarding: data.needsOnboarding,
            missingFields: data.missingFields,
          };
        } else {
          console.log("[Firebase] No onboarding needed. User is complete.");
        }

        console.log("[Firebase] Calling onSuccess with:", JSON.stringify(successData, null, 2));
        onSuccess(successData);
      } catch (error) {
        console.error("[Firebase] Backend verification error:", error);
        onError(formatOAuthError(error));
      }
    },
    [onSuccess, onError],
  );

  /**
   * Initiate Google Sign-In using Firebase
   */
  const handleGoogleSignIn = useCallback(async () => {
    if (!googleConfigured) {
      Alert.alert(
        "Google Sign-In Not Available",
        "Google Sign-In is not configured. Please use phone number login or Apple Sign-In.",
        [{ text: "OK" }],
      );
      return;
    }

    try {
      console.log("[Firebase] Starting Google Sign-In...");

      // Check Play Services (Android only)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();

      console.log("[Firebase] Google Sign-In response:", JSON.stringify(userInfo, null, 2));

      // Get the ID token from the response
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        console.error("[Firebase] No ID token in response. Full response:", userInfo);
        throw new Error("No ID token received from Google");
      }

      console.log("[Firebase] Got Google ID token, signing in to Firebase...");

      // Check if Firebase auth is available
      if (!auth) {
        throw new Error("Firebase authentication is not initialized. Please check your Firebase configuration.");
      }

      // Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase
      const userCredential = await signInWithCredential(auth, googleCredential);

      console.log("[Firebase] Firebase sign-in successful");
      console.log("[Firebase] User:", userCredential.user.email);

      // Send to backend
      await handleFirebaseUser(userCredential.user);

    } catch (error: any) {
      console.error("[Firebase] Google Sign-In Error:", error);

      // Handle specific error codes
      if (error.code === "SIGN_IN_CANCELLED" || error.code === 'auth/cancelled-popup-request') {
        console.log("[Firebase] User cancelled sign-in");
        return;
      }

      if (error.code === "IN_PROGRESS") {
        console.log("[Firebase] Sign-in already in progress");
        return;
      }

      if (error.code === "PLAY_SERVICES_NOT_AVAILABLE") {
        onError("Google Play Services not available. Please update Google Play Services.");
        return;
      }

      onError(formatOAuthError(error));
    }
  }, [googleConfigured, handleFirebaseUser, onError]);

  /**
   * Initiate Apple Sign-In flow
   */
  const handleAppleSignIn = useCallback(async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const data = await oauthService.signInWithApple({
        identityToken: credential.identityToken!,
        user: credential.fullName
          ? {
            name: {
              firstName: credential.fullName.givenName,
              lastName: credential.fullName.familyName,
            },
          }
          : null,
      });

      // Save session
      await sessionManager.saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });

      // Prepare success callback data
      const successData: OAuthSuccessData = {
        isNewUser: data.isNewUser,
        user: data.user,
      };

      // Check if onboarding is needed
      if (data.needsOnboarding && data.missingFields?.length > 0) {
        successData.needsOnboarding = true;
        successData.oauthData = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          needsOnboarding: data.needsOnboarding,
          missingFields: data.missingFields,
        };
      }

      onSuccess(successData);
    } catch (error) {
      if (isUserCancellation(error)) {
        return;
      }
      console.error("[Firebase] Apple Sign-In Error:", error);
      onError(formatOAuthError(error));
    }
  }, [onSuccess, onError]);

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* OAuth Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Apple Sign-In (iOS only) */}
        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={borderTokens.radius.md}
            style={[styles.appleButton, disabled && styles.buttonDisabled]}
            onPress={() => void (!disabled && handleAppleSignIn())}
          />
        )}

        {/* Google Sign-In */}
        {googleConfigured && (
          <TouchableOpacity
            style={[styles.googleButton, disabled && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
            disabled={disabled}
          >
            <GoogleLogo size={componentTokens.icon.size.sm} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacingTokens.xxl,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacingTokens.xxl,
  },
  dividerLine: {
    flex: 1,
    height: borderTokens.width.thin,
    backgroundColor: colorTokens.neutral.outline,
  },
  dividerText: {
    marginHorizontal: spacingTokens.lg,
    fontSize: typographyTokens.fontSize.sm,
    color: colorTokens.text.secondary,
  },
  buttonsContainer: {
    gap: spacingTokens.md,
  },
  appleButton: {
    height: componentTokens.button.height.lg,
  },
  googleButton: {
    height: componentTokens.button.height.lg,
    backgroundColor: colorTokens.neutral.white,
    borderRadius: borderTokens.radius.md,
    borderWidth: borderTokens.width.thin,
    borderColor: colorTokens.neutral.outline,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.md,
    paddingHorizontal: spacingTokens.lg,
    ...shadowTokens.sm,
  },
  googleButtonText: {
    fontSize: typographyTokens.fontSize.md,
    fontWeight: typographyTokens.fontWeight.semibold,
    color: colorTokens.text.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default OAuthButtons;
