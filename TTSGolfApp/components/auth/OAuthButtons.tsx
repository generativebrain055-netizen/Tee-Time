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
import { GoogleAuthProvider, signInWithCredential, signOut } from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth } from "../../config/firebase";

import { sessionManager } from "../../utils/sessionManager";
import {
  oauthService,
  isUserCancellation,
  formatOAuthError,
  OAuthError,
} from "../../services/oauthService";
import type {
  OAuthButtonsProps,
  OAuthSuccessData,
  OAuthProviderData,
} from "../../types/oauth";
import type { SignInResponse } from "@react-native-google-signin/google-signin";
import Svg, { Path } from "react-native-svg";
import GoogleLogo from "../GoogleLogo";
import { logger } from "../../utils/logger";

/** Apple logo from reference SVG – viewBox cropped to visible content bounds */
function AppleLogo({ width = 14, height = 17 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="19.5 15.5 17 20" fill="none">
      <Path
        d="M35.6647 30.8068C35.3774 31.4706 35.0374 32.0816 34.6434 32.6434C34.1064 33.4092 33.6667 33.9393 33.3279 34.2337C32.8026 34.7169 32.2398 34.9644 31.6371 34.9784C31.2045 34.9784 30.6827 34.8553 30.0753 34.6055C29.466 34.3568 28.906 34.2337 28.394 34.2337C27.857 34.2337 27.281 34.3568 26.665 34.6055C26.048 34.8553 25.551 34.9855 25.171 34.9984C24.5931 35.023 24.017 34.7685 23.442 34.2337C23.075 33.9135 22.616 33.3647 22.0661 32.5871C21.4761 31.7567 20.991 30.7939 20.611 29.6961C20.204 28.5104 20 27.3622 20 26.2507C20 24.9773 20.2751 23.8791 20.826 22.9588C21.259 22.2196 21.8351 21.6365 22.5561 21.2084C23.277 20.7804 24.056 20.5622 24.895 20.5483C25.354 20.5483 25.956 20.6903 26.704 20.9694C27.45 21.2495 27.9289 21.3915 28.1389 21.3915C28.2959 21.3915 28.828 21.2254 29.73 20.8943C30.583 20.5873 31.3029 20.4602 31.8927 20.5103C33.4908 20.6393 34.6915 21.2694 35.49 22.4047C34.0607 23.2709 33.3537 24.4842 33.3677 26.0406C33.3806 27.2529 33.8203 28.2618 34.6845 29.0628C35.0761 29.4346 35.5134 29.7219 36 29.926C35.8945 30.2321 35.7831 30.5253 35.6647 30.8068ZM31.9994 16.3801C31.9994 17.3303 31.6524 18.2175 30.9606 19.0387C30.1258 20.015 29.116 20.5791 28.021 20.4901C28.007 20.3761 27.9989 20.2561 27.9989 20.13C27.9989 19.2178 28.396 18.2416 29.101 17.4434C29.453 17.0392 29.9006 16.7032 30.4435 16.4351C30.9852 16.171 31.4976 16.025 31.9795 16C31.9936 16.127 31.9994 16.2541 31.9994 16.3801V16.3801Z"
        fill="black"
      />
    </Svg>
  );
}

// ============================================================================
// Constants
// ============================================================================

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Figma Sign up w/ SSO: both buttons same style
const OAUTH_BG = "#F7F7F7";
const OAUTH_BORDER = "#E5E7EB";
const BUTTON_HEIGHT = 54;
const BUTTON_RADIUS = 8;
const ICON_SIZE = 17;
const HORIZONTAL_PADDING = 19;
const GAP_ICON_TEXT = 12;

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

/**
 * Resolve ID token from signIn(). On Android, idToken is sometimes null on the success object until getTokens() runs.
 */
async function resolveGoogleIdToken(signInResult: SignInResponse): Promise<string | null> {
  if (!signInResult || typeof signInResult !== "object") return null;
  if ("type" in signInResult && signInResult.type === "cancelled") return null;
  if ("type" in signInResult && signInResult.type === "success") {
    const direct = signInResult.data?.idToken;
    if (direct) return direct;
    if (Platform.OS === "android") {
      try {
        logger.debug("[Firebase] idToken missing after signIn; calling getTokens() (Android)");
        const tokens = await GoogleSignin.getTokens();
        return tokens.idToken ?? null;
      } catch (e) {
        logger.warn("[Firebase] getTokens() after signIn failed:", e);
        return null;
      }
    }
    return signInResult.data?.idToken ?? null;
  }
  return null;
}

