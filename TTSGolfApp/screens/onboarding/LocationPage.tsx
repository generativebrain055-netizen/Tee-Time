import React, { useState, useCallback, useRef, useMemo } from "react";
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
import { ArrowLeft, Search, X, MapPin } from "lucide-react-native";
import type { LocationPageProps, Location } from "../../types";
import { API_URL } from "../../config/api";
import { ONBOARDING_COLORS as COLORS } from "./constants";

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
  initialZipCode = "",
}) => {
  const insets = useSafeAreaInsets();
  const initialQuery = useMemo(() => {
    const z = (initialZipCode || "").trim();
    return z.length > 0 ? z : initialLocation;
  }, [initialLocation, initialZipCode]);

  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const extractZip = useCallback((value: string): string | undefined => {
    const trimmed = value.trim();
    // supports "92114" or "92114 - San Diego, CA"
    const firstToken = trimmed.split(/\s|-/)[0] || "";
    const digits = firstToken.replace(/\D/g, "");
    if (digits.length === 5) return digits;
    return undefined;
  }, []);

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
      const { logger } = require("../../utils/logger");
      logger.error("[LocationPage] Location search error", error);
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
      // allow typing zip code; keep only digits/spaces/dash/comma/letters
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
      const zip = extractZip(searchQuery);
      setSearchQuery(zip ? `${zip} - ${location.name}` : location.name);
      setSuggestions([]);
      Keyboard.dismiss();
    },
    [extractZip, searchQuery],
  );

  const handleNext = useCallback((): void => {
    const zipCode = extractZip(searchQuery);
    const hasAnyInput = (searchQuery || "").trim().length > 0;
    if (!selectedLocation && !zipCode && !hasAnyInput) return;

    const locationData: Location = selectedLocation
      ? {
          id: selectedLocation.id,
          name: selectedLocation.name,
          description: selectedLocation.description,
        }
      : { name: searchQuery.trim().replace(/^\d{5}\s*-\s*/g, "") };

    onNext({
      zipCode: zipCode ?? undefined,
      location: locationData.name ? locationData : undefined,
    });
  }, [selectedLocation, searchQuery, onNext, extractZip]);

  const handleClear = useCallback(() => {
    setSearchQuery("");
    setSelectedLocation(null);
    setSuggestions([]);
  }, []);

  const isValid = (extractZip(searchQuery) != null) || selectedLocation !== null || searchQuery.trim().length >= 2;

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top > 0 ? 0 : 16 }}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="h-14 flex-row items-center justify-between">
            <TouchableOpacity className="w-10 h-10 justify-center items-start" onPress={onBack}>
              <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNext({ zipCode: undefined, location: undefined })} hitSlop={10}>
              <Text className="text-[15px] font-semibold text-gray-500">Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <ScrollView
            className="flex-1 pt-4"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Text className="text-[28px] font-bold text-gray-900 mb-2">Where are you based?</Text>
            <Text className="text-[13px] font-semibold text-gray-500 mb-2">Zip code</Text>

            {/* Search Input with Dropdown */}
            <View style={{ position: 'relative', zIndex: 1000 }}>
              <View className="flex-row items-center h-14 bg-white rounded-md border border-gray-200 px-4 gap-3">
                <Search size={20} color={COLORS.textSub} />
                <TextInput
                  className="flex-1 text-base text-gray-900"
                  placeholder=" "
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="search"
                  showSoftInputOnFocus
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
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    backgroundColor: 'white',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 5,
                    maxHeight: 300,
                    zIndex: 1001,
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
                        onPress={() => handleSelectLocation(item)}
                        activeOpacity={0.7}
                      >
                        <MapPin size={20} color={COLORS.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 }}>
                            {extractZip(searchQuery) ? `${extractZip(searchQuery)} - ${item.name}` : item.name}
                          </Text>
                          <Text style={{ fontSize: 14, color: '#6B7280' }}>
                            {item.description}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Section */}
          <View className="pb-8">
            <TouchableOpacity
              className={`h-14 bg-primary rounded-md justify-center items-center ${!isValid ? "opacity-60" : ""}`}
              onPress={handleNext}
              disabled={!isValid}
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
