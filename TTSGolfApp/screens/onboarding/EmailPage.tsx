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
import type { EmailPageProps } from "../../types";

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  stepIndicator: TextStyle;
  skipText: TextStyle;
  content: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  formArea: ViewStyle;
  inputContainer: ViewStyle;
  input: TextStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  footer: ViewStyle;
  primaryBtn: ViewStyle;
  primaryBtnDisabled: ViewStyle;
  primaryBtnText: TextStyle;
  skipButton: ViewStyle;
  skipButtonText: TextStyle;
}

export const EmailPage: React.FC<EmailPageProps> = ({
  onNext,
  onBack,
  initialEmail = "",
}) => {
  const [email, setEmail] = useState<string>(initialEmail);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(email);
  const canProceed = email.trim() === "" || isValidEmail;

  const handleNext = (): void => {
    onNext({ email: email.trim() });
  };

  const handleSkip = (): void => {
    onNext({ email: "" });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>What's your email?</Text>
        <Text style={styles.subtitle}>
          We'll send you match updates and tee time reminders
        </Text>

        <View style={styles.formArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
          </View>

          {email.trim() !== "" && !isValidEmail && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>Please enter a valid email</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !canProceed && styles.primaryBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
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
  skipText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: "600",
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
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
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
  skipButton: {
    marginTop: spacing.md,
    alignItems: "center",
    padding: spacing.md,
  },
  skipButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
});
