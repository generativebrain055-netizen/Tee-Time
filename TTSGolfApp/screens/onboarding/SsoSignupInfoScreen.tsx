import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { PhoneInput } from "../login/components";
import { LOGIN_COLORS } from "../login/constants";
import { API_URL } from "../../config/api";
import { sessionManager } from "../../services/sessionManager";
// Phone normalization helper
const normalizePhoneToE164 = (phoneNumber: string, countryCode: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, "");
  return `${countryCode}${cleaned}`;
};
import CountryPicker, { Country, COUNTRIES } from "../../components/CountryPicker";

// Colors - consistent with LoginScreen
const COLORS = {
  primary: "#5DB075",
  white: "#FFFFFF",
  black: "#000000",
  textMain: "#1A1A1A",
  textSub: "#6B7280",
  textPlaceholder: "#9CA3AF",
  border: "#E5E7EB",
  surface: "#F9FAFB",
  error: "#EF4444",
  errorLight: "#FEE2E2",
};

interface Props {
  navigation: any;
  route: {
    params: {
      tempToken: string;
      oauthData?: {
        email?: string;
        firstName?: string;
        lastName?: string;
      };
    };
  };
}

export function SsoSignupInfoScreen({ navigation, route }: Props): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { tempToken, oauthData } = route.params;

  const [firstName, setFirstName] = useState<string>(oauthData?.firstName || "");
  const [lastName, setLastName] = useState<string>(oauthData?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
  }>({});

  const isValid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    phoneNumber.length >= 10;

  const handleSubmit = async (): Promise<void> => {
    if (!isValid || submitting) return;

    Keyboard.dismiss();
    setSubmitting(true);
    setErrors({});

    try {
      // Normalize phone number
      const normalizedPhone = normalizePhoneToE164(phoneNumber, selectedCountry.dialCode);

      const response = await fetch(`${API_URL}/auth/oauth/sso-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tempToken,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: normalizedPhone,
          email: oauthData?.email || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle uniqueness errors
        if (response.status === 409) {
          if (data.field === "phoneNumber") {
            setErrors({ phoneNumber: data.error || "This phone number is already in use" });
            return;
          } else if (data.field === "email") {
            setErrors({ email: data.error || "This email is already in use" });
            return;
          }
        }
        throw new Error(data.error || "Sign-up failed");
      }

      // Save session
      await sessionManager.saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });

      // Navigate to Home (no additional onboarding for SSO sign-up)
      navigation.replace("Home");
    } catch (error) {
      console.error("SSO sign-up error:", error);
      Alert.alert(
        "Sign-Up Failed",
        error instanceof Error ? error.message : "Unable to complete sign-up. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.title}>Complete Your Sign-Up</Text>
              <Text style={styles.subtitle}>
                We need a few details to create your account
              </Text>

              {/* Form */}
              <View style={styles.formArea}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>First name</Text>
                  <TextInput
                    style={[styles.input, errors.firstName && styles.inputError]}
                    placeholder="Enter first name"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                  {errors.firstName && (
                    <Text style={styles.errorText}>{errors.firstName}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Last name</Text>
                  <TextInput
                    style={[styles.input, errors.lastName && styles.inputError]}
                    placeholder="Enter last name"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                  {errors.lastName && (
                    <Text style={styles.errorText}>{errors.lastName}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone number</Text>
                  <PhoneInput
                    value={phoneNumber}
                    onChange={(text) => {
                      setPhoneNumber(text);
                      if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: undefined });
                    }}
                    selectedCountry={selectedCountry}
                    onCountryChange={setSelectedCountry}
                    inputRef={React.createRef()}
                    focused={false}
                    onFocus={() => {}}
                    onBlur={() => {}}
                    hasError={!!errors.phoneNumber}
                    onClear={() => setPhoneNumber("")}
                    errorMessage={errors.phoneNumber}
                  />
                </View>
              </View>
            </View>

            {/* Bottom Section */}
            <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[styles.nextButton, (!isValid || submitting) && styles.nextButtonDisabled]}
                onPress={handleSubmit}
                disabled={!isValid || submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>
                  {submitting ? "Creating Account..." : "Continue"}
                </Text>
              </TouchableOpacity>
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
    marginBottom: 32,
  },
  formArea: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textMain,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textMain,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 4,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  nextButton: {
    height: 54,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
});
