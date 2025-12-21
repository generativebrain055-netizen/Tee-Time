import React, { useState, useEffect, useRef, useCallback } from "react";
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
  StyleSheet,
  TextInput as RNTextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, X } from "lucide-react-native";
import { StackNavigationProp } from "@react-navigation/stack";

// Hooks
import { useAuth } from "../hooks";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
  Home: { user: any };
  HomePage: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, "Login">;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

type LoginStep = "phone" | "otp";

// Colors
const COLORS = {
  primary: "#5DB075",
  primaryLight: "#E8F5E9",
  white: "#FFFFFF",
  black: "#000000",
  textMain: "#1A1A1A",
  textSub: "#6B7280",
  textPlaceholder: "#9CA3AF",
  border: "#E5E7EB",
  error: "#EF4444",
  errorLight: "#FEF2F2",
  errorBorder: "#FECACA",
  surface: "#F9FAFB",
};

export default function LoginScreen({ navigation }: LoginScreenProps): React.ReactElement {
  const insets = useSafeAreaInsets();

  // State
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [otpCode, setOtpCode] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<LoginStep>("phone");
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [inputFocused, setInputFocused] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Refs
  const phoneInputRef = useRef<RNTextInput>(null);
  const otpInputRefs = useRef<(RNTextInput | null)[]>([]);

  // Auth hook
  const { requestOtp, verifyOtp, loading, error, status, clearMessages } = useAuth();

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Derived values
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const e164Phone = `+1${digitsOnly}`;
  const isPhoneValid = digitsOnly.length >= 10;
  const isOtpValid = otpCode.length === 6;

  // Format phone number for display
  const formatPhoneDisplay = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 0) return "";
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  // Resend timer effect
  useEffect(() => {
    if (!resendTimer) return;
    const timerId = setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timerId);
  }, [resendTimer]);

  // Clear error when typing
  useEffect(() => {
    if (phoneNumber || otpCode) {
      setHasError(false);
    }
  }, [phoneNumber, otpCode]);

  // Animate step transitions
  const animateStepChange = useCallback((callback: () => void): void => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  // Handlers
  const handleRequestOtp = async (isResend = false): Promise<void> => {
    if (!isPhoneValid || loading) {
      setHasError(true);
      return;
    }

    const result = await requestOtp(e164Phone, "login");
    if (result.success) {
      if (!isResend) {
        animateStepChange(() => setCurrentStep("otp"));
      }
      setOtpCode("");
      setResendTimer(result.resendAfterSeconds || 30);
    } else {
      setHasError(true);
    }
  };

  const handleVerifyOtp = async (): Promise<void> => {
    if (!isOtpValid || loading) return;

    const result = await verifyOtp(e164Phone, otpCode.trim());
    if (result.success) {
      setTimeout(() => {
        navigation?.navigate("Home", { user: result.user });
      }, 500);
    } else {
      setHasError(true);
    }
  };

  const handlePrimaryAction = (): void => {
    Keyboard.dismiss();
    if (currentStep === "phone") handleRequestOtp();
    else if (currentStep === "otp") handleVerifyOtp();
  };

  const handleResendOtp = (): void => {
    if (resendTimer > 0 || loading) return;
    handleRequestOtp(true);
  };

  const handleBack = (): void => {
    if (currentStep === "otp") {
      animateStepChange(() => {
        setCurrentStep("phone");
        clearMessages();
        setOtpCode("");
        setHasError(false);
      });
    } else {
      navigation.goBack();
    }
  };

  const clearPhoneInput = (): void => {
    setPhoneNumber("");
    setHasError(false);
    phoneInputRef.current?.focus();
  };

  // OTP input handler
  const handleOtpChange = (text: string, index: number): void => {
    const newOtp = otpCode.split("");
    newOtp[index] = text;
    const newOtpString = newOtp.join("").slice(0, 6);
    setOtpCode(newOtpString);

    // Auto-focus next input
    if (text && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number): void => {
    if (key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const isButtonDisabled = loading || (currentStep === "phone" ? !isPhoneValid : !isOtpValid);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <Animated.View
              style={[
                styles.mainContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              {/* Title */}
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>
                {currentStep === "phone"
                  ? "Already created an account? Sign in here."
                  : `Enter the code sent to ${formatPhoneDisplay(phoneNumber)}`}
              </Text>

              {/* Phone Input */}
              {currentStep === "phone" && (
                <View style={styles.inputSection}>
                  <View
                    style={[
                      styles.phoneInputContainer,
                      inputFocused && styles.phoneInputContainerFocused,
                      hasError && styles.phoneInputContainerError,
                    ]}
                  >
                    <RNTextInput
                      ref={phoneInputRef}
                      style={[
                        styles.phoneInput,
                        hasError && styles.phoneInputError,
                      ]}
                      placeholder="(555) 123-4567"
                      placeholderTextColor={COLORS.textPlaceholder}
                      keyboardType="phone-pad"
                      value={formatPhoneDisplay(phoneNumber)}
                      onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, ""))}
                      maxLength={14}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                    />
                    {phoneNumber.length > 0 && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearPhoneInput}
                      >
                        <View style={styles.clearButtonInner}>
                          <X size={12} color={COLORS.textSub} strokeWidth={2} />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                  {hasError && (
                    <Text style={styles.errorText}>Please enter a valid phone number</Text>
                  )}
                </View>
              )}

              {/* OTP Input */}
              {currentStep === "otp" && (
                <View style={styles.inputSection}>
                  <View style={styles.otpContainer}>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <View
                        key={index}
                        style={[
                          styles.otpBox,
                          otpCode[index] && styles.otpBoxFilled,
                          hasError && styles.otpBoxError,
                        ]}
                      >
                        <RNTextInput
                          ref={(ref) => (otpInputRefs.current[index] = ref)}
                          style={[
                            styles.otpInput,
                            hasError && styles.otpInputError,
                          ]}
                          keyboardType="number-pad"
                          maxLength={1}
                          value={otpCode[index] || ""}
                          onChangeText={(text) => handleOtpChange(text, index)}
                          onKeyPress={({ nativeEvent }) =>
                            handleOtpKeyPress(nativeEvent.key, index)
                          }
                          autoFocus={index === 0}
                        />
                      </View>
                    ))}
                  </View>
                  {hasError && error && (
                    <Text style={styles.errorText}>{error}</Text>
                  )}

                  {/* Resend */}
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendOtp}
                    disabled={resendTimer > 0 || loading}
                  >
                    <Text
                      style={[
                        styles.resendText,
                        (resendTimer > 0 || loading) && styles.resendTextDisabled,
                      ]}
                    >
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              {/* Next Button */}
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
                  {currentStep === "otp" ? "Verify" : "Next"}
                </Text>
              </TouchableOpacity>

              {/* Sign Up Link */}
              {currentStep === "phone" && (
                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Onboarding")}>
                    <Text style={styles.signupLink}>Sign up</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    height: 56,
    justifyContent: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  mainContent: {
    flex: 1,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSub,
    lineHeight: 22,
    marginBottom: 40,
  },
  inputSection: {
    width: "100%",
  },
  // Phone Input
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  phoneInputContainerFocused: {
    borderColor: COLORS.textMain,
    borderWidth: 1.5,
  },
  phoneInputContainerError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  phoneInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: COLORS.textMain,
    fontWeight: "400",
  },
  phoneInputError: {
    color: COLORS.error,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 8,
    marginLeft: 4,
  },
  // OTP Input
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  otpBoxError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  otpInput: {
    width: "100%",
    height: "100%",
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.textMain,
    textAlign: "center",
  },
  otpInputError: {
    color: COLORS.error,
  },
  resendButton: {
    alignSelf: "center",
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
  },
  resendTextDisabled: {
    color: COLORS.textSub,
  },
  // Bottom Section
  bottomSection: {
    paddingBottom: 32,
  },
  nextButton: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
    color: COLORS.textSub,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
});
