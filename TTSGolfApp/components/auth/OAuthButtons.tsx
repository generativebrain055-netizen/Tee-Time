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
import { logger } from "../../utils/logger";

// ============================================================================
// Constants
// ============================================================================

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// ============================================================================
// Helper Functions
// ============================================================================

function isGoogleConfigured(): boolean {
  return !!(GOOGLE_WEB_CLIENT_ID && !GOOGLE_WEB_CLIENT_ID.includes("XXXXX"));
}

/** Lazy init Google Sign-In - only call configure when we have valid config (prevents iOS crash on startup) */
let googleSignInConfigured = false;
function ensureGoogleSignInConfigured(): void {
  if (googleSignInConfigured) return;
  if (!isGoogleConfigured()) return;
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID!,
      ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
      offlineAccess: false,
    });
    googleSignInConfigured = true;
    logger.debug("[Firebase] Configured Google Sign-In with Web Client ID");
  } catch (e) {
    logger.error("[Firebase] Google Sign-In configure failed:", e);
  }
}

// ============================================================================
// Component
// ============================================================================

const GOOGLE_GREEN = "#5EBC68";
const APPLE_GRAY = "#F7F7F7";

export function OAuthButtons({
  onSuccess,
  onError,
  disabled = false,
  layout = "default",
}: OAuthButtonsProps): React.ReactElement {
  const googleConfigured = useMemo(() => isGoogleConfigured(), []);
  const isSignupLayout = layout === "signup";

  /**
   * Process Firebase user and send to backend
   */
  const handleFirebaseUser = useCallback(
    async (firebaseUser: any) => {
      try {
        logger.debug("[Firebase] Getting ID token...");
        const idToken = await firebaseUser.getIdToken();

        logger.debug("[Firebase] Sending ID token to backend for verification...");
        const data = await oauthService.signInWithGoogle(idToken);

        logger.debug("[Firebase] Backend response:", JSON.stringify(data, null, 2));

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
          logger.debug("[Firebase] Onboarding needed. Missing fields:", data.missingFields);
          successData.needsOnboarding = true;
          successData.oauthData = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user,
            needsOnboarding: data.needsOnboarding,
            missingFields: data.missingFields,
          };
        } else {
          logger.debug("[Firebase] No onboarding needed. User is complete.");
        }

        logger.debug("[Firebase] Calling onSuccess with:", JSON.stringify(successData, null, 2));
        onSuccess(successData);
      } catch (error) {
        logger.error("[Firebase] Backend verification error:", error);
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
      ensureGoogleSignInConfigured();
      logger.debug("[Firebase] Starting Google Sign-In...");

      // Check Play Services (Android only)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();

      logger.debug("[Firebase] Google Sign-In response:", JSON.stringify(userInfo, null, 2));

      // Get the ID token from the response
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        logger.error("[Firebase] No ID token in response. Full response:", userInfo);
        throw new Error("No ID token received from Google");
      }

      logger.debug("[Firebase] Got Google ID token, signing in to Firebase...");

      // Check if Firebase auth is available
      if (!auth) {
        throw new Error("Firebase authentication is not initialized. Please check your Firebase configuration.");
      }

      // Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase
      const userCredential = await signInWithCredential(auth, googleCredential);

      logger.debug("[Firebase] Firebase sign-in successful");
      logger.debug("[Firebase] User:", userCredential.user.email);

      // Send to backend
      await handleFirebaseUser(userCredential.user);

    } catch (error: any) {
      logger.error("[Firebase] Google Sign-In Error:", error);

      // Handle specific error codes
      if (error.code === "SIGN_IN_CANCELLED" || error.code === 'auth/cancelled-popup-request') {
        logger.debug("[Firebase] User cancelled sign-in");
        return;
      }

      if (error.code === "IN_PROGRESS") {
        logger.debug("[Firebase] Sign-in already in progress");
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
      logger.error("[Firebase] Apple Sign-In Error:", error);
      onError(formatOAuthError(error));
    }
  }, [onSuccess, onError]);

  const renderGoogleButton = () =>
    googleConfigured && (
      <TouchableOpacity
        style={[
          isSignupLayout ? styles.googleButtonSignup : styles.googleButton,
          disabled && styles.buttonDisabled,
        ]}
        onPress={handleGoogleSignIn}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <GoogleLogo size={componentTokens.icon.size.sm} />
        <Text
          style={[
            isSignupLayout ? styles.googleButtonTextSignup : styles.googleButtonText,
          ]}
        >
          Continue with Google
        </Text>
      </TouchableOpacity>
    );

  const renderAppleButton = () =>
    Platform.OS === "ios" && (
      isSignupLayout ? (
        <TouchableOpacity
          style={[styles.appleButtonSignup, disabled && styles.buttonDisabled]}
          onPress={() => void (!disabled && handleAppleSignIn())}
          activeOpacity={0.8}
          disabled={disabled}
        >
          <Text style={styles.appleButtonTextSignup}>Continue with Apple</Text>
        </TouchableOpacity>
      ) : (
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
      )
    );

  const divider = (
    <View style={[styles.divider, isSignupLayout && styles.dividerTop]}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or continue with</Text>
      <View style={styles.dividerLine} />
    </View>
  );

  return (
    <View style={styles.container}>
      {!isSignupLayout && divider}

      <View style={styles.buttonsContainer}>
        {isSignupLayout ? (
          <>
            {renderGoogleButton()}
            {renderAppleButton()}
          </>
        ) : (
          <>
            {renderAppleButton()}
            {renderGoogleButton()}
          </>
        )}
      </View>

      {isSignupLayout && divider}
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
  googleButtonSignup: {
    height: componentTokens.button.height.lg,
    backgroundColor: GOOGLE_GREEN,
    borderRadius: borderTokens.radius.md,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.md,
    paddingHorizontal: spacingTokens.lg,
  },
  googleButtonTextSignup: {
    fontSize: typographyTokens.fontSize.md,
    fontWeight: typographyTokens.fontWeight.semibold,
    color: "#FFFFFF",
  },
  appleButtonSignup: {
    height: componentTokens.button.height.lg,
    backgroundColor: APPLE_GRAY,
    borderRadius: borderTokens.radius.md,
    borderWidth: borderTokens.width.thin,
    borderColor: colorTokens.neutral.outline,
    justifyContent: "center",
    alignItems: "center",
  },
  appleButtonTextSignup: {
    fontSize: typographyTokens.fontSize.md,
    fontWeight: typographyTokens.fontWeight.semibold,
    color: colorTokens.text.primary,
  },
  dividerTop: {
    marginTop: spacingTokens.xxl,
    marginBottom: spacingTokens.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default OAuthButtons;
