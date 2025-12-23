import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, ChevronDown, Check } from "lucide-react-native";
import type { PreferencesPageProps, PreferencesData } from "../../types";

// Consistent colors with login screen
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
};

interface DropdownOption {
  label: string;
  value: string;
}

const TIME_OPTIONS: DropdownOption[] = [
  { label: "Morning", value: "morning" },
  { label: "Late morning", value: "late_morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
  { label: "Any time", value: "any" },
];

const PLAY_STYLE_OPTIONS: DropdownOption[] = [
  { label: "Walk", value: "walk" },
  { label: "Ride", value: "ride" },
  { label: "Either", value: "either" },
];

const PARTNER_COUNT_OPTIONS: DropdownOption[] = [
  { label: "Solo (1 player)", value: "solo" },
  { label: "Twosome (2 players)", value: "twosome" },
  { label: "Threesome (3 players)", value: "threesome" },
  { label: "Foursome (4 players)", value: "foursome" },
  { label: "Any group size", value: "any" },
];


interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = useCallback((optionValue: string) => {
    onSelect(optionValue);
    setIsOpen(false);
  }, [onSelect]);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dropdownButtonText,
            !selectedOption && styles.dropdownPlaceholder,
          ]}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronDown size={20} color={COLORS.textSub} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === value && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Check size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export const PreferencesPage: React.FC<PreferencesPageProps> = ({
  onNext,
  onBack,
  initialPreferences = {},
}) => {
  const insets = useSafeAreaInsets();
  const [preferredTime, setPreferredTime] = useState<string>(
    initialPreferences.preferredTimes?.join(",") || ""
  );
  const [playStyle, setPlayStyle] = useState<string>(
    initialPreferences.playStyle || ""
  );
  const [partnerCount, setPartnerCount] = useState<string>(
    initialPreferences.playerCount || ""
  );

  const isValid = preferredTime !== "" && playStyle !== "" && partnerCount !== "";

  const handleNext = useCallback((): void => {
    if (!isValid) return;

    const preferencesData: PreferencesData = {
      playStyle: playStyle as "walk" | "ride" | "either",
      preferredTimes: preferredTime.split(","),
      playerCount: partnerCount,
    };
    onNext({ preferences: preferencesData });
  }, [isValid, playStyle, preferredTime, partnerCount, onNext]);

  const handleSkip = useCallback((): void => {
    onNext({ preferences: null });
  }, [onNext]);

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
            </TouchableOpacity>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: "90%" }]} />
            </View>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mainContent}>
            <Text style={styles.title}>Playing preferences</Text>
            <Text style={styles.subtitle}>Tell us how you like to play</Text>

            <Dropdown
              label="What time of day do you like to play?"
              value={preferredTime}
              options={TIME_OPTIONS}
              onSelect={setPreferredTime}
              placeholder="Select time..."
            />

            <Dropdown
              label="Do you prefer to walk or ride?"
              value={playStyle}
              options={PLAY_STYLE_OPTIONS}
              onSelect={setPlayStyle}
              placeholder="Select preference..."
            />

            <Dropdown
              label="Preferred group size"
              value={partnerCount}
              options={PARTNER_COUNT_OPTIONS}
              onSelect={setPartnerCount}
              placeholder="Select group size..."
            />
          </View>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!isValid}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginHorizontal: 16,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
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
    marginBottom: 32,
  },
  dropdownContainer: {
    marginBottom: 24,
  },
  dropdownLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textMain,
    marginBottom: 10,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: COLORS.textMain,
  },
  dropdownPlaceholder: {
    color: COLORS.textPlaceholder,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textMain,
    textAlign: "center",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  optionItemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.textMain,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
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