// ============================================================================
// Component
// ============================================================================

export function OAuthButtons({
  onSuccess,
  onError,
  disabled = false,
}: OAuthButtonsProps): React.ReactElement {
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [isAppleLoading, setIsAppleLoading] = React.useState(false);
  const googleConfigured = useMemo(() => isGoogleConfigured(), []);

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

        // Handle pending verification (new users need phone verification)
        if (data.status === "pending_phone_verification") {
          logger.info("[Firebase] OAuth pending phone verification");
          const successData: OAuthSuccessData = {
            status: "pending_phone_verification",
            isNewUser: true,
            needsPhoneVerification: true,
            providerData: data.providerData,
          };
          if (typeof onSuccess === "function") {
            onSuccess(successData);
          } else {
            logger.warn("[Firebase] onSuccess is not a function, skipping callback");
          }
          return;
        }

        // Handle authenticated response (existing users)
        if (data.status === "authenticated") {
          logger.debug("[Firebase] Authenticated OAuth user data", {
            userId: data.user?.id,
            user: data.user ? {
              id: data.user.id,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              email: data.user.email,
              phoneNumber: data.user.phoneNumber,
            } : null,
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
            logger.info("[Firebase] Onboarding needed. Missing fields:", data.missingFields);
            successData.needsOnboarding = true;
            successData.oauthData = {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              user: data.user,
              needsOnboarding: data.needsOnboarding,
              missingFields: data.missingFields,
              providerData: data.providerData,
            };
          } else {
            logger.info("[Firebase] No onboarding needed. User is complete.");
          }

          logger.debug("[Firebase] Calling onSuccess with:", JSON.stringify(successData, null, 2));
          if (typeof onSuccess === "function") {
            onSuccess(successData);
          } else {
            logger.warn("[Firebase] onSuccess is not a function, skipping callback");
          }
        }
      } catch (error) {
        logger.error("[Firebase] Backend verification error:", error);
        if (error instanceof OAuthError && error.code === "ACCOUNT_DELETED" && auth) {
          try {
            await signOut(auth);
          } catch {
            /* ignore */
          }
        }
        if (typeof onError === "function") {
          onError(formatOAuthError(error));
        }
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

    // Prevent duplicate sign-in attempts
    if (isGoogleLoading) {
      logger.debug("[Firebase] Sign-in already in progress, ignoring duplicate call");
      return;
    }

    try {
      setIsGoogleLoading(true);
      ensureGoogleSignInConfigured();
      logger.debug("[Firebase] Starting Google Sign-In...");

      // Check Play Services (Android only)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();

      logger.debug("[Firebase] Google Sign-In response:", JSON.stringify(userInfo, null, 2));

      // v15+ returns { type: 'cancelled', data: null } when the user closes the sheet — not an error
      if (userInfo && typeof userInfo === "object" && "type" in userInfo && userInfo.type === "cancelled") {
        logger.debug("[Firebase] Google Sign-In cancelled by user");
        return;
      }

      const idToken = await resolveGoogleIdToken(userInfo as SignInResponse);

      if (!idToken) {
        if (userInfo && typeof userInfo === "object" && "type" in userInfo && userInfo.type === "success") {
          logger.warn("[Firebase] Google Sign-In succeeded but idToken still missing — check Web Client ID and Android SHA-1 in Firebase");
          onError(
            Platform.OS === "android"
              ? "Could not get a sign-in token. Confirm google-services.json is in the project, rebuild the app, and add this build’s SHA-1 in Firebase Console → Project settings → Your apps."
              : "Could not complete Google sign-in. Please try again.",
          );
        } else {
          logger.debug("[Firebase] Google Sign-In finished without an ID token");
        }
        return;
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
      // Handle specific error codes (user dismiss / duplicate tap — no UI error)
      if (error.code === "SIGN_IN_CANCELLED" || error.code === "auth/cancelled-popup-request") {
        logger.debug("[Firebase] User cancelled sign-in");
        return;
      }

      if (error.code === "IN_PROGRESS" || error.message?.includes("in progress")) {
        logger.debug("[Firebase] Sign-in already in progress");
        return;
      }

      if (isUserCancellation(error)) {
        logger.debug("[Firebase] User cancelled sign-in");
        return;
      }

      logger.error("[Firebase] Google Sign-In Error:", error);

      if (error.code === "PLAY_SERVICES_NOT_AVAILABLE") {
        onError("Google Play Services not available. Please update Google Play Services.");
        return;
      }

      // Android: configuration mismatch (package name / SHA-1 / OAuth client in Firebase or Cloud Console)
      const code = error?.code;
      const msg = String(error?.message ?? "");
      if (
        Platform.OS === "android" &&
        (code === "10" || code === 10 || msg.includes("DEVELOPER_ERROR") || msg.includes("Developer console"))
      ) {
        onError(
          "Google Sign-In isn’t set up for this Android build. In Firebase Console, open Project settings → Your apps → Android app, and add the SHA-1 from your debug or release keystore. Then download google-services.json, place it in the app root, and rebuild.",
        );
        return;
      }

      onError(formatOAuthError(error));
    } finally {
      setIsGoogleLoading(false);
    }
  }, [googleConfigured, handleFirebaseUser, onError, isGoogleLoading]);

  /**
   * Initiate Apple Sign-In flow
   */
  const handleAppleSignIn = useCallback(async () => {
    // Prevent duplicate sign-in attempts
    if (isAppleLoading) {
      logger.debug("[Firebase] Apple sign-in already in progress, ignoring duplicate call");
      return;
    }

    try {
      setIsAppleLoading(true);
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

      // Handle pending verification (new users need phone verification)
      // Backend may return "pending_verification" or "pending_phone_verification"
      const status = (data as { status?: string }).status;
      if (status === "pending_verification" || status === "pending_phone_verification") {
        logger.info("[Firebase] Apple OAuth pending phone verification");
        const successData: OAuthSuccessData = {
          status: "pending_phone_verification",
          isNewUser: true,
          needsPhoneVerification: true,
          providerData: (data as { providerData?: OAuthProviderData }).providerData,
        };
        if (typeof onSuccess === "function") {
          onSuccess(successData);
        } else {
          logger.warn("[Firebase] onSuccess is not a function, skipping callback");
        }
        return;
      }

      // Handle authenticated response (existing users)
      if (data.status === "authenticated") {
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
            providerData: data.providerData,
          };
        }

        if (typeof onSuccess === "function") {
          onSuccess(successData);
        } else {
          logger.warn("[Firebase] onSuccess is not a function, skipping callback");
        }
      }
    } catch (error) {
      if (isUserCancellation(error)) {
        return;
      }
      logger.error("[Firebase] Apple Sign-In Error:", error);
      if (typeof onError === "function") {
        onError(formatOAuthError(error));
      }
    } finally {
      setIsAppleLoading(false);
    }
  }, [onSuccess, onError, isAppleLoading]);

  const renderAppleButton = () =>
    Platform.OS === "ios" && (
      <TouchableOpacity
        style={[styles.oauthButton, (disabled || isAppleLoading) && styles.buttonDisabled]}
        onPress={() => void (!disabled && !isAppleLoading && handleAppleSignIn())}
        activeOpacity={0.8}
        disabled={disabled || isAppleLoading}
      >
        <View style={styles.appleIconWrap}>
          <AppleLogo />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.oauthButtonText}>
            {isAppleLoading ? "Signing in..." : "Continue with Apple"}
          </Text>
        </View>
      </TouchableOpacity>
    );

  const renderGoogleButton = () =>
    googleConfigured && (
      <TouchableOpacity
        style={[styles.oauthButton, (disabled || isGoogleLoading) && styles.buttonDisabled]}
        onPress={handleGoogleSignIn}
        activeOpacity={0.8}
        disabled={disabled || isGoogleLoading}
      >
        <View style={styles.googleIconWrap}>
          <GoogleLogo size={ICON_SIZE} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.oauthButtonText}>
            {isGoogleLoading ? "Signing in..." : "Continue with Google"}
          </Text>
        </View>
      </TouchableOpacity>
    );

  return (
    <View style={styles.container}>
      <View style={styles.buttonsContainer}>
        {renderAppleButton()}
        {renderGoogleButton()}
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },
  buttonsContainer: {
    gap: 16,
  },
  oauthButton: {
    height: BUTTON_HEIGHT,
    backgroundColor: OAUTH_BG,
    borderRadius: BUTTON_RADIUS,
    borderWidth: 1,
    borderColor: OAUTH_BORDER,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  appleIconWrap: {
    width: 14,
    height: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: GAP_ICON_TEXT,
  },
  /** Google button: 17×17 icon at 19px from left (per reference SVG) */
  googleIconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    justifyContent: "center",
    alignItems: "center",
    marginRight: GAP_ICON_TEXT,
  },
  textWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  oauthButtonText: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
    color: "#000000",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default OAuthButtons;
