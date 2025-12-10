import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// Theme & Constants
import {
  colors,
  spacing,
  gradients,
  headerStyles,
  cardStyles,
  formStyles,
  buttonStyles,
  linkStyles,
  footerStyles,
  phoneInputStyles,
  otpStyles,
} from "../theme";
import { COUNTRY_CODES, getDefaultCountry } from "../constants/countryCodes";

// Shared Components
import {
  PrimaryButton,
  TextInput as StyledTextInput,
  OTPInput,
  CountryCodeModal,
  LogoBox,
} from "../components";

// Hooks
import { useAuth, useFadeIn, useSlideIn } from "../hooks";

export default function SignupScreen({ navigation }) {
  // State
  const [step, setStep] = useState(1); // 1: Basic Info, 2: OTP Verification
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phoneNumber: "",
    handicap: "",
    password: "",
  });
  const [selectedCountry, setSelectedCountry] = useState(getDefaultCountry());
  const [modalVisible, setModalVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  // Auth hook
  const { requestOtp, registerUser, loading, error, status, clearMessages } =
    useAuth();

  // Animations
  const headerOpacity = useFadeIn(0);
  const { translateAnim: cardTranslateY } = useSlideIn("bottom", 300);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Derived values - ensure phone number is digits only for E.164 format
  const phoneDigitsOnly = formData.phoneNumber.replace(/\D/g, "");
  const fullPhoneNumber = `${selectedCountry.code}${phoneDigitsOnly}`;

  // OTP Timer effect
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Step transition animation
  const animateStepChange = (newStep) => {
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

    setTimeout(() => setStep(newStep), 150);
  };

  // Validation
  const validateStep1 = () => {
    if (!formData.firstName.trim()) {
      Alert.alert("Error", "Please enter your first name");
      return false;
    }
    if (!formData.lastName.trim()) {
      Alert.alert("Error", "Please enter your last name");
      return false;
    }
    if (!formData.username.trim() || formData.username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return false;
    }
    // Validate phone number using digits only
    if (phoneDigitsOnly.length < 8) {
      Alert.alert("Error", "Please enter a valid phone number");
      return false;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  // Handlers
  const handleContinue = async () => {
    if (step === 1) {
      if (!validateStep1()) return;

      const result = await requestOtp(fullPhoneNumber);
      if (result.success) {
        Alert.alert("Success", "OTP sent! Check your phone or console.");
        animateStepChange(2);
        setOtpTimer(60);
      } else {
        Alert.alert("Error", result.error || "Failed to send OTP");
      }
    } else if (step === 2) {
      if (otp.length !== 6) {
        Alert.alert("Error", "Please enter the 6-digit OTP");
        return;
      }

      const result = await registerUser(
        {
          phoneNumber: fullPhoneNumber,
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          handicap: formData.handicap,
          password: formData.password,
        },
        otp
      );

      if (result.success) {
        const userName =
          result.user?.firstName || formData.firstName || "there";
        Alert.alert(
          "Success",
          `Welcome ${userName}! Account created successfully.`
        );
        navigation?.navigate("Home", { user: result.user });
      } else {
        let errorMessage = "Invalid OTP";
        if (result.error) {
          if (result.error.includes("expired")) {
            errorMessage = "OTP has expired. Please request a new one.";
          } else if (
            result.error.includes("invalid") ||
            result.error.includes("Invalid")
          ) {
            errorMessage =
              "The OTP you entered is incorrect. Please try again.";
          } else if (result.error.includes("attempts")) {
            errorMessage =
              "Too many failed attempts. Please request a new OTP.";
          } else {
            errorMessage = result.error;
          }
        }
        Alert.alert("Verification Failed", errorMessage);
      }
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStepContent = () => {
    return step === 1
      ? {
          title: "Create Account",
          subtitle: "Enter your details to get started",
        }
      : {
          title: "Verify Number",
          subtitle: "Enter the code sent to your phone",
        };
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
          <Text style={styles.appName}>{stepContent.title}</Text>
          <Text style={styles.tagline}>{stepContent.subtitle}</Text>
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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.card}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <Animated.View style={{ opacity: fadeAnim }}>
                  {/* Step 1: Basic Information */}
                  {step === 1 && (
                    <View style={styles.form}>
                      <StyledTextInput
                        label="First Name *"
                        placeholder="John"
                        value={formData.firstName}
                        onChangeText={(text) =>
                          updateFormData("firstName", text)
                        }
                        autoCapitalize="words"
                      />

                      <View style={styles.inputSpacer} />

                      <StyledTextInput
                        label="Last Name *"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChangeText={(text) =>
                          updateFormData("lastName", text)
                        }
                        autoCapitalize="words"
                      />

                      <View style={styles.inputSpacer} />

                      <StyledTextInput
                        label="Username *"
                        placeholder="johndoe123"
                        value={formData.username}
                        onChangeText={(text) =>
                          updateFormData(
                            "username",
                            text.toLowerCase().replace(/\s/g, "")
                          )
                        }
                        autoCapitalize="none"
                      />

                      <View style={styles.inputSpacer} />

                      {/* Phone Input with Country Code */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number *</Text>
                        <View style={styles.phoneInputContainer}>
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
                            placeholder="234 567 8900"
                            value={formData.phoneNumber}
                            onChangeText={(text) =>
                              updateFormData("phoneNumber", text)
                            }
                            keyboardType="phone-pad"
                            containerStyle={styles.phoneInputField}
                          />
                        </View>
                      </View>

                      <View style={styles.inputSpacer} />

                      <StyledTextInput
                        label="Handicap (Optional)"
                        placeholder="e.g., 15"
                        value={formData.handicap}
                        onChangeText={(text) =>
                          updateFormData("handicap", text)
                        }
                        keyboardType="numeric"
                      />

                      <View style={styles.inputSpacer} />

                      <StyledTextInput
                        label="Password *"
                        placeholder="At least 6 characters"
                        value={formData.password}
                        onChangeText={(text) =>
                          updateFormData("password", text)
                        }
                        secureTextEntry
                      />
                    </View>
                  )}

                  {/* Step 2: OTP Verification */}
                  {step === 2 && (
                    <View style={styles.form}>
                      <Text style={styles.otpInfo}>
                        We've sent a 6-digit code to {formData.phoneNumber}
                      </Text>

                      {otpTimer > 0 && (
                        <View style={styles.timerContainer}>
                          <Ionicons
                            name="time-outline"
                            size={18}
                            color={colors.warning}
                          />
                          <Text style={styles.timerText}>
                            Code expires in: {otpTimer}s
                          </Text>
                        </View>
                      )}

                      {otpTimer === 0 && (
                        <View style={styles.expiredContainer}>
                          <Ionicons
                            name="warning-outline"
                            size={18}
                            color={colors.error}
                          />
                          <Text style={styles.expiredText}>
                            OTP expired. Please request a new one.
                          </Text>
                        </View>
                      )}

                      <OTPInput value={otp} onChangeText={setOtp} length={6} />

                      <TouchableOpacity
                        style={styles.resendButton}
                        onPress={() => animateStepChange(1)}
                      >
                        <Text style={styles.resendText}>
                          Change phone number
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Continue Button */}
                  <PrimaryButton
                    title={step === 1 ? "Send OTP" : "Verify & Continue"}
                    onPress={handleContinue}
                    disabled={loading}
                    loading={loading}
                    icon="arrow-forward"
                    style={styles.continueButton}
                  />

                  {/* Login Link */}
                  {step === 1 && (
                    <TouchableOpacity
                      style={styles.loginLink}
                      onPress={() => navigation?.navigate("Login")}
                    >
                      <Text style={styles.loginLinkText}>
                        Already have an account?{" "}
                        <Text style={styles.loginLinkBold}>Login</Text>
                      </Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </ScrollView>
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
  // Shared styles
  ...headerStyles,
  ...cardStyles,
  ...formStyles,
  ...buttonStyles,
  ...linkStyles,
  ...footerStyles,
  ...phoneInputStyles,
  ...otpStyles,
  // Signup-specific overrides
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
};
