import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import type { ZipCodePageProps } from "../../types";

const COLORS = {
  primary: "#5EBC68",
  white: "#FFFFFF",
  textMain: "#1A1A1A",
  textSub: "#6B7280",
  textPlaceholder: "#9CA3AF",
  surface: "#EEEEEE",
};

export const ZipCodePage: React.FC<ZipCodePageProps> = ({
  onNext,
  onBack,
  initialZipCode = "",
}) => {
  const insets = useSafeAreaInsets();
  const [zipCode, setZipCode] = useState(initialZipCode);

  const zipRegex = /^\d{5}(-\d{4})?$/;
  const isValidZip =
    zipCode.trim() === "" || zipRegex.test(zipCode.replace(/\s/g, ""));
  const canProceed = isValidZip;

  const handleNext = (): void => {
    Keyboard.dismiss();
    onNext({ zipCode: zipCode.trim() || undefined });
  };

  const handleSkip = (): void => {
    onNext({ zipCode: undefined });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
      <StatusBar style="dark" />
      <View style={styles.keyboardView}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <ArrowLeft size={24} color="#000" strokeWidth={1.5} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mainContent}>
              <Text style={styles.title}>What's your zip code?</Text>
              <Text style={styles.subtitle}>
                We'll use this to find courses and players near you
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Zip code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12345"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={zipCode}
                  onChangeText={(text) =>
                    setZipCode(text.replace(/[^\d-]/g, "").slice(0, 10))
                  }
                  keyboardType="number-pad"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
              </View>
            </View>
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
                onPress={handleNext}
                disabled={!canProceed}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  keyboardView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  header: {
    height: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  skipButton: { paddingVertical: 8, paddingHorizontal: 4 },
  skipText: { fontSize: 15, fontWeight: "600", color: COLORS.textSub },
  mainContent: { flex: 1, paddingTop: 24 },
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
  inputContainer: { width: "100%", marginBottom: 4 },
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
  bottomSection: { paddingBottom: 32 },
  nextButton: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: { opacity: 0.6 },
  nextButtonText: { fontSize: 16, fontWeight: "600", color: COLORS.white },
});
