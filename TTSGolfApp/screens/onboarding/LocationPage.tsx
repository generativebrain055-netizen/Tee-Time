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
import { ArrowLeft, Search, X, MapPin, CheckCircle } from "lucide-react-native";
import type { LocationPageProps, Location } from "../../types";
import { API_URL } from "../../config/api";

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

interface LocationSuggestion {
  id: string;
  name: string;
  description: string;
  type: "city" | "club";
  lat?: number;
  lon?: number;
}

export const LocationPage: React.FC<LocationPageProps> = ({
  onNext,
  onBack,
  initialLocation = "",
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState<string>(initialLocation);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search cities using backend API (fast, based on golf club locations)
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/courses/cities/search?q=${encodeURIComponent(query)}&limit=15`,
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      if (data.success && data.cities) {
        const results: LocationSuggestion[] = data.cities.map((city: any) => ({
          id: city.id,
          name: city.name,
          description: "United States",
          type: "city" as const,
        }));

        // Add manual entry option if no exact match
        if (
          results.length === 0 ||
          !results.some((r) =>
            r.name.toLowerCase().startsWith(query.toLowerCase()),
          )
        ) {
          results.push({
            id: "manual",
            name: query,
            description: "Use this location",
            type: "city",
          });
        }

        setSuggestions(results);
      } else {
        setSuggestions([
          {
            id: "manual",
            name: query,
            description: "Use this location",
            type: "city",
          },
        ]);
      }
    } catch (error) {
      console.error("Location search error:", error);
      setSuggestions([
        {
          id: "manual",
          name: query,
          description: "Use this location",
          type: "city",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (text: string): void => {
      setSearchQuery(text);
      setSelectedLocation(null);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (text.length >= 2) {
        searchTimeoutRef.current = setTimeout(() => {
          searchLocations(text);
        }, 300);
      } else {
        setSuggestions([]);
      }
    },
    [searchLocations],
  );

  const handleSelectLocation = useCallback(
    (location: LocationSuggestion): void => {
      setSelectedLocation(location);
      setSearchQuery(location.name);
      setSuggestions([]);
      Keyboard.dismiss();
    },
    [],
  );

  const handleNext = useCallback((): void => {
    if (!selectedLocation && searchQuery.trim().length < 2) return;

    const locationData: Location = selectedLocation
      ? {
          id: selectedLocation.id,
          name: selectedLocation.name,
          description: selectedLocation.description,
        }
      : { name: searchQuery.trim() };

    onNext({ location: locationData });
  }, [selectedLocation, searchQuery, onNext]);

  const handleClear = useCallback(() => {
    setSearchQuery("");
    setSelectedLocation(null);
    setSuggestions([]);
  }, []);

  const isValid = selectedLocation !== null || searchQuery.trim().length >= 2;

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
              <View style={[styles.progressBar, { width: "60%" }]} />
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Main Content */}
          <ScrollView
            style={styles.mainContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Where do you play?</Text>
            <Text style={styles.subtitle}>
              Enter your city to find tee times and golfers nearby
            </Text>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Search size={20} color={COLORS.textSub} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search city (e.g., Miami, FL)"
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
                    onPress={() => handleSelectLocation(item)}
                    activeOpacity={0.7}
                  >
                    <MapPin size={20} color={COLORS.primary} />
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionName}>{item.name}</Text>
                      <Text style={styles.suggestionDescription}>
                        {item.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected Location */}
            {selectedLocation && (
              <View style={styles.selectedCard}>
                <MapPin size={24} color={COLORS.primary} />
                <View style={styles.selectedText}>
                  <Text style={styles.selectedName}>
                    {selectedLocation.name}
                  </Text>
                  <Text style={styles.selectedDescription}>
                    {selectedLocation.description}
                  </Text>
                </View>
                <CheckCircle size={24} color={COLORS.primary} />
              </View>
            )}

            {/* Help Text */}
            <Text style={styles.helpText}>
              We'll show you tee times and golfers in this area
            </Text>
          </ScrollView>

          {/* Bottom Section */}
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
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
});
