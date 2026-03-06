/**
 * Login Screen - iOS Keyboard Fixed Implementation
 * Keyboard overlays on top without pushing content
 */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";

import { useLoginFlow } from "./hooks/useLoginFlow";
import { PhoneInput } from "./components";
import { LOGIN_COLORS } from "./constants";
import { maskPhoneDisplay } from "../../utils/smsMagicLink";
import { OAuthButtons, AdContainerPlaceholder } from "../../components";
import { logger } from "../../utils/logger";

interface Props {
  navigation: any;
}

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const {
    phoneNumber,
    setPhoneNumber,
    selectedCountry,
    setSelectedCountry,
    currentStep,
    resendTimer,
    inputFocused,
    setInputFocused,
    hasError,
    loading,
    error,
    isButtonDisabled,
    fullPhoneNumber,
    phoneInputRef,
    fadeAnim,
    slideAnim,
    handlePrimaryAction,
    handleResendMagicLink,
    handleBack,
    clearPhoneInput,
    devWebFallback,
    setError,
  } = useLoginFlow(navigation);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#111827" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Main Content - Fixed position, keyboard overlays */}
        <View style={styles.mainContent}>
          <Animated.View
            style={[
              styles.animatedContent,
              { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              {currentStep === "phone"
                ? "Already created an account? Sign in here."
                : `Check your phone - tap the sign-in link we sent to ${maskPhoneDisplay(fullPhoneNumber)}`}
            </Text>

            {currentStep === "phone" ? (
              <View style={styles.phoneStepColumn}>
                <PhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  selectedCountry={selectedCountry}
                  onCountryChange={setSelectedCountry}
                  inputRef={phoneInputRef}
                  focused={inputFocused}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  hasError={hasError}
                  onClear={clearPhoneInput}
                  errorMessage={error}
                />
                {error && error.includes("Cannot connect to server") ? (
                  <Text style={styles.connectionHint}>
                    Run in Terminal: cd TTSGolfApp && npm run start:with-backend
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    styles.nextButtonInContent,
                    isButtonDisabled && styles.nextButtonDisabled,
                  ]}
                  onPress={handlePrimaryAction}
                  disabled={isButtonDisabled}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
                <View style={[styles.dividerWrap, styles.dividerWrapInColumn]}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <OAuthButtons
                  onSuccess={async (data) => {
                    logger.debug("[LoginScreen] OAuth onSuccess received", {
                      status: data.status,
                      isNewUser: data.isNewUser,
                      needsPhoneVerification: data.needsPhoneVerification,
                      needsOnboarding: data.needsOnboarding,
                      hasUser: !!data.user,
                      hasProviderData: !!data.providerData,
                    });

                    const pd = data.providerData;
                    const isUnregisteredSso =
                      (data.status === "pending_phone_verification" && pd) ||
                      (data.isNewUser && pd && !data.user);

                    if (isUnregisteredSso) {
                      logger.info("[LoginScreen] Unregistered SSO → Onboarding screen 18");
                      const oauthData = {
                        email: pd?.email ?? undefined,
                        firstName: pd?.firstName ?? pd?.first_name ?? undefined,
                        lastName: pd?.lastName ?? pd?.last_name ?? undefined,
                        picture: pd?.picture ?? undefined,
                        providerData: pd,
                        needsPhoneVerification: true,
                      };
                      if (typeof (navigation as any).reset === "function") {
                        (navigation as any).reset({
                          index: 0,
                          routes: [{ name: "Onboarding", params: { oauthData } }],
                        });
                      } else {
                        navigation.replace("Onboarding", { oauthData });
                      }
                      return;
                    }
                    if (data.needsOnboarding && data.oauthData) {
                      logger.info("[LoginScreen] SSO needs onboarding - full Onboarding flow");
                      navigation.replace("Onboarding", { oauthData: data.oauthData });
                      return;
                    }
                    if (data.user) {
                      logger.debug("[LoginScreen] User has required fields, checking availability");
                      
                      try {
                        const { availabilityApi } = await import("../../services/api/availabilityApi");
                        const response = await availabilityApi.getUserAvailability();
                        
                        // If no availability set, show availability onboarding
                        if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
                          logger.info("[LoginScreen] No availability found, navigating to AvailabilityOnboarding");
                          navigation.replace("AvailabilityOnboarding", { user: data.user });
                        } else {
                          logger.info("[LoginScreen] Availability exists, navigating to Home");
                          navigation.replace("Home");
                        }
                      } catch (error) {
                        logger.error("[LoginScreen] Error checking availability", error);
                        // On error, just go to home
                        navigation.replace("Home");
                      }
                    } else {
                      // Fallback - go to home
                      logger.debug("[LoginScreen] No user data, navigating to Home");
                      navigation.replace("Home");
                    }
                  }}
                />
              </View>
            ) : (
              <View style={{ alignItems: "center", marginTop: 16 }}>
                <Text style={[styles.subtitle, { marginBottom: 24 }]}>
                  Tap the link in your SMS to sign in.
                </Text>
                {error ? (
                  <Text style={[styles.subtitle, { color: "#EF4444", marginBottom: 16 }]}>
                    {error}
                  </Text>
                ) : null}
                {devWebFallback ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(devWebFallback)}
                    style={[styles.nextButton, { marginBottom: 16, height: 48 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.nextButtonText}>Open sign-in link (dev)</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={handleResendMagicLink}
                  disabled={resendTimer > 0 || loading}
                  style={{ paddingVertical: 8 }}
                >
                  <Text
                    style={[
                      styles.subtitle,
                      {
                        color: resendTimer > 0 ? "#9CA3AF" : "#16A34A",
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend link"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Bottom Section - Ad container (Figma) + fixed at bottom */}
        <View
          style={[
            styles.bottomSection,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
        >
          <AdContainerPlaceholder />
          {currentStep === "magicLinkSent" && (
            <TouchableOpacity
              style={[styles.nextButton, styles.nextButtonDisabled]}
              disabled
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Waiting...</Text>
            </TouchableOpacity>
          )}


        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 56,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  animatedContent: {
    paddingTop: 16,
  },
  phoneStepColumn: {
    gap: 16,
  },
  nextButtonInContent: {
    marginTop: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 32,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
    backgroundColor: "#FFFFFF",
  },
  nextButton: {
    height: 54,
    backgroundColor: "#16A34A",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  nextButtonDisabled: {
    backgroundColor: "#16A34A",
    opacity: 0.5,
  },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerWrapInColumn: {
    marginVertical: 0,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
    color: "#6B7280",
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16A34A",
  },
  connectionHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
});
