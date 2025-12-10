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
import type { ClubPageProps, Club } from "../../types";

interface ClubSuggestion {
  id: string;
  name: string;
  location: string;
  type: Club["type"];
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
  searchContainer: ViewStyle;
  searchIconContainer: ViewStyle;
  searchInput: TextStyle;
  clearButton: ViewStyle;
  suggestionsContainer: ViewStyle;
  suggestionsList: ViewStyle;
  suggestionItem: ViewStyle;
  clubIcon: ViewStyle;
  suggestionText: ViewStyle;
  suggestionName: TextStyle;
  suggestionDescription: TextStyle;
  selectedCard: ViewStyle;
  selectedIcon: ViewStyle;
  selectedText: ViewStyle;
  selectedName: TextStyle;
  selectedDescription: TextStyle;
  footer: ViewStyle;
  primaryBtn: ViewStyle;
  primaryBtnText: TextStyle;
  notMemberButton: ViewStyle;
  notMemberText: TextStyle;
  helpContainer: ViewStyle;
  helpText: TextStyle;
}

export const ClubPage: React.FC<ClubPageProps> = ({
  onNext,
  onBack,
  initialClub = "",
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(initialClub);
  const [selectedClub, setSelectedClub] = useState<ClubSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<ClubSuggestion[]>([]);

  // Mock club suggestions
  const mockClubs: ClubSuggestion[] = [
    {
      id: "1",
      name: "Doral Golf Resort & Spa",
      location: "Miami, FL",
      type: "Resort",
    },
    {
      id: "2",
      name: "Trump National Doral",
      location: "Doral, FL",
      type: "Private",
    },
    {
      id: "3",
      name: "Biltmore Golf Course",
      location: "Coral Gables, FL",
      type: "Semi-Private",
    },
    {
      id: "4",
      name: "Crandon Golf at Key Biscayne",
      location: "Key Biscayne, FL",
      type: "Public",
    },
  ];

  const handleSearch = (text: string): void => {
    setSearchQuery(text);
    setSelectedClub(null);

    if (text.length >= 2) {
      const filtered = mockClubs.filter((club) =>
        club.name.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectClub = (club: ClubSuggestion): void => {
    setSelectedClub(club);
    setSearchQuery(club.name);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const handleNext = (): void => {
    const clubData: Club | null = selectedClub
      ? {
          id: selectedClub.id,
          name: selectedClub.name,
          location: selectedClub.location,
          type: selectedClub.type,
        }
      : null;

    onNext({ club: clubData });
  };

  const handleSkip = (): void => {
    onNext({ club: null });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: "40%" }]} />
        </View>

        <TouchableOpacity onPress={selectedClub ? handleNext : handleSkip}>
          <Text style={styles.skipText}>
            {selectedClub ? "Continue" : "Skip"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Your home course?</Text>
        <Text style={styles.subtitle}>
          Find your club or home course (optional)
        </Text>

        <View style={styles.searchContainer}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="golf" size={20} color="#666666" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a golf club"
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
                setSelectedClub(null);
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
                  onPress={() => handleSelectClub(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.clubIcon}>
                    <Ionicons name="golf" size={20} color="#5DB075" />
                  </View>
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    <Text style={styles.suggestionDescription}>
                      {item.location} • {item.type}
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

        {selectedClub && (
          <View style={styles.selectedCard}>
            <View style={styles.selectedIcon}>
              <Ionicons name="golf" size={24} color="#5DB075" />
            </View>
            <View style={styles.selectedText}>
              <Text style={styles.selectedName}>{selectedClub.name}</Text>
              <Text style={styles.selectedDescription}>
                {selectedClub.location} • {selectedClub.type}
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
            We'll prioritize tee times at your home course
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={selectedClub ? handleNext : handleSkip}
        >
          <Text style={styles.primaryBtnText}>
            {selectedClub ? "Next" : "Skip"}
          </Text>
        </TouchableOpacity>

        {!selectedClub && (
          <TouchableOpacity style={styles.notMemberButton} onPress={handleSkip}>
            <Text style={styles.notMemberText}>I'm not a member anywhere</Text>
          </TouchableOpacity>
        )}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIconContainer: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#000000",
  },
  clearButton: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    maxHeight: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 16,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    gap: 12,
  },
  clubIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 2,
  },
  suggestionDescription: {
    fontSize: 14,
    color: "#666666",
  },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#5DB075",
    marginBottom: 20,
    gap: 12,
  },
  selectedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedText: {
    flex: 1,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 2,
  },
  selectedDescription: {
    fontSize: 14,
    color: "#666666",
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
  notMemberButton: {
    alignItems: "center",
    padding: 12,
    marginTop: 12,
  },
  notMemberText: {
    fontSize: 14,
    color: "#666666",
    textDecorationLine: "underline",
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  helpText: {
    fontSize: 14,
    color: "#666666",
    flex: 1,
  },
});
