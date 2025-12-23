import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, X, CheckCircle } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ClubPageProps, Club } from "../../types";

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

interface ClubSuggestion {
  id: string;
  name: string;
  location: string;
  type: Club["type"];
}

export const ClubPage: React.FC<ClubPageProps> = ({
  onNext,
  onBack,
  initialClub = "",
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState<string>(initialClub);
  const [selectedClub, setSelectedClub] = useState<ClubSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<ClubSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search for golf courses using OpenStreetMap Nominatim API
  const searchGolfCourses = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + " golf")}&countrycodes=us&format=json&addressdetails=1&limit=10`,
        {
          headers: {
            "User-Agent": "TeeTimeGolfApp/1.0",
          },
        }
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      const results: ClubSuggestion[] = data
        .filter((item: any) =>
          item.type === "golf_course" ||
          item.class === "leisure" ||
          item.display_name?.toLowerCase().includes("golf")
        )
        .slice(0, 8)
        .map((item: any, index: number) => {
          const city = item.address?.city || item.address?.town || item.address?.village || "";
          const state = item.address?.state || "";
          const location = [city, state].filter(Boolean).join(", ");

          return {
            id: `${item.place_id}-${index}`,
            name: item.name || item.display_name?.split(",")[0] || query,
            location: location || "United States",
            type: "Public" as Club["type"],
          };
        });

      if (results.length === 0 && query.length >= 2) {
        results.push({
          id: "manual",
          name: query,
          location: "Custom entry",
          type: "Public",
        });
      }

      setSuggestions(results);
    } catch (error) {
      console.error("Golf course search error:", error);
      setSuggestions([{
        id: "manual",
        name: query,
        location: "Custom entry",
        type: "Public",
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback((text: string): void => {
    setSearchQuery(text);
    setSelectedClub(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchGolfCourses(text);
      }, 300);
    } else {
      setSuggestions([]);
    }
  }, [searchGolfCourses]);

  const handleSelectClub = useCallback((club: ClubSuggestion): void => {
    setSelectedClub(club);
    setSearchQuery(club.name);
    setSuggestions([]);
    Keyboard.dismiss();
  }, []);

  const handleNext = useCallback((): void => {
    const clubData: Club | null = selectedClub
      ? {
        id: selectedClub.id,
        name: selectedClub.name,
        location: selectedClub.location,
        type: selectedClub.type,
      }
      : null;

    onNext({ club: clubData });
  }, [selectedClub, onNext]);

  const handleSkip = useCallback((): void => {
    onNext({ club: null });
  }, [onNext]);

  const handleClear = useCallback(() => {
    setSearchQuery("");
    setSelectedClub(null);
    setSuggestions([]);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
            </TouchableOpacity>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: "40%" }]} />
            </View>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <ScrollView
            style={styles.mainContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Your home course?</Text>
            <Text style={styles.subtitle}>
              Find your club or home course (optional)
            </Text>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="golf" size={20} color={COLORS.textSub} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a golf club"
                placeholderTextColor={COLORS.textPlaceholder}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
              />
              {loading && (
                <ActivityIndicator size="small" color={COLORS.primary} />
              )}
              {searchQuery.length > 0 && !loading && (
                <TouchableOpacity onPress={handleClear}>
                  <X size={20} color={COLORS.textSub} />
                </TouchableOpacity>
              )}
            </View>

            {/* Suggestions - using map instead of FlatList to avoid VirtualizedList warning */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectClub(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clubIcon}>
                      <Ionicons name="golf" size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionName}>{item.name}</Text>
                      <Text style={styles.suggestionDescription}>
                        {item.location} • {item.type}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected Club */}
            {selectedClub && (
              <View style={styles.selectedCard}>
                <View style={styles.selectedIcon}>
                  <Ionicons name="golf" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.selectedText}>
                  <Text style={styles.selectedName}>{selectedClub.name}</Text>
                  <Text style={styles.selectedDescription}>
                    {selectedClub.location} • {selectedClub.type}
                  </Text>
                </View>
                <CheckCircle size={24} color={COLORS.primary} />
              </View>
            )}

            {/* Help Text */}
            <Text style={styles.helpText}>
              We'll prioritize tee times at your home course
            </Text>
          </ScrollView>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={selectedClub ? handleNext : handleSkip}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {selectedClub ? "Next" : "Skip"}
              </Text>
            </TouchableOpacity>

            {!selectedClub && (
              <TouchableOpacity style={styles.notMemberButton} onPress={handleSkip}>
                <Text style={styles.notMemberText}>I'm not a member anywhere</Text>
              </TouchableOpacity>
            )}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
  },
  suggestionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
    gap: 12,
  },
  clubIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 2,
  },
  suggestionDescription: {
    fontSize: 14,
    color: COLORS.textSub,
  },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 16,
    gap: 12,
  },
  selectedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedText: {
    flex: 1,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 2,
  },
  selectedDescription: {
    fontSize: 14,
    color: COLORS.textSub,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: "center",
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
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
  notMemberButton: {
    alignItems: "center",
    padding: 12,
    marginTop: 12,
  },
  notMemberText: {
    fontSize: 14,
    color: COLORS.textSub,
    textDecorationLine: "underline",
  },
});
