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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, AlertCircle, HelpCircle } from "lucide-react-native";
import type { HandicapPageProps } from "../../types";

// Colors - consistent with LoginScreen
const COLORS = {
  primary: "#5DB075",
  primaryLight: "#E8F5E9",
  white: "#FFFFFF",
  black: "#000000",
  textMain: "#1A1A1A",
  textSub: "#6B7280",
  textPlaceholder: "#9CA3AF",
  border: "#E5E7EB",
  surface: "#F9FAFB",
  error: "#EF4444",
};

export const HandicapPage: React.FC<HandicapPageProps> = ({
  onNext,
  onBack,
  initialHandicap = "",
}) => {
  const insets = useSafeAreaInsets();
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
    Keyboard.dismiss();
    const handicapValue = handicap !== "" ? parseFloat(handicap) : null;
    onNext({ handicap: handicapValue });
  };

  const handleSkip = (): void => {
    onNext({ handicap: null });
  };

  const isValid = handicap === "" || (error === "" && handicap !== "");

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
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.title}>What's your handicap?</Text>
              <Text style={styles.subtitle}>
                This helps us match you with players of similar skill
              </Text>

              {/* Form */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Handicap index</Text>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  placeholder="Enter your handicap (e.g., 12.5)"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={handicap}
                  onChangeText={handleChange}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
                {error ? (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={14} color={COLORS.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <HelpCircle size={24} color={COLORS.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Don't have a handicap?</Text>
                  <Text style={styles.infoText}>
                    No worries! You can skip this for now and add it later in your profile settings.
                  </Text>
                </View>
              </View>

              {/* Range Hints */}
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
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
                onPress={handleNext}
                disabled={!isValid}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>
                  {handicap ? "Next" : "Skip"}
                </Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSub,
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
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSub,
    marginBottom: 8,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textMain,
  },
  inputError: {
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSub,
    lineHeight: 20,
  },
  rangeHints: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rangeHint: {
    alignItems: "center",
  },
  rangeLabel: {
    fontSize: 12,
    color: COLORS.textSub,
    marginBottom: 4,
  },
  rangeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
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
