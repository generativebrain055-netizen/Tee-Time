import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// Theme & Constants
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
  gradients,
  headerStyles,
  cardStyles,
  buttonStyles,
  messageStyles,
  linkStyles,
  footerStyles,
  formStyles,
} from "../theme";
import { COUNTRY_CODES } from "../constants/countryCodes";

// Shared Components
import {
  PrimaryButton,
  TextInput as StyledTextInput,
  OTPInput,
  CountryCodeModal,
  IconContainer,
  LogoBox,
} from "../components";

// Hooks
import { useAuth, useFadeIn, useSlideIn } from "../hooks";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginScreen({ navigation }) {
  // State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRY_CODES.find((c) => c.country === "United States") || COUNTRY_CODES[0]
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [currentStep, setCurrentStep] = useState("phone"); // phone | otp | username
  const [resendTimer, setResendTimer] = useState(0);

  // Auth hook
  const {
    requestOtp,
    verifyOtp,
    loginWithCredentials,
    loading,
    error,
    status,
    clearMessages,
  } = useAuth();

  // Animations
  const headerOpacity = useFadeIn(0);
  const { translateAnim: cardTranslateY } = useSlideIn("bottom", 300);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Derived values
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const e164Phone = `${selectedCountry.code}${digitsOnly}`;
  const isPhoneValid = digitsOnly.length >= 8;
  const otpDigitsOnly = otpCode.replace(/\D/g, "");
  const isOtpValid = otpDigitsOnly.length === 6;
  const isPasswordValid = password.length >= 6;
  const isUsernameValid = username.trim().length >= 3;

  const primaryDisabled =
    loading ||
    (currentStep === "phone"
      ? !isPhoneValid
      : currentStep === "otp"
      ? !isOtpValid
      : !isUsernameValid || !isPasswordValid);

  // Resend timer effect
  useEffect(() => {
    if (!resendTimer) return;
    const timerId = setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timerId);
  }, [resendTimer]);

  // Animate step transitions
  const animateStepChange = (callback) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(callback, 150);
  };

  // Handlers
  const handleRequestOtp = async (isResend = false) => {
    if (!isPhoneValid || loading) return;

    // Pass 'login' purpose for existing users only
    const result = await requestOtp(e164Phone, "login");
    if (result.success) {
      if (!isResend) {
        animateStepChange(() => setCurrentStep("otp"));
      }
      setOtpCode("");
      setResendTimer(result.resendAfterSeconds || 30);
    }
  };

  const handleVerifyOtp = async () => {
    if (!isOtpValid || loading) return;

    const result = await verifyOtp(e164Phone, otpCode.trim());
    if (result.success) {
      setTimeout(() => {
        navigation?.navigate("Home", { user: result.user });
      }, 500);
    }
  };

  const handleLoginWithUsername = async () => {
    if (!isUsernameValid || !isPasswordValid || loading) return;

    const result = await loginWithCredentials(
      username.trim().toLowerCase(),
      password
    );
    if (result.success) {
      setTimeout(() => {
        navigation?.navigate("Home", { user: result.user });
      }, 500);
    }
  };

  const handlePrimaryAction = () => {
    if (currentStep === "phone") handleRequestOtp();
    else if (currentStep === "otp") handleVerifyOtp();
    else if (currentStep === "username") handleLoginWithUsername();
  };

  const handleResendOtp = () => {
    if (resendTimer > 0 || loading) return;
    handleRequestOtp(true);
  };

  const switchToUsername = () => {
    animateStepChange(() => {
      setCurrentStep("username");
      clearMessages();
    });
  };

  const switchToPhone = () => {
    animateStepChange(() => {
      setCurrentStep("phone");
      clearMessages();
      setOtpCode("");
    });
  };

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6)
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
      6,
      10
    )}`;
  };

  // Get dynamic content based on step
  const getStepContent = () => {
    switch (currentStep) {
      case "otp":
        return {
          icon: "keypad",
          title: "Verify Your Number",
          subtitle: `Enter the code sent to ${e164Phone}`,
        };
      case "username":
        return {
          icon: "person",
          title: "Login with Username",
          subtitle: "Enter your credentials to login",
        };
      default:
        return {
          icon: "call",
          title: "Enter Your Phone Number",
          subtitle: "We'll send you a verification code",
        };
    }
  };

  const stepContent = getStepContent();

  return (
    <LinearGradient
      colors={gradients.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar style="light" />

      {/* Header */}
      <Animated.View
        style={[styles.headerGradient, { opacity: headerOpacity }]}
      >
        <SafeAreaView style={styles.headerContent}>
          <LogoBox
            source={require("../assets/striplogo.png")}
            width={160}
            height={90}
            imageWidth={140}
            imageHeight={70}
          />
          <Text style={styles.appName}>Tee Time Social</Text>
          <Text style={styles.tagline}>Golf scheduling made simple</Text>
        </SafeAreaView>
      </Animated.View>

      {/* Card */}
      <Animated.View
        style={[
          styles.cardContainer,
          { transform: [{ translateY: cardTranslateY }] },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.cardWrapper}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.card}>
              <Animated.View
                style={[styles.cardContent, { opacity: fadeAnim }]}
              >
                {/* Icon */}
                <IconContainer icon={stepContent.icon} />

                {/* Title */}
                <Text style={styles.cardTitle}>{stepContent.title}</Text>
                <Text style={styles.cardSubtitle}>{stepContent.subtitle}</Text>

                {/* Phone Input with Country Code */}
                {currentStep === "phone" && (
                  <View style={styles.phoneInputWrapper}>
                    <View style={styles.phoneInputRow}>
                      <TouchableOpacity
                        style={styles.countryCodeButton}
                        onPress={() => setModalVisible(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.flagText}>
                          {selectedCountry.flag}
                        </Text>
                        <Text style={styles.countryCodeText}>
                          {selectedCountry.code}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={14}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <StyledTextInput
                        placeholder="3051234567"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={(text) =>
                          setPhoneNumber(text.replace(/\D/g, ""))
                        }
                        maxLength={12}
                        containerStyle={styles.phoneInputField}
                      />
                    </View>
                  </View>
                )}

                {/* OTP Input */}
                {currentStep === "otp" && (
                  <>
                    <OTPInput
                      value={otpCode}
                      onChangeText={setOtpCode}
                      length={6}
                    />
                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={handleResendOtp}
                      disabled={resendTimer > 0 || loading}
                    >
                      <Text
                        style={[
                          styles.resendText,
                          (resendTimer > 0 || loading) &&
                            styles.resendTextDisabled,
                        ]}
                      >
                        {resendTimer > 0
                          ? `Resend in ${resendTimer}s`
                          : "Resend Code"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Username/Password Inputs */}
                {currentStep === "username" && (
                  <>
                    <StyledTextInput
                      placeholder="Username"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <View style={styles.inputSpacer} />
                    <StyledTextInput
                      placeholder="Password"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                  </>
                )}

                {/* Continue Button */}
                <PrimaryButton
                  title={currentStep === "otp" ? "Verify" : "Continue"}
                  onPress={handlePrimaryAction}
                  disabled={primaryDisabled}
                  loading={loading}
                  icon="arrow-forward"
                  style={styles.continueButton}
                />

                {/* Messages */}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {status ? (
                  <Text style={styles.statusText}>{status}</Text>
                ) : null}

                {/* Terms */}
                <Text style={styles.termsText}>
                  By continuing, you agree to our{" "}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {"\n"}and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>

                {/* Switch Login Method */}
                {currentStep === "phone" && (
                  <TouchableOpacity
                    style={styles.switchButton}
                    onPress={switchToUsername}
                  >
                    <Text style={styles.switchText}>
                      Login with Username instead
                    </Text>
                  </TouchableOpacity>
                )}
                {currentStep === "username" && (
                  <TouchableOpacity
                    style={styles.switchButton}
                    onPress={switchToPhone}
                  >
                    <Text style={styles.switchText}>
                      Login with Phone instead
                    </Text>
                  </TouchableOpacity>
                )}
                {currentStep === "otp" && (
                  <TouchableOpacity
                    style={styles.switchButton}
                    onPress={switchToPhone}
                  >
                    <Text style={styles.switchText}>Change Phone Number</Text>
                  </TouchableOpacity>
                )}

                {/* Signup Link */}
                {currentStep !== "otp" && (
                  <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>
                      Don't have an account?{" "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Signup")}
                    >
                      <Text style={styles.signupLink}>Sign Up</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2025 Tee Time Social. All rights reserved.
        </Text>
      </View>

      {/* Country Code Modal */}
      <CountryCodeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={setSelectedCountry}
        selectedCountry={selectedCountry}
      />
    </LinearGradient>
  );
}

// Local styles that extend shared styles
const styles = {
  container: {
    flex: 1,
  },
  // Use shared header styles
  ...headerStyles,
  // Use shared card styles
  ...cardStyles,
  // Use shared form styles
  ...formStyles,
  // Use shared button styles
  ...buttonStyles,
  // Use shared message styles
  ...messageStyles,
  // Use shared link styles
  ...linkStyles,
  // Use shared footer styles
  ...footerStyles,
  // Phone input styles
  phoneInputWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  phoneInputRow: {
    flexDirection: "row",
    width: SCREEN_WIDTH * 0.75,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  countryCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: colors.primaryLight,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceDark,
    gap: 4,
  },
  flagText: {
    fontSize: 20,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  phoneInputField: {
    flex: 1,
    marginBottom: 0,
  },
};
