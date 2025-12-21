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
import type { HandicapPageProps } from "../../types";

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  skipText: TextStyle;
  progressBarContainer: ViewStyle;
  progressBarFill: ViewStyle;
  content: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  inputContainer: ViewStyle;
  input: TextStyle;
  inputError: ViewStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  infoCard: ViewStyle;
  infoIcon: ViewStyle;
  infoContent: ViewStyle;
  infoTitle: TextStyle;
  infoText: TextStyle;
  rangeHints: ViewStyle;
  rangeHint: ViewStyle;
  rangeLabel: TextStyle;
  rangeValue: TextStyle;
  footer: ViewStyle;
  primaryBtn: ViewStyle;
  primaryBtnDisabled: ViewStyle;
  primaryBtnText: TextStyle;
}

export const HandicapPage: React.FC<HandicapPageProps> = ({
  onNext,
  onBack,
  initialHandicap = "",
}) => {
  const [handicap, setHandicap] = useState<string>(initialHandicap);
  const [error, setError] = useState<string>("");

  const validateHandicap = (value: string): boolean => {
    if (value === "") return true;

    const num = parseFloat(value);
    if (isNaN(num)) {
      setError("Please enter a valid number");
      return false;
    }
    if (num < -10 || num > 54) {
      setError("Handicap must be between -10 and 54");
      return false;
    }
    setError("");
    return true;
  };

  const handleChange = (text: string): void => {
    const cleaned = text.replace(/[^0-9.-]/g, "");
    setHandicap(cleaned);
    validateHandicap(cleaned);
  };

  const handleNext = (): void => {
    if (!validateHandicap(handicap)) return;

    const handicapValue = handicap !== "" ? parseFloat(handicap) : null;
    onNext({ handicap: handicapValue });
  };

  const handleSkip = (): void => {
    onNext({ handicap: null });
  };

  const isValid = handicap === "" || (error === "" && handicap !== "");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: "50%" }]} />
        </View>

        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>What's your handicap?</Text>
        <Text style={styles.subtitle}>
          This helps us match you with players of similar skill
        </Text>

        <View style={[styles.inputContainer, error ? styles.inputError : null]}>
          <TextInput
            style={styles.input}
            placeholder="Enter your handicap (e.g., 12.5)"
            placeholderTextColor="#BDBDBD"
            value={handicap}
            onChangeText={handleChange}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleNext}
          />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#E53935" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="help-circle" size={24} color="#5DB075" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Don't have a handicap?</Text>
            <Text style={styles.infoText}>
              No worries! You can skip this for now and add it later in your
              profile settings.
            </Text>
          </View>
        </View>

        <View style={styles.rangeHints}>
          <View style={styles.rangeHint}>
            <Text style={styles.rangeLabel}>Scratch</Text>
            <Text style={styles.rangeValue}>0</Text>
          </View>
          <View style={styles.rangeHint}>
            <Text style={styles.rangeLabel}>Average</Text>
            <Text style={styles.rangeValue}>15-20</Text>
          </View>
          <View style={styles.rangeHint}>
            <Text style={styles.rangeLabel}>Beginner</Text>
            <Text style={styles.rangeValue}>25+</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !isValid && styles.primaryBtnDisabled]}
          onPress={handleNext}
          disabled={!isValid}
        >
          <Text style={styles.primaryBtnText}>
            {handicap ? "Next" : "Skip"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  skipText: {
    color: "#666666",
    fontSize: 16,
    fontWeight: "600",
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    marginHorizontal: 20,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#5DB075",
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000000",
  },
  inputError: {
    borderColor: "#E53935",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#E53935",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
    gap: 12,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  rangeHints: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  rangeHint: {
    alignItems: "center",
  },
  rangeLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  rangeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5DB075",
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
