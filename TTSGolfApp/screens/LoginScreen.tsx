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
  ViewStyle,
  TextStyle,
  TextInput as RNTextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";

// Theme & Constants
import {
  colors,
  spacing,
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
import type { CountryCode } from "../types";

// Shared Components
import {
  PrimaryButton,
  OTPInput,
  CountryCodeModal,
  IconContainer,
  LogoBox,
} from "../components";

// Hooks
import { useAuth, useFadeIn, useSlideIn } from "../hooks";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
  Home: { user: any };
  HomePage: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Login"
>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

type LoginStep = "phone" | "otp";

interface StepContent {
  icon: string;
  title: string;
  subtitle: string;
}

interface LocalStyles {
  container: ViewStyle;
  phoneInputWrapper: ViewStyle;
  phoneInputRow: ViewStyle;
  countryCodeButton: ViewStyle;
  flagText: TextStyle;
  countryCodeText: TextStyle;
  phoneInput: TextStyle;
}

export default function LoginScreen({
  navigation,
}: LoginScreenProps): React.ReactElement {
  // State
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    COUNTRY_CODES.find((c) => c.country === "United States") || COUNTRY_CODES[0]
  );
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<LoginStep>("phone");
  const [resendTimer, setResendTimer] = useState<number>(0);

  // Auth hook
  const { requestOtp, verifyOtp, loading, error, status, clearMessages } =
    useAuth();

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

  const primaryDisabled =
    loading || (currentStep === "phone" ? !isPhoneValid : !isOtpValid);

  // Resend timer effect
  useEffect(() => {
    if (!resendTimer) return;
    const timerId = setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timerId);
  }, [resendTimer]);

  // Animate step transitions
  const animateStepChange = (callback: () => void): void => {
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
  const handleRequestOtp = async (isResend = false): Promise<void> => {
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

  const handleVerifyOtp = async (): Promise<void> => {
    if (!isOtpValid || loading) return;

    const result = await verifyOtp(e164Phone, otpCode.trim());
    if (result.success) {
      setTimeout(() => {
        navigation?.navigate("Home", { user: result.user });
      }, 500);
    }
  };

  const handlePrimaryAction = (): void => {
    if (currentStep === "phone") handleRequestOtp();
    else if (currentStep === "otp") handleVerifyOtp();
  };

  const handleResendOtp = (): void => {
    if (resendTimer > 0 || loading) return;
    handleRequestOtp(true);
  };

  const switchToPhone = (): void => {
    animateStepChange(() => {
      setCurrentStep("phone");
      clearMessages();
      setOtpCode("");
    });
  };

  // Get dynamic content based on step
  const getStepContent = (): StepContent => {
    if (currentStep === "otp") {
      return {
        icon: "keypad",
        title: "Verify Your Number",
        subtitle: `Enter the code sent to ${e164Phone}`,
      };
    }
    return {
      icon: "call",
      title: "Welcome Back!",
      subtitle: "Enter your phone number to login",
    };
  };

  const stepContent = getStepContent();

  return (
    <LinearGradient
      colors={gradients.primary as any}
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
                      <RNTextInput
                        style={styles.phoneInput}
                        placeholder="3051234567"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={(text: string) =>
                          setPhoneNumber(text.replace(/\D/g, ""))
                        }
                        maxLength={12}
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

                {/* Continue Button */}
                <PrimaryButton
                  title={currentStep === "otp" ? "Verify & Login" : "Continue"}
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

                {/* Change Phone Number */}
                {currentStep === "otp" && (
                  <TouchableOpacity
                    style={styles.switchButton}
                    onPress={switchToPhone}
                  >
                    <Text style={styles.switchText}>Change Phone Number</Text>
                  </TouchableOpacity>
                )}

                {/* Signup Link */}
                {currentStep === "phone" && (
                  <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>
                      Don't have an account?{" "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Onboarding")}
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
const localStyles: LocalStyles = {
  container: {
    flex: 1,
  },
  phoneInputWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  phoneInputRow: {
    flexDirection: "row",
    width: "100%",
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  countryCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: colors.primaryLight,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceDark,
    gap: 6,
  },
  flagText: {
    fontSize: 22,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: "transparent",
  },
};

// Merge all styles
const styles: Record<string, any> = {
  ...localStyles,
  ...headerStyles,
  ...cardStyles,
  ...formStyles,
  ...buttonStyles,
  ...messageStyles,
  ...linkStyles,
  ...footerStyles,
};
