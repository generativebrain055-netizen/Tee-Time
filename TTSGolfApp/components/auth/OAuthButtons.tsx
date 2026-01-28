/**
 * OAuthButtons Component
 * Production-grade OAuth authentication buttons for Apple and Google Sign-In
 *
 * @module components/auth/OAuthButtons
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
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

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
  GoogleOAuthConfig,
} from "../../types/oauth";
import GoogleLogo from "../GoogleLogo";

// Complete auth session for OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

// ============================================================================
// Constants
// ============================================================================

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if Google OAuth is properly configured
 */
function isGoogleConfigured(): boolean {
  return !!(
    GOOGLE_IOS_CLIENT_ID &&
    GOOGLE_WEB_CLIENT_ID &&
    !GOOGLE_IOS_CLIENT_ID.includes("XXXXX")
  );
}

/**
 * Get Google OAuth configuration if available
 */
function getGoogleConfig(): GoogleOAuthConfig | null {
  if (!isGoogleConfigured()) return null;

  return {
    iosClientId: GOOGLE_IOS_CLIENT_ID!,
    webClientId: GOOGLE_WEB_CLIENT_ID!,
    scopes: ["profile", "email"],
  };
}

// ============================================================================
// Component
// ============================================================================

/**
 * OAuth authentication buttons component
 * Provides Apple Sign-In (iOS only) and Google Sign-In options
 */
export function OAuthButtons({
  onSuccess,
  onError,
  disabled = false,
}: OAuthButtonsProps): React.ReactElement {
  const googleConfig = useMemo(() => getGoogleConfig(), []);

  // Initialize Google Sign-In hook
  const [_request, response, promptAsync] = Google.useIdTokenAuthRequest(
    googleConfig || { iosClientId: "", webClientId: "" },
  );

  // Handle Google OAuth response
  React.useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleResponse(id_token);
    }
  }, [response]);

  /**
   * Process Google OAuth token and complete authentication
   */
  const handleGoogleResponse = useCallback(
    async (idToken: string) => {
      try {
        const data = await oauthService.signInWithGoogle(idToken);

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
        console.error("[OAuth] Google Sign-In Error:", error);
        onError(formatOAuthError(error));
      }
    },
    [onSuccess, onError],
  );

  /**
   * Initiate Google Sign-In flow
   */
  const handleGoogleSignIn = useCallback(async () => {
    if (!googleConfig) {
      Alert.alert(
        "Google Sign-In Not Available",
        "Google Sign-In is not configured. Please use phone number login or Apple Sign-In.",
        [{ text: "OK" }],
      );
      return;
    }

    try {
      await promptAsync();
    } catch (error) {
      console.error("[OAuth] Google Sign-In Error:", error);
      onError(formatOAuthError(error));
    }
  }, [googleConfig, promptAsync, onError]);

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
        // User cancelled - don't show error
        return;
      }
      console.error("[OAuth] Apple Sign-In Error:", error);
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
        {googleConfig && (
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

// ============================================================================
// Exports
// ============================================================================

export default OAuthButtons;
