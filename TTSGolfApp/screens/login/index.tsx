/**
 * Login Screen - iOS Keyboard Fixed Implementation
 * Keyboard overlays on top without pushing content
 * Supports: phone magic link, username+password sign in, username+password sign up, OAuth
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  Linking,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
import {
  loginWithUsernamePassword,
  registerWithUsernamePassword,
} from "../../services/api/authApi";
import { availabilityApi } from "../../services/api/availabilityApi";

type AuthMode = "phone" | "usernameSignIn" | "usernameSignUp";

interface Props {
  navigation: any;
}

async function navigateAfterAuth(navigation: any) {
  try {
    const response = await availabilityApi.getUserAvailability();
    if (
      !response.data ||
      (Array.isArray(response.data) && response.data.length === 0)
    ) {
      navigation.replace("AvailabilityOnboarding", {});
    } else {
      navigation.replace("Home");
    }
  } catch {
    navigation.replace("Home");
  }
}

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [authMode, setAuthMode] = useState<AuthMode>("phone");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

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

  const handleBackWithAuthMode = useCallback(() => {
    if (authMode !== "phone") {
      setAuthMode("phone");
      setUsernameError("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
    } else {
      handleBack();
    }
  }, [authMode, handleBack]);

  const handleUsernameSignIn = useCallback(async () => {
    const u = username.trim();
    if (!u || u.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      return;
    }
    if (!password) {
      setUsernameError("Password is required.");
      return;
    }
    setUsernameLoading(true);
    setUsernameError("");
    const result = await loginWithUsernamePassword(u, password);
    setUsernameLoading(false);
    if (result.success) {
      navigateAfterAuth(navigation);
    } else {
      setUsernameError(result.error);
    }
  }, [username, password, navigation]);

  const handleUsernameSignUp = useCallback(async () => {
    const u = username.trim();
    if (!u || u.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      return;
    }
    if (!password) {
      setUsernameError("Password is required.");
      return;
    }
    if (password !== confirmPassword) {
      setUsernameError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setUsernameError(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character."
      );
      return;
    }
    setUsernameLoading(true);
    setUsernameError("");
    const result = await registerWithUsernamePassword({
      username: u,
      password,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
    });
    setUsernameLoading(false);
    if (result.success) {
      navigateAfterAuth(navigation);
    } else {
      setUsernameError(result.error);
    }
  }, [username, password, confirmPassword, firstName, lastName, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <StatusBar style="dark" />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackWithAuthMode}>
              <ArrowLeft size={24} color="#111827" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.mainContent}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
          <Animated.View
            style={[
              styles.animatedContent,
              { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
            ]}
          >
            {authMode === "usernameSignIn" || authMode === "usernameSignUp" ? (
              <>
                <Text style={styles.title}>
                  {authMode === "usernameSignUp" ? "Create account" : "Sign in"}
                </Text>
                <Text style={styles.subtitle}>
                  {authMode === "usernameSignUp"
                    ? "Choose a username and password."
                    : "Sign in with your username and password."}
                </Text>
                <View style={styles.phoneStepColumn}>
                  <TextInput
                    style={[styles.textInput, usernameError ? styles.textInputError : null]}
                    placeholder="Username"
                    placeholderTextColor="#9CA3AF"
                    value={username}
                    onChangeText={(t) => {
                      setUsername(t);
                      setUsernameError("");
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!usernameLoading}
                  />
                  <TextInput
                    style={[styles.textInput, usernameError ? styles.textInputError : null]}
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setUsernameError("");
                    }}
                    secureTextEntry
                    editable={!usernameLoading}
                  />
                  {authMode === "usernameSignUp" && (
                    <>
                      <TextInput
                        style={[styles.textInput, usernameError ? styles.textInputError : null]}
                        placeholder="Confirm password"
                        placeholderTextColor="#9CA3AF"
                        value={confirmPassword}
                        onChangeText={(t) => {
                          setConfirmPassword(t);
                          setUsernameError("");
                        }}
                        secureTextEntry
                        editable={!usernameLoading}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="First name (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={firstName}
                        onChangeText={setFirstName}
                        editable={!usernameLoading}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Last name (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={lastName}
                        onChangeText={setLastName}
                        editable={!usernameLoading}
                      />
                    </>
                  )}
                  {usernameError ? (
                    <Text style={styles.errorText}>{usernameError}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={[
                      styles.nextButton,
                      styles.nextButtonInContent,
                      usernameLoading && styles.nextButtonDisabled,
                    ]}
                    onPress={
                      authMode === "usernameSignUp"
                        ? handleUsernameSignUp
                        : handleUsernameSignIn
                    }
                    disabled={usernameLoading}
                    activeOpacity={0.8}
                  >
                    {usernameLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.nextButtonText}>
                        {authMode === "usernameSignUp" ? "Sign up" : "Sign in"}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setAuthMode(authMode === "usernameSignUp" ? "usernameSignIn" : "usernameSignUp");
                      setUsernameError("");
                      setConfirmPassword("");
                    }}
                    style={styles.signupContainer}
                  >
                    <Text style={styles.signupText}>
                      {authMode === "usernameSignUp"
                        ? "Already have an account? "
                        : "Don't have an account? "}
                    </Text>
                    <Text style={styles.signupLink}>
                      {authMode === "usernameSignUp" ? "Sign in" : "Create account"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : currentStep === "phone" ? (
              <>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>
                  Sign in with your phone number, Google, Apple, or username.
                </Text>
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
                  onError={(message) => setError(message)}
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
                <TouchableOpacity
                  onPress={() => setAuthMode("usernameSignIn")}
                  style={[styles.signupContainer, { marginTop: 8 }]}
                >
                  <Text style={styles.signupText}>Sign in with username</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAuthMode("usernameSignUp")}
                  style={styles.signupContainer}
                >
                  <Text style={styles.signupText}>Don't have an account? </Text>
                  <Text style={styles.signupLink}>Create account</Text>
                </TouchableOpacity>
              </View>
              </>
            ) : (
              <View style={{ alignItems: "center", marginTop: 16 }}>
                <Text style={styles.title}>Check your phone</Text>
                <Text style={[styles.subtitle, { marginBottom: 24 }]}>
                  Tap the sign-in link we sent to {maskPhoneDisplay(fullPhoneNumber)} to sign in.
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
          </ScrollView>

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
    </KeyboardAvoidingView>
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
  textInput: {
    height: 54,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  textInputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: -4,
  },
});
