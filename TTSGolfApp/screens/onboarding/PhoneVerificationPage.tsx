import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  ViewStyle,
  TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, fontSize } from "../../theme";
import { CountryCodeModal } from "../../components";
import { COUNTRY_CODES } from "../../constants/countryCodes";
import type { PhoneVerificationPageProps, CountryCode } from "../../types";

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  stepIndicator: TextStyle;
  content: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  formArea: ViewStyle;
  phoneInputWrapper: ViewStyle;
  phoneInputRow: ViewStyle;
  countryCodeButton: ViewStyle;
  flagText: TextStyle;
  countryCodeText: TextStyle;
  phoneInputField: TextStyle;
  footer: ViewStyle;
  primaryBtn: ViewStyle;
  primaryBtnDisabled: ViewStyle;
  primaryBtnText: TextStyle;
}

export const PhoneVerificationPage: React.FC<PhoneVerificationPageProps> = ({
  onNext,
  onBack,
  initialPhone = "",
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    COUNTRY_CODES.find((c) => c.country === "United States") || COUNTRY_CODES[0]
  );
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const isValid = digitsOnly.length >= 8;
  const fullPhoneNumber = `${selectedCountry.code}${digitsOnly}`;

  const handleNext = (): void => {
    if (!isValid) return;
    // Just pass phone number to next step - magic link sent at end of onboarding
    onNext({ phoneNumber: fullPhoneNumber });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step 1 of 7</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Enter your phone number</Text>
        <Text style={styles.subtitle}>
          We'll use this to create your account and send you a magic link to
          complete signup
        </Text>

        <View style={styles.formArea}>
          <View style={styles.phoneInputWrapper}>
            <View style={styles.phoneInputRow}>
              <TouchableOpacity
                style={styles.countryCodeButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCodeText}>
                  {selectedCountry.code}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.phoneInputField}
                placeholder="3051234567"
                placeholderTextColor={colors.placeholder}
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, ""))}
                keyboardType="phone-pad"
                maxLength={12}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !isValid && styles.primaryBtnDisabled]}
          onPress={handleNext}
          disabled={!isValid}
        >
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Country Code Modal */}
      <CountryCodeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={setSelectedCountry}
        selectedCountry={selectedCountry}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  stepIndicator: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xxxl,
    lineHeight: 22,
  },
  formArea: {
    marginTop: spacing.sm,
  },
  phoneInputWrapper: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  phoneInputRow: {
    flexDirection: "row",
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  countryCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceDark,
    gap: 4,
  },
  flagText: {
    fontSize: fontSize.lg,
  },
  countryCodeText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  phoneInputField: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  footer: {
    padding: spacing.xl,
    marginTop: "auto",
  },
  primaryBtn: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: borderRadius.lg,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: "bold",
  },
});
