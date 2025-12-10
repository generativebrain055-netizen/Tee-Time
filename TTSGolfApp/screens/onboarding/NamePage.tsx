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
import type { NamePageProps } from "../../types";

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  stepIndicator: TextStyle;
  content: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  formArea: ViewStyle;
  inputContainer: ViewStyle;
  input: TextStyle;
  footer: ViewStyle;
  primaryBtn: ViewStyle;
  primaryBtnDisabled: ViewStyle;
  primaryBtnText: TextStyle;
}

export const NamePage: React.FC<NamePageProps> = ({
  onNext,
  onBack,
  initialData = {},
}) => {
  const [firstName, setFirstName] = useState<string>(
    initialData.firstName || ""
  );
  const [lastName, setLastName] = useState<string>(initialData.lastName || "");

  const isValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;

  const handleNext = (): void => {
    if (!isValid) return;
    onNext({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step 2 of 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.subtitle}>
          This is how other golfers will see you
        </Text>

        <View style={styles.formArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="First name"
              placeholderTextColor={colors.placeholder}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Last name"
              placeholderTextColor={colors.placeholder}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
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
    gap: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.xs,
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
