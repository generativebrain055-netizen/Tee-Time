import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, X } from "lucide-react-native";
import CountryPicker, { Country, COUNTRIES } from "../../components/CountryPicker";
import { OAuthButtons } from "../../components/auth/OAuthButtons";
import type { OAuthSuccessData } from "../../types/oauth";

const COLORS = {
  primary: "#5EBC68",
  white: "#FFFFFF",
  black: "#000000",
  textMain: "#1A1A1A",
  textSub: "#6B7280",
  textPlaceholder: "#9CA3AF",
  border: "#E5E7EB",
  error: "#EF4444",
  errorLight: "#FEF2F2",
};

interface SignUpOptionsPageProps {
  onNext: (data: { phoneNumber: string }) => void;
  onBack: () => void;
  onOAuthSuccess: (data: OAuthSuccessData) => void;
}

export const SignUpOptionsPage: React.FC<SignUpOptionsPageProps> = ({
  onNext,
  onBack,
  onOAuthSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<RNTextInput>(null);

  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [hasError, setHasError] = useState(false);

  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const isValid = digitsOnly.length >= selectedCountry.minLength;
  const fullPhoneNumber = `${selectedCountry.dialCode}${digitsOnly}`;

  const handlePhoneNext = () => {
    if (!isValid) {
      setHasError(true);
      return;
    }
    Keyboard.dismiss();
    onNext({ phoneNumber: fullPhoneNumber });
  };

  const clearInput = () => {
    setPhoneNumber("");
    setHasError(false);
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
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>
                Sign up with Google, Apple, or your phone number to get started.
              </Text>

              {/* OAuth Buttons - Google first (green), Apple second (gray) */}
              <OAuthButtons
                layout="signup"
                onSuccess={onOAuthSuccess}
                onError={(err) => console.error("OAuth error:", err)}
              />

              {/* Phone Input */}
              <View style={styles.inputSection}>
                <View
                  style={[
                    styles.phoneInputContainer,
                    inputFocused && styles.phoneInputContainerFocused,
                    hasError && styles.phoneInputContainerError,
                  ]}
                >
                  <CountryPicker
                    selectedCountry={selectedCountry}
                    onSelect={(country) => {
                      setSelectedCountry(country);
                      setHasError(false);
                    }}
                  />
                  <RNTextInput
                    ref={inputRef}
                    style={[
                      styles.phoneInput,
                      hasError && styles.phoneInputError,
                    ]}
                    placeholder={selectedCountry.placeholder}
                    placeholderTextColor={COLORS.textPlaceholder}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(text.replace(/\D/g, ""));
                      setHasError(false);
                    }}
                    maxLength={selectedCountry.maxLength}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                  />
                  {phoneNumber.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={clearInput}
                    >
                      <View style={styles.clearButtonInner}>
                        <X size={12} color={COLORS.textSub} strokeWidth={2} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                {hasError && (
                  <Text style={styles.errorText}>
                    Please enter a valid phone number
                  </Text>
                )}
              </View>
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !isValid && styles.nextButtonDisabled,
                ]}
                onPress={handlePhoneNext}
                activeOpacity={0.8}
                disabled={!isValid}
              >
                <Text style={styles.nextButtonText}>Continue with phone</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

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
    marginBottom: 32,
  },
  inputSection: {
    width: "100%",
    marginTop: 8,
  },
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
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
});
