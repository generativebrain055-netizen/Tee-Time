import React, { useState, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { MapPin, X, Check } from "lucide-react-native";
import { useColors } from "../ui/theme";
import { API_URL } from "../config/api";

export interface GolfCourse {
  id: string;
  name: string;
  location: string;
  fullAddress?: string;
}

interface GolfCourseAutocompleteProps {
  value: string;
  onSelect: (course: GolfCourse) => void;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  style?: any;
}

function GolfCourseAutocomplete({
  value,
  onSelect,
  onChangeText,
  placeholder = "Search golf courses...",
  style,
}: GolfCourseAutocompleteProps) {
  const colors = useColors();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GolfCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search for golf clubs using backend API (fast CSV-based search)
  const searchGolfCourses = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/courses/clubs/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      if (data.success && data.clubs) {
        const results: GolfCourse[] = data.clubs.map((club: any) => ({
          id: club.id,
          name: club.name,
          location: club.location || "USA",
          fullAddress: club.address
            ? `${club.address}, ${club.location}`
            : club.location,
        }));

        // Add manual entry option if no exact match
        if (
          results.length === 0 ||
          !results.some(
            (r) => r.name.toLowerCase() === searchQuery.toLowerCase(),
          )
        ) {
          results.push({
            id: "manual",
            name: searchQuery,
            location: "Custom entry",
            fullAddress: searchQuery,
          });
        }

        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        setSuggestions([
          {
            id: "manual",
            name: searchQuery,
            location: "Custom entry",
            fullAddress: searchQuery,
          },
        ]);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Golf course search error:", error);
      setSuggestions([
        {
          id: "manual",
          name: searchQuery,
          location: "Custom entry",
          fullAddress: searchQuery,
        },
      ]);
      setShowSuggestions(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      onChangeText?.(text);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (text.length >= 2) {
        searchTimeoutRef.current = setTimeout(() => {
          searchGolfCourses(text);
        }, 300);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [searchGolfCourses, onChangeText],
  );

  const handleSelectCourse = useCallback(
    (course: GolfCourse) => {
      setQuery(course.name);
      setSuggestions([]);
      setShowSuggestions(false);
      onSelect(course);
      Keyboard.dismiss();
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    onChangeText?.("");
  }, [onChangeText]);

  const handleFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length]);

  return (
    <View className="relative z-[100]" style={style}>
      {/* Input field and dropdown as one container */}
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
      }}>
        {/* Input Field */}
        <View className="flex-row items-center px-4 py-4 gap-3">
          <TextInput
            className="flex-1 text-base text-text-primary p-0"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: '#1F2937' }}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
          />
          {loading && <ActivityIndicator size="small" color="#22C55E" />}
          {query.length > 0 && !loading && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <X size={14} color="#6B7280" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown Suggestions - attached to input */}
        {showSuggestions && suggestions.length > 0 && (
          <View>
            {/* Separator line */}
            <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />
            
            {/* Suggestions list */}
            {suggestions.slice(0, 3).map((course, index) => (
              <TouchableOpacity
                key={course.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  gap: 12,
                  borderBottomWidth: index < Math.min(suggestions.length, 3) - 1 ? 1 : 0,
                  borderBottomColor: '#F3F4F6',
                }}
                onPress={() => handleSelectCourse(course)}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: '#F3F4F6',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <MapPin size={20} color="#6B7280" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 16,
                    color: '#111827',
                    marginBottom: 2,
                  }} numberOfLines={1}>
                    {course.name}
                  </Text>
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: '#6B7280',
                  }} numberOfLines={1}>
                    {course.location}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export default memo(GolfCourseAutocomplete);
