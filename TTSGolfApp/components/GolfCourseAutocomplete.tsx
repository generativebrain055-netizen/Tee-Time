import React, { useState, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { MapPin, X, Check } from "lucide-react-native";
import { COLORS } from "../constants/colors";
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
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <MapPin size={20} color={COLORS.textSub} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSub}
          value={query}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color={COLORS.textSub} />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={styles.suggestionItem}
              onPress={() => handleSelectCourse(course)}
              activeOpacity={0.7}
            >
              <View style={styles.courseIcon}>
                <MapPin size={16} color={COLORS.primary} />
              </View>
              <View style={styles.courseInfo}>
                <Text style={styles.courseName} numberOfLines={1}>
                  {course.name}
                </Text>
                <Text style={styles.courseLocation} numberOfLines={1}>
                  {course.location}
                </Text>
              </View>
              {course.id === "manual" && (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>Custom</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default memo(GolfCourseAutocomplete);

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
    padding: 0,
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 280,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  courseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  courseLocation: {
    fontSize: 13,
    color: "#6B7280",
  },
  customBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  customBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
});
