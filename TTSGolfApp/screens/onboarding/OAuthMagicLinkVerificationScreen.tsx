/**
 * OAuthMagicLinkVerificationScreen
 * Waits for user to tap SMS magic link and completes OAuth signup
 * 
 * Flow:
 * 1. Shows "Check your messages" screen
 * 2. Listens for deep link from SMS
 * 3. Verifies magic link token
 * 4. Creates user account with OAuth data + verified phone
 * 5. Navigates to profile completion (name, picture)
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, Mail } from "lucide-react-native";
import * as Linking from "expo-linking";

import { verifySmsMagicLink, requestSmsMagicLink, maskPhoneDisplay } from "../../utils/smsMagicLink";
import { sessionManager } from "../../utils/sessionManager";
import { ONBOARDING_COLORS as COLORS } from "./constants";
import { logger } from "../../utils/logger";

interface OAuthMagicLinkVerificationProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    replace: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      phoneNumber: string;
      providerData?: {
        email?: string;
        first_name?: string;
        firstName?: string;
        last_name?: string;
        lastName?: string;
        picture?: string;
      };
    };
  };
}

export function OAuthMagicLinkVerificationScreen({
  navigation,
  route,
}: OAuthMagicLinkVerificationProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const phoneNumber = route?.params?.phoneNumber || "";
  const providerData = route?.params?.providerData;

  const [isVerifying, setIsVerifying] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const maskedPhone = maskPhoneDisplay(phoneNumber);

  const handleMagicLinkUrl = useCallback(
    async (url: string) => {
      try {
        const parsed = Linking.parse(url);
        const tokenRaw = parsed.queryParams?.token;
        const token =
          typeof tokenRaw === "string"
            ? tokenRaw
            : Array.isArray(tokenRaw)
              ? tokenRaw[0]
              : null;
        
        if (!token || typeof token !== "string") return;

        logger.debug("[OAuthMagicLinkVerification] Received magic link token");
        setIsVerifying(true);
        setError(null);

        const result = await verifySmsMagicLink(token);
        setIsVerifying(false);

        if (result.success) {
          logger.info("[OAuthMagicLinkVerification] Phone verified successfully");
          
          // Save session if tokens are returned (OAuth user phone linked)
          if (result.accessToken && result.refreshToken && result.user) {
            await sessionManager.saveSession({
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              user: result.user,
            });
            
            // OAuth user phone linked - navigate directly to availability onboarding
            setIsAuthenticated(true);
            setTimeout(() => {
              navigation.replace("AvailabilityOnboarding", { user: result.user });
            }, 1500);
            return;
          }

          setIsAuthenticated(true);

          // Navigate to profile completion with OAuth data (regular signup flow)
          setTimeout(() => {
            navigation.replace("OAuthProfileCompletion", {
              phoneNumber,
              providerData,
              verifiedPhoneNumber: result.phoneNumber || phoneNumber,
            });
          }, 1500);
        } else {
          setError(result.error || "Verification failed");
          Alert.alert("Verification Failed", result.error || "Please try again.");
        }
      } catch (err) {
        logger.error("[OAuthMagicLinkVerification] Error verifying magic link", err);
        setIsVerifying(false);
        setError("Verification failed");
        Alert.alert("Verification Failed", "Please try again.");
      }
    },
    [phoneNumber, providerData, navigation]
  );

  // Listen for deep link (app in foreground/background)
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url.includes("auth/magic-link") && url.includes("token=")) {
        handleMagicLinkUrl(url);
      }
    });

    return () => subscription.remove();
  }, [handleMagicLinkUrl]);

  // Handle app opened from closed state via deep link
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url && url.includes("auth/magic-link") && url.includes("token=")) {
        handleMagicLinkUrl(url);
      }
    });
  }, [handleMagicLinkUrl]);

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleResend = async () => {
    if (resendTimer > 0) return;

    setError(null);
    const result = await requestSmsMagicLink(phoneNumber);

    if (result.success) {
      setResendTimer(60);
      Alert.alert("Link Sent", "We've sent you a new verification link");
    } else {
      setError(result.error || "Failed to send link");
      Alert.alert("Error", result.error || "Failed to send verification link");
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="h-14 justify-center px-6">
        <TouchableOpacity
          className="w-10 h-10 justify-center items-start"
          onPress={handleBack}
        >
          <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 justify-center items-center px-6">
        {isAuthenticated ? (
          /* Success View */
          <>
            <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6">
              <View className="w-20 h-20 rounded-full bg-green-500 items-center justify-center">
                <Text className="text-white text-4xl">✓</Text>
              </View>
            </View>
            <Text className="text-[28px] font-bold text-gray-900 mb-2 text-center">
              Verification complete
            </Text>
            <Text className="text-[15px] text-gray-500 text-center leading-6">
              Your phone number has been verified successfully
            </Text>
          </>
        ) : isVerifying ? (
          /* Verifying View */
          <>
            <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6">
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
            <Text className="text-[28px] font-bold text-gray-900 mb-2 text-center">
              Verifying...
            </Text>
            <Text className="text-[15px] text-gray-500 text-center leading-6">
              Authenticating your phone number
            </Text>
          </>
        ) : (
          /* Waiting View */
          <>
            <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6">
              <Mail size={48} color={COLORS.primary} strokeWidth={1.5} />
            </View>
            <Text className="text-[28px] font-bold text-gray-900 mb-2 text-center">
              Check your messages
            </Text>
            <Text className="text-[15px] text-gray-500 text-center leading-6 mb-4">
              We've sent a verification link to{"\n"}
              <Text className="font-semibold text-green-600">{maskedPhone}</Text>
              {"\n\n"}
              Tap the link in your SMS to verify your phone number.
            </Text>
            {error && (
              <Text className="text-sm text-red-500 mb-4 text-center">
                {error}
              </Text>
            )}
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendTimer > 0}
              className="mt-6"
            >
              <Text
                className={`text-sm font-semibold ${
                  resendTimer > 0 ? "text-gray-400" : "text-green-600"
                }`}
              >
                {resendTimer > 0
                  ? `Resend in ${resendTimer}s`
                  : "Didn't receive it? Resend link"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

export default OAuthMagicLinkVerificationScreen;
