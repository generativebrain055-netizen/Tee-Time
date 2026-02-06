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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";

import { useLoginFlow } from "./hooks/useLoginFlow";
import { PhoneInput } from "./components";
import { LOGIN_COLORS } from "./constants";
import { maskPhoneDisplay } from "../../utils/smsMagicLink";
import { OAuthButtons } from "../../components";

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
  } = useLoginFlow(navigation);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={LOGIN_COLORS.black} strokeWidth={1.5} />
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
            ) : (
              <View style={{ alignItems: "center", marginTop: 16 }}>
                <Text style={[styles.subtitle, { marginBottom: 24 }]}>
                  Tap the link in your SMS to sign in.
                </Text>
                {error ? (
                  <Text style={[styles.subtitle, { color: LOGIN_COLORS.error, marginBottom: 16 }]}>
                    {error}
                  </Text>
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
                        color: resendTimer > 0 ? LOGIN_COLORS.textSub : LOGIN_COLORS.primary,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend link"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStep === "phone" && (
              <OAuthButtons
                onSuccess={(data) => {
                  console.log(
                    "Login Screen - OAuth onSuccess received:",
                    JSON.stringify(data, null, 2),
                  );
                  if (data.needsOnboarding && data.oauthData) {
                    // User authenticated but needs to complete profile
                    console.log(
                      "Login Screen - Navigating to OAuthOnboarding with data:",
                      data.oauthData,
                    );
                    navigation.navigate("OAuthOnboarding", {
                      oauthData: data.oauthData,
                    });
                  } else if (data.isNewUser) {
                    // Legacy flow - new user needs full onboarding
                    console.log(
                      "Login Screen - Navigating to Onboarding with oauthData:",
                      data.partialData,
                    );
                    navigation.navigate("Onboarding", {
                      oauthData: data.partialData,
                    });
                    console.log("Login Screen - Navigation called");
                  } else {
                    // Existing user with complete profile
                    console.log(
                      "Login Screen - Existing user, navigating to Home",
                    );
                    navigation.replace("Home");
                  }
                }}
                onError={(error) => {
                  console.error("OAuth error:", error);
                }}
              />
            )}
          </Animated.View>
        </View>

        {/* Bottom Section - Fixed at bottom */}
        <View
          style={[
            styles.bottomSection,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.nextButton,
              isButtonDisabled && styles.nextButtonDisabled,
            ]}
            onPress={handlePrimaryAction}
            disabled={isButtonDisabled}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === "magicLinkSent" ? "Waiting..." : "Next"}
            </Text>
          </TouchableOpacity>

          {currentStep === "phone" && (
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Onboarding")}
              >
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LOGIN_COLORS.white,
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: LOGIN_COLORS.textMain,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: LOGIN_COLORS.textSub,
    lineHeight: 22,
    marginBottom: 40,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: LOGIN_COLORS.white,
  },
  nextButton: {
    height: 56,
    backgroundColor: LOGIN_COLORS.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: LOGIN_COLORS.primary,
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: LOGIN_COLORS.white,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
    color: LOGIN_COLORS.textSub,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "600",
    color: LOGIN_COLORS.primary,
  },
});
