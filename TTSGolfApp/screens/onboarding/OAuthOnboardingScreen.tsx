/**
 * OAuthOnboardingScreen
 * A simplified onboarding flow for OAuth users (Apple/Google Sign-In)
 *
 * This screen collects missing profile information:
 * - First Name / Last Name (if not provided by OAuth provider)
 * - Location (city for finding local courses and golfers)
 * - Home Course (preferred golf club)
 *
 * @module screens/onboarding/OAuthOnboardingScreen
 */

import React, { useState, useCallback, useRef, useMemo } from "react";
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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Search,
  X,
  MapPin,
  CheckCircle,
  User,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  colorTokens,
  spacingTokens,
  typographyTokens,
  borderTokens,
  componentTokens,
} from "../../theme/tokens";
import { API_URL } from "../../config/api";
import { sessionManager } from "../../utils/sessionManager";
import { oauthService, formatOAuthError } from "../../services/oauthService";
import type {
  OAuthOnboardingRouteParams,
  OAuthOnboardingStep,
  OAuthMissingField,
  ProfileCompletionPayload,
} from "../../types/oauth";

// ============================================================================
// Types
// ============================================================================

interface OAuthOnboardingProps {
  navigation: {
    replace: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
  route?: {
    params?: OAuthOnboardingRouteParams;
  };
}

interface LocationSuggestion {
  id: string;
  name: string;
  description: string;
  type: "city" | "club";
}

interface ClubSuggestion {
  id: string;
  name: string;
  location: string;
  type: string;
}

// ============================================================================
// Constants
// ============================================================================

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const MAX_SUGGESTIONS = 15;

// ============================================================================
// Hooks
// ============================================================================

/**
 * Custom hook for debounced search functionality
 */
function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  debounceMs: number = SEARCH_DEBOUNCE_MS,
) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(
    (text: string) => {
      setQuery(text);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (text.length < MIN_SEARCH_LENGTH) {
        setResults([]);
        return;
      }

      timeoutRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const data = await searchFn(text);
          setResults(data);
        } catch (error) {
          console.error("[Search] Error:", error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [searchFn, debounceMs],
  );

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return { query, results, isLoading, search, clear, setQuery };
}

// ============================================================================
// API Functions
// ============================================================================

async function searchCities(query: string): Promise<LocationSuggestion[]> {
  try {
    const response = await fetch(
      `${API_URL}/api/courses/cities/search?q=${encodeURIComponent(query)}&limit=${MAX_SUGGESTIONS}`,
    );

    if (!response.ok) throw new Error("Search failed");

    const data = await response.json();

    const results: LocationSuggestion[] = (data.cities || []).map(
      (city: { id: string; name: string }) => ({
        id: city.id,
        name: city.name,
        description: "United States",
        type: "city" as const,
      }),
    );

    // Add manual entry option if no exact match
    const hasExactMatch = results.some(
      (r) => r.name.toLowerCase() === query.toLowerCase(),
    );

    if (!hasExactMatch) {
      results.push({
        id: "manual",
        name: query,
        description: "Use this location",
        type: "city",
      });
    }

    return results;
  } catch {
    return [
      {
        id: "manual",
        name: query,
        description: "Use this location",
        type: "city",
      },
    ];
  }
}

async function searchClubs(query: string): Promise<ClubSuggestion[]> {
  try {
    const response = await fetch(
      `${API_URL}/api/courses/clubs/search?q=${encodeURIComponent(query)}&limit=${MAX_SUGGESTIONS}`,
    );

    if (!response.ok) throw new Error("Search failed");

    const data = await response.json();

    const results: ClubSuggestion[] = (data.clubs || []).map(
      (club: { id: string; name: string; location?: string }) => ({
        id: club.id,
        name: club.name,
        location: club.location || "USA",
        type: "Public",
      }),
    );

    // Add manual entry option if no exact match
    const hasExactMatch = results.some(
      (r) => r.name.toLowerCase() === query.toLowerCase(),
    );

    if (!hasExactMatch) {
      results.push({
        id: "manual",
        name: query,
        location: "Custom entry",
        type: "Public",
      });
    }

    return results;
  } catch {
    return [
      {
        id: "manual",
        name: query,
        location: "Custom entry",
        type: "Public",
      },
    ];
  }
}

// ============================================================================
// Component
// ============================================================================

export function OAuthOnboardingScreen({
  navigation,
  route,
}: OAuthOnboardingProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const oauthData = route?.params?.oauthData;

  // Determine required steps based on missing fields
  const missingFields = useMemo<OAuthMissingField[]>(
    () => oauthData?.missingFields || [],
    [oauthData],
  );

  const needsName = useMemo(
    () =>
      missingFields.includes("firstName") || missingFields.includes("lastName"),
    [missingFields],
  );

  const needsLocation = useMemo(
    () => missingFields.includes("location"),
    [missingFields],
  );

  const needsClub = useMemo(
    () => missingFields.includes("homeCourse"),
    [missingFields],
  );

  // Build step order
  const steps = useMemo<OAuthOnboardingStep[]>(() => {
    const stepList: OAuthOnboardingStep[] = [];
    if (needsName) stepList.push("name");
    if (needsLocation) stepList.push("location");
    if (needsClub) stepList.push("club");
    stepList.push("complete");
    return stepList;
  }, [needsName, needsLocation, needsClub]);

  // State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstName, setFirstName] = useState(oauthData?.user?.firstName || "");
  const [lastName, setLastName] = useState(oauthData?.user?.lastName || "");
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [selectedClub, setSelectedClub] = useState<ClubSuggestion | null>(null);

  // Search hooks
  const locationSearch = useDebouncedSearch(searchCities);
  const clubSearch = useDebouncedSearch(searchClubs);

  // Derived state
  const currentStep = steps[currentStepIndex];
  const progress = (currentStepIndex + 1) / steps.length;
  const isLastStep = currentStep === "complete";
  const canSkip = currentStep === "location" || currentStep === "club";

  // Handlers
  const handleNext = useCallback(() => {
    if (currentStep === "name") {
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert(
          "Required",
          "Please enter both your first and last name to continue.",
        );
        return;
      }
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStep, currentStepIndex, firstName, lastName, steps.length]);

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSkip = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex, steps.length]);

  const handleSelectLocation = useCallback(
    (location: LocationSuggestion) => {
      setSelectedLocation(location);
      locationSearch.setQuery(location.name);
      locationSearch.clear();
      Keyboard.dismiss();
    },
    [locationSearch],
  );

  const handleSelectClub = useCallback(
    (club: ClubSuggestion) => {
      setSelectedClub(club);
      clubSearch.setQuery(club.name);
      clubSearch.clear();
      Keyboard.dismiss();
    },
    [clubSearch],
  );

  const handleComplete = useCallback(async () => {
    if (isSubmitting || !oauthData) return;

    setIsSubmitting(true);

    try {
      const payload: ProfileCompletionPayload = {};

      if (needsName) {
        payload.firstName = firstName.trim();
        payload.lastName = lastName.trim();
      }

      if (selectedLocation) {
        payload.location = selectedLocation.name;
      }

      if (selectedClub) {
        payload.homeCourse = selectedClub.name;
      }

      const response = await oauthService.completeOAuthProfile(
        payload,
        oauthData.accessToken,
      );

      // Update session with new user data
      await sessionManager.saveSession({
        accessToken: oauthData.accessToken,
        refreshToken: oauthData.refreshToken,
        user: response.user,
      });

      navigation.replace("Home", { user: response.user });
    } catch (error) {
      console.error("[OAuthOnboarding] Profile completion error:", error);
      Alert.alert("Error", formatOAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    oauthData,
    needsName,
    firstName,
    lastName,
    selectedLocation,
    selectedClub,
    navigation,
  ]);

  const handleSkipAll = useCallback(async () => {
    if (!oauthData) return;

    await sessionManager.saveSession({
      accessToken: oauthData.accessToken,
      refreshToken: oauthData.refreshToken,
      user: oauthData.user,
    });

    navigation.replace("Home", { user: oauthData.user });
  }, [oauthData, navigation]);

  // Render helpers
  const renderNameStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <User
          size={componentTokens.icon.size.xl}
          color={colorTokens.brand.primary}
        />
      </View>

      <Text style={styles.title}>What's your name?</Text>
      <Text style={styles.subtitle}>Help other golfers know who you are</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor={colorTokens.text.placeholder}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor={colorTokens.text.placeholder}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <MapPin
          size={componentTokens.icon.size.xl}
          color={colorTokens.brand.primary}
        />
      </View>

      <Text style={styles.title}>Where do you play?</Text>
      <Text style={styles.subtitle}>Find golfers and courses near you</Text>

      <View style={styles.searchContainer}>
        <Search
          size={componentTokens.icon.size.sm}
          color={colorTokens.text.placeholder}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search city..."
          placeholderTextColor={colorTokens.text.placeholder}
          value={locationSearch.query}
          onChangeText={locationSearch.search}
          autoCapitalize="words"
        />
        {locationSearch.query.length > 0 && (
          <TouchableOpacity onPress={locationSearch.clear}>
            <X
              size={componentTokens.icon.size.sm}
              color={colorTokens.text.placeholder}
            />
          </TouchableOpacity>
        )}
      </View>

      {locationSearch.isLoading && (
        <ActivityIndicator
          style={styles.loader}
          size="small"
          color={colorTokens.brand.primary}
        />
      )}

      {selectedLocation && (
        <View style={styles.selectedItem}>
          <CheckCircle
            size={componentTokens.icon.size.sm}
            color={colorTokens.brand.primary}
          />
          <Text style={styles.selectedText}>{selectedLocation.name}</Text>
        </View>
      )}

      <ScrollView
        style={styles.suggestionsList}
        keyboardShouldPersistTaps="handled"
      >
        {locationSearch.results.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.suggestionItem}
            onPress={() => handleSelectLocation(item)}
          >
            <MapPin size={18} color={colorTokens.text.secondary} />
            <View style={styles.suggestionTextContainer}>
              <Text style={styles.suggestionName}>{item.name}</Text>
              <Text style={styles.suggestionDescription}>
                {item.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderClubStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="golf-outline"
          size={componentTokens.icon.size.xl}
          color={colorTokens.brand.primary}
        />
      </View>

      <Text style={styles.title}>What's your home course?</Text>
      <Text style={styles.subtitle}>Find your favorite golf club</Text>

      <View style={styles.searchContainer}>
        <Search
          size={componentTokens.icon.size.sm}
          color={colorTokens.text.placeholder}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search golf clubs..."
          placeholderTextColor={colorTokens.text.placeholder}
          value={clubSearch.query}
          onChangeText={clubSearch.search}
          autoCapitalize="words"
        />
        {clubSearch.query.length > 0 && (
          <TouchableOpacity onPress={clubSearch.clear}>
            <X
              size={componentTokens.icon.size.sm}
              color={colorTokens.text.placeholder}
            />
          </TouchableOpacity>
        )}
      </View>

      {clubSearch.isLoading && (
        <ActivityIndicator
          style={styles.loader}
          size="small"
          color={colorTokens.brand.primary}
        />
      )}

      {selectedClub && (
        <View style={styles.selectedItem}>
          <CheckCircle
            size={componentTokens.icon.size.sm}
            color={colorTokens.brand.primary}
          />
          <Text style={styles.selectedText}>{selectedClub.name}</Text>
        </View>
      )}

      <ScrollView
        style={styles.suggestionsList}
        keyboardShouldPersistTaps="handled"
      >
        {clubSearch.results.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.suggestionItem}
            onPress={() => handleSelectClub(item)}
          >
            <Ionicons
              name="golf-outline"
              size={18}
              color={colorTokens.text.secondary}
            />
            <View style={styles.suggestionTextContainer}>
              <Text style={styles.suggestionName}>{item.name}</Text>
              <Text style={styles.suggestionDescription}>{item.location}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <CheckCircle size={64} color={colorTokens.brand.primary} />
      </View>

      <Text style={styles.title}>You're all set!</Text>
      <Text style={styles.subtitle}>Let's get you on the course</Text>

      <View style={styles.summaryContainer}>
        {firstName && lastName && (
          <View style={styles.summaryItem}>
            <User
              size={componentTokens.icon.size.sm}
              color={colorTokens.text.secondary}
            />
            <Text style={styles.summaryText}>
              {firstName} {lastName}
            </Text>
          </View>
        )}
        {selectedLocation && (
          <View style={styles.summaryItem}>
            <MapPin
              size={componentTokens.icon.size.sm}
              color={colorTokens.text.secondary}
            />
            <Text style={styles.summaryText}>{selectedLocation.name}</Text>
          </View>
        )}
        {selectedClub && (
          <View style={styles.summaryItem}>
            <Ionicons
              name="golf-outline"
              size={componentTokens.icon.size.sm}
              color={colorTokens.text.secondary}
            />
            <Text style={styles.summaryText}>{selectedClub.name}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "name":
        return renderNameStep();
      case "location":
        return renderLocationStep();
      case "club":
        return renderClubStep();
      case "complete":
        return renderCompleteStep();
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        {currentStepIndex > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={colorTokens.text.primary} />
          </TouchableOpacity>
        )}

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStepIndex + 1} of {steps.length}
          </Text>
        </View>

        <TouchableOpacity style={styles.skipAllButton} onPress={handleSkipAll}>
          <Text style={styles.skipAllText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {renderCurrentStep()}
      </KeyboardAvoidingView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacingTokens.lg },
        ]}
      >
        {canSkip && !isLastStep && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, isSubmitting && styles.nextButtonDisabled]}
          onPress={isLastStep ? handleComplete : handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colorTokens.neutral.white} />
          ) : (
            <Text style={styles.nextButtonText}>
              {isLastStep ? "Get Started" : "Continue"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorTokens.neutral.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacingTokens.lg,
    paddingVertical: spacingTokens.md,
  },
  backButton: {
    padding: spacingTokens.sm,
    marginRight: spacingTokens.sm,
  },
  progressContainer: {
    flex: 1,
    alignItems: "center",
  },
  progressBar: {
    height: 4,
    width: "100%",
    backgroundColor: colorTokens.neutral.outline,
    borderRadius: borderTokens.radius.xs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colorTokens.brand.primary,
    borderRadius: borderTokens.radius.xs,
  },
  progressText: {
    fontSize: typographyTokens.fontSize.xs,
    color: colorTokens.text.secondary,
    marginTop: spacingTokens.xs,
  },
  skipAllButton: {
    padding: spacingTokens.sm,
    marginLeft: spacingTokens.sm,
  },
  skipAllText: {
    fontSize: typographyTokens.fontSize.sm,
    color: colorTokens.text.secondary,
    fontWeight: typographyTokens.fontWeight.medium,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: spacingTokens.xxl,
    paddingTop: spacingTokens.xxl,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: spacingTokens.xxl,
  },
  title: {
    fontSize: typographyTokens.fontSize.xxxl,
    fontWeight: typographyTokens.fontWeight.bold,
    color: colorTokens.text.primary,
    textAlign: "center",
    marginBottom: spacingTokens.sm,
  },
  subtitle: {
    fontSize: typographyTokens.fontSize.md,
    color: colorTokens.text.secondary,
    textAlign: "center",
    marginBottom: spacingTokens.xxxl,
  },
  inputContainer: {
    marginBottom: spacingTokens.lg,
  },
  input: {
    borderWidth: borderTokens.width.thin,
    borderColor: colorTokens.neutral.outline,
    borderRadius: borderTokens.radius.md,
    paddingHorizontal: spacingTokens.lg,
    paddingVertical: componentTokens.input.paddingVertical,
    fontSize: typographyTokens.fontSize.md,
    color: colorTokens.text.primary,
    backgroundColor: colorTokens.neutral.surface,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: borderTokens.width.thin,
    borderColor: colorTokens.neutral.outline,
    borderRadius: borderTokens.radius.md,
    paddingHorizontal: spacingTokens.lg,
    paddingVertical: spacingTokens.md,
    backgroundColor: colorTokens.neutral.surface,
    marginBottom: spacingTokens.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacingTokens.md,
    fontSize: typographyTokens.fontSize.md,
    color: colorTokens.text.primary,
  },
  loader: {
    marginVertical: spacingTokens.sm,
  },
  selectedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colorTokens.brand.primaryLight,
    padding: spacingTokens.md,
    borderRadius: borderTokens.radius.sm,
    marginBottom: spacingTokens.lg,
  },
  selectedText: {
    marginLeft: spacingTokens.sm,
    fontSize: typographyTokens.fontSize.md,
    color: colorTokens.brand.primary,
    fontWeight: typographyTokens.fontWeight.semibold,
  },
  suggestionsList: {
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacingTokens.md,
    borderBottomWidth: borderTokens.width.thin,
    borderBottomColor: colorTokens.neutral.outline,
  },
  suggestionTextContainer: {
    marginLeft: spacingTokens.md,
    flex: 1,
  },
  suggestionName: {
    fontSize: typographyTokens.fontSize.md,
    color: colorTokens.text.primary,
    fontWeight: typographyTokens.fontWeight.medium,
  },
  suggestionDescription: {
    fontSize: typographyTokens.fontSize.sm,
    color: colorTokens.text.secondary,
    marginTop: 2,
  },
  summaryContainer: {
    backgroundColor: colorTokens.neutral.surface,
    borderRadius: borderTokens.radius.md,
    padding: spacingTokens.lg,
    marginTop: spacingTokens.lg,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacingTokens.md,
    borderBottomWidth: borderTokens.width.thin,
    borderBottomColor: colorTokens.neutral.outline,
  },
  summaryText: {
    marginLeft: spacingTokens.md,
    fontSize: typographyTokens.fontSize.md,
    color: colorTokens.text.primary,
  },
  footer: {
    paddingHorizontal: spacingTokens.xxl,
    paddingTop: spacingTokens.lg,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: spacingTokens.md,
    marginBottom: spacingTokens.sm,
  },
  skipButtonText: {
    fontSize: typographyTokens.fontSize.md,
    color: colorTokens.text.secondary,
    fontWeight: typographyTokens.fontWeight.medium,
  },
  nextButton: {
    backgroundColor: colorTokens.brand.primary,
    borderRadius: borderTokens.radius.md,
    paddingVertical: spacingTokens.lg,
    alignItems: "center",
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: colorTokens.neutral.white,
    fontSize: typographyTokens.fontSize.lg,
    fontWeight: typographyTokens.fontWeight.semibold,
  },
});

// ============================================================================
// Exports
// ============================================================================

export default OAuthOnboardingScreen;
