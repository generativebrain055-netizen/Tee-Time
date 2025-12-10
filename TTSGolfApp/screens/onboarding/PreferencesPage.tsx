import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ViewStyle,
  TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, fontSize } from "../../theme";
import type { PreferencesPageProps, PreferencesData } from "../../types";

interface TimeOption {
  id: string;
  label: string;
  icon: string;
}

interface PlayerCountOption {
  id: string;
  label: string;
  count: string;
}

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  skipText: TextStyle;
  progressBarContainer: ViewStyle;
  progressBarFill: ViewStyle;
  content: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  section: ViewStyle;
  sectionTitle: TextStyle;
  optionRow: ViewStyle;
  optionCard: ViewStyle;
  optionCardSelected: ViewStyle;
  optionIcon: TextStyle;
  optionLabel: TextStyle;
  optionLabelSelected: TextStyle;
  toggleContainer: ViewStyle;
  toggleOption: ViewStyle;
  toggleOptionSelected: ViewStyle;
  toggleText: TextStyle;
  toggleTextSelected: TextStyle;
  timeGrid: ViewStyle;
  timeOption: ViewStyle;
  timeOptionSelected: ViewStyle;
  timeIcon: ViewStyle;
  timeLabel: TextStyle;
  timeLabelSelected: TextStyle;
  footer: ViewStyle;
  primaryBtn: ViewStyle;
  primaryBtnText: TextStyle;
}

const TIME_OPTIONS: TimeOption[] = [
  { id: "morning", label: "Morning", icon: "sunny" },
  { id: "midday", label: "Midday", icon: "partly-sunny" },
  { id: "afternoon", label: "Afternoon", icon: "cloudy" },
  { id: "twilight", label: "Twilight", icon: "moon" },
];

const PLAYER_COUNT_OPTIONS: PlayerCountOption[] = [
  { id: "solo", label: "Solo", count: "1" },
  { id: "duo", label: "Duo", count: "2" },
  { id: "trio", label: "Trio", count: "3" },
  { id: "foursome", label: "Foursome", count: "4" },
];

export const PreferencesPage: React.FC<PreferencesPageProps> = ({
  onNext,
  onBack,
  initialPreferences = {},
}) => {
  const [playStyle, setPlayStyle] = useState<"walk" | "ride" | "either">(
    initialPreferences.playStyle || "walk"
  );
  const [preferredTimes, setPreferredTimes] = useState<string[]>(
    initialPreferences.preferredTimes || []
  );
  const [playerCount, setPlayerCount] = useState<string>(
    String(initialPreferences.playerCount || "")
  );

  const toggleTimeOption = (id: string): void => {
    setPreferredTimes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleNext = (): void => {
    const preferencesData: PreferencesData = {
      playStyle,
      preferredTimes,
      playerCount,
    };
    onNext({ preferences: preferencesData });
  };

  const handleSkip = (): void => {
    onNext({ preferences: null });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: "85%" }]} />
        </View>

        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your preferences</Text>
        <Text style={styles.subtitle}>Tell us how you like to play</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Play style</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                playStyle === "walk" && styles.toggleOptionSelected,
              ]}
              onPress={() => setPlayStyle("walk")}
            >
              <Text
                style={[
                  styles.toggleText,
                  playStyle === "walk" && styles.toggleTextSelected,
                ]}
              >
                Walk
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                playStyle === "ride" && styles.toggleOptionSelected,
              ]}
              onPress={() => setPlayStyle("ride")}
            >
              <Text
                style={[
                  styles.toggleText,
                  playStyle === "ride" && styles.toggleTextSelected,
                ]}
              >
                Ride
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred tee times</Text>
          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.timeOption,
                  preferredTimes.includes(option.id) &&
                    styles.timeOptionSelected,
                ]}
                onPress={() => toggleTimeOption(option.id)}
              >
                <View style={styles.timeIcon}>
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={
                      preferredTimes.includes(option.id) ? "#5DB075" : "#666666"
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.timeLabel,
                    preferredTimes.includes(option.id) &&
                      styles.timeLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred group size</Text>
          <View style={styles.optionRow}>
            {PLAYER_COUNT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  playerCount === option.id && styles.optionCardSelected,
                ]}
                onPress={() => setPlayerCount(option.id)}
              >
                <Text
                  style={[
                    styles.optionIcon,
                    playerCount === option.id && styles.optionLabelSelected,
                  ]}
                >
                  {option.count}
                </Text>
                <Text
                  style={[
                    styles.optionLabel,
                    playerCount === option.id && styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
          <Text style={styles.primaryBtnText}>Complete Setup</Text>
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
    paddingBottom: 40,
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 15,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  optionCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 8,
  },
  optionCardSelected: {
    borderColor: "#5DB075",
    backgroundColor: "#E8F5E9",
  },
  optionIcon: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666666",
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 12,
    color: "#666666",
  },
  optionLabelSelected: {
    color: "#5DB075",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 6,
  },
  toggleOptionSelected: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "500",
  },
  toggleTextSelected: {
    color: "#5DB075",
    fontWeight: "600",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeOption: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 8,
    gap: 10,
  },
  timeOptionSelected: {
    borderColor: "#5DB075",
    backgroundColor: "#E8F5E9",
  },
  timeIcon: {
    width: 32,
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  timeLabelSelected: {
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
  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: "bold",
  },
});
