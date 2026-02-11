import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
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
import { API_URL } from "../../config/api";
import { ONBOARDING_COLORS as COLORS } from "./constants";

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
  const [selectedClubs, setSelectedClubs] = useState<ClubSuggestion[]>([]);
  const [suggestions, setSuggestions] = useState<ClubSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search for golf clubs using backend API (fast CSV-based search)
  const searchGolfCourses = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/courses/clubs/search?q=${encodeURIComponent(query)}&limit=15`,
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      if (data.success && data.clubs) {
        const results: ClubSuggestion[] = data.clubs.map((club: any) => ({
          id: club.id,
          name: club.name,
          location: club.location || "USA",
          type: "Public" as Club["type"],
        }));

        // Add manual entry option if query doesn't match exactly
        if (
          results.length === 0 ||
          !results.some((r) => r.name.toLowerCase() === query.toLowerCase())
        ) {
          results.push({
            id: "manual",
            name: query,
            location: "Custom entry",
            type: "Public",
          });
        }

        setSuggestions(results);
      } else {
        setSuggestions([
          {
            id: "manual",
            name: query,
            location: "Custom entry",
            type: "Public",
          },
        ]);
      }
    } catch (error) {
      console.error("Golf course search error:", error);
      setSuggestions([
        {
          id: "manual",
          name: query,
          location: "Custom entry",
          type: "Public",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (text: string): void => {
      setSearchQuery(text);

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
    },
    [searchGolfCourses],
  );

  const handleSelectClub = useCallback((club: ClubSuggestion): void => {
    // Add club to selected clubs if not already added
    setSelectedClubs((prev) => {
      const alreadyExists = prev.some((c) => c.id === club.id);
      if (alreadyExists) return prev;
      return [...prev, club];
    });
    setSearchQuery("");
    setSuggestions([]);
    Keyboard.dismiss();
  }, []);

  const handleRemoveClub = useCallback((clubId: string): void => {
    setSelectedClubs((prev) => prev.filter((c) => c.id !== clubId));
  }, []);

  const handleNext = useCallback((): void => {
    // Send all selected clubs as an array
    const clubsData = selectedClubs.map(club => ({
      id: club.id,
      name: club.name,
      location: club.location,
      type: club.type,
    }));

    // Also send first club for backward compatibility
    const clubData: Club | null = selectedClubs.length > 0
      ? clubsData[0]
      : null;

    onNext({ club: clubData, clubs: clubsData });
  }, [selectedClubs, onNext]);

  const handleSkip = useCallback((): void => {
    onNext({ club: null, clubs: [] });
  }, [onNext]);

  const handleClear = useCallback(() => {
    setSearchQuery("");
    setSuggestions([]);
  }, []);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top > 0 ? 0 : 16 }}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="h-14 flex-row items-center justify-between">
            <TouchableOpacity className="w-10 h-10 justify-center items-start" onPress={onBack}>
              <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
            </TouchableOpacity>
            <TouchableOpacity className="py-2 px-1" onPress={handleSkip}>
              <Text className="text-[15px] font-semibold text-gray-500">Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <ScrollView
            className="flex-1 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-[28px] font-bold text-gray-900 mb-2">Home clubs or memberships</Text>
            <Text className="text-[15px] text-gray-500 leading-[22px] mb-6">
              Tell us the clubs you're part of
            </Text>

            <Text className="text-[13px] font-medium text-gray-500 mb-2">Club search</Text>

            {/* Selected Clubs List */}
            {selectedClubs.length > 0 && (
              <View className="mb-4" style={{ gap: 8 }}>
                {selectedClubs.map((club) => (
                  <View 
                    key={club.id}
                    className="flex-row items-center h-14 bg-white rounded-md border border-gray-200 px-4"
                  >
                    <Ionicons name="golf" size={20} color={COLORS.primary} />
                    <Text className="flex-1 text-base text-gray-900 ml-3">
                      {club.name}, {club.location}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveClub(club.id)}>
                      <X size={20} color={COLORS.textSub} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Search Input with Dropdown */}
            <View style={{ position: 'relative', zIndex: 100 }}>
              <View className="flex-row items-center h-14 bg-white rounded-md border border-gray-200 px-4 gap-3">
                <Ionicons name="search" size={20} color={COLORS.textSub} />
                <TextInput
                  className="flex-1 text-base text-gray-900"
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

              {/* Suggestions Dropdown - appears below input */}
              {suggestions.length > 0 && (
                <View 
                  style={{
                    position: 'absolute',
                    top: 56,
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    backgroundColor: 'white',
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 5,
                    maxHeight: 300,
                    zIndex: 101,
                  }}
                >
                  <ScrollView 
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    {suggestions.map((item, index) => (
                      <TouchableOpacity
                        key={item.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 16,
                          borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                          borderBottomColor: '#F3F4F6',
                          gap: 12,
                        }}
                        onPress={() => handleSelectClub(item)}
                        activeOpacity={0.7}
                      >
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#E8F5E9',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Ionicons name="golf" size={20} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 }}>
                            {item.name}
                          </Text>
                          <Text style={{ fontSize: 14, color: '#6B7280' }}>
                            {item.location} • {item.type}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Add Another Link - Only show if clubs are selected */}
            {selectedClubs.length > 0 && (
              <TouchableOpacity 
                className="mt-4"
                onPress={() => {
                  // Just clear search to allow adding another
                  setSearchQuery("");
                }}
              >
                <Text className="text-[15px] font-semibold text-[#007AFF]">+ Add another</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Bottom Section */}
          <View className="pb-8">
            <TouchableOpacity
              className="h-14 bg-primary rounded-md justify-center items-center"
              onPress={selectedClubs.length > 0 ? handleNext : handleSkip}
              activeOpacity={0.8}
            >
              <Text className="text-base font-semibold text-white">Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
