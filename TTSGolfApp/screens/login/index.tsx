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
            <ArrowLeft size={24} color={LOGIN_COLORS.backArrow} strokeWidth={2} />
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
                  onSuccess={() => {
                    // Sign in with Google/Apple: always go to main screen (do not go to sign-up form)
                    navigation.replace("Home");
                  }}
                  onError={(error) => {
                    console.error("OAuth error:", error);
                  }}
                />
              </View>
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
          </Animated.View>
        </View>

        {/* Bottom Section - Fixed at bottom */}
        <View
          style={[
            styles.bottomSection,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
        >
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
  phoneStepColumn: {
    gap: 16,
  },
  nextButtonInContent: {
    marginTop: 0,
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
    marginBottom: 32,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
    backgroundColor: LOGIN_COLORS.white,
  },
  nextButton: {
    height: 54,
    backgroundColor: LOGIN_COLORS.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: LOGIN_COLORS.primary,
    opacity: 0.6,
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
    backgroundColor: LOGIN_COLORS.dividerLine,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: LOGIN_COLORS.dividerText,
    fontWeight: "500",
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
