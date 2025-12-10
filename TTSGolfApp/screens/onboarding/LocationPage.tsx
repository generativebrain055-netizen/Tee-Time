import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  FlatList,
  Keyboard,
  ViewStyle,
  TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, fontSize } from "../../theme";
import type { LocationPageProps, Location } from "../../types";

interface LocationSuggestion {
  id: string;
  name: string;
  description: string;
  type: "city" | "club";
}

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  stepIndicator: TextStyle;
  content: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  searchContainer: ViewStyle;
  searchIconContainer: ViewStyle;
  searchInput: TextStyle;
  clearButton: ViewStyle;
  suggestionsContainer: ViewStyle;
  suggestionsList: ViewStyle;
  suggestionItem: ViewStyle;
  suggestionText: ViewStyle;
  suggestionName: TextStyle;
  suggestionDescription: TextStyle;
  selectedCard: ViewStyle;
  selectedText: ViewStyle;
  selectedName: TextStyle;
  selectedDescription: TextStyle;
  footer: ViewStyle;
  primaryBtn: ViewStyle;
  primaryBtnDisabled: ViewStyle;
  primaryBtnText: TextStyle;
  helpContainer: ViewStyle;
  helpText: TextStyle;
}

export const LocationPage: React.FC<LocationPageProps> = ({
  onNext,
  onBack,
  initialLocation = "",
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(initialLocation);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);

  // Mock location suggestions
  const mockSuggestions: LocationSuggestion[] = [
    {
      id: "1",
      name: "Miami, FL",
      description: "Florida, United States",
      type: "city",
    },
    {
      id: "2",
      name: "Miami Beach, FL",
      description: "Florida, United States",
      type: "city",
    },
    {
      id: "3",
      name: "Coral Gables, FL",
      description: "Florida, United States",
      type: "city",
    },
    {
      id: "4",
      name: "Doral, FL",
      description: "Florida, United States",
      type: "city",
    },
  ];

  const handleSearch = (text: string): void => {
    setSearchQuery(text);
    setSelectedLocation(null);

    if (text.length >= 2) {
      const filtered = mockSuggestions.filter((s) =>
        s.name.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectLocation = (location: LocationSuggestion): void => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const handleNext = (): void => {
    if (!selectedLocation && searchQuery.trim().length < 2) return;

    const locationData: Location = selectedLocation
      ? {
          id: selectedLocation.id,
          name: selectedLocation.name,
          description: selectedLocation.description,
        }
      : { name: searchQuery.trim() };

    onNext({ location: locationData });
  };

  const isValid = selectedLocation !== null || searchQuery.trim().length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step 3 of 3</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Where do you play?</Text>
        <Text style={styles.subtitle}>
          Enter your city or club to find tee times nearby
        </Text>

        <View style={styles.searchContainer}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={20} color="#666666" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search city, club, or zip code"
            placeholderTextColor="#BDBDBD"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery("");
                setSelectedLocation(null);
                setSuggestions([]);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#666666" />
            </TouchableOpacity>
          )}
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelectLocation(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.type === "club" ? "golf" : "location"}
                    size={20}
                    color="#5DB075"
                  />
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    <Text style={styles.suggestionDescription}>
                      {item.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
                </TouchableOpacity>
              )}
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {selectedLocation && (
          <View style={styles.selectedCard}>
            <Ionicons name="location-sharp" size={24} color="#5DB075" />
            <View style={styles.selectedText}>
              <Text style={styles.selectedName}>{selectedLocation.name}</Text>
              <Text style={styles.selectedDescription}>
                {selectedLocation.description}
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#5DB075" />
          </View>
        )}

        <View style={styles.helpContainer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#666666"
          />
          <Text style={styles.helpText}>
            We'll show you tee times and golfers in this area
          </Text>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchIconContainer: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  clearButton: {
    marginLeft: spacing.sm,
  },
  suggestionsContainer: {
    maxHeight: 250,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  suggestionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  selectedText: {
    flex: 1,
  },
  selectedName: {
    fontSize: fontSize.md,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  selectedDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
  helpContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
});
