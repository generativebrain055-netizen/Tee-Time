import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  Alert,
  ActivityIndicator,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { colors } from "../../theme";
import { ONBOARDING_STEPS, STEP_ORDER } from "../../constants/onboarding";
import { API_ENDPOINTS, API_URL } from "../../config/api";
import type { OnboardingData } from "../../types";

// Import all step components
import { SignUpOptionsPage } from "./SignUpOptionsPage";
import { PhoneVerificationPage } from "./PhoneVerificationPage";
import { MagicLinkPage } from "./MagicLinkPage";
import { NamePage } from "./NamePage";
import { EmailPage } from "./EmailPage";
import { PhotoZipPage } from "./PhotoZipPage";
import { LocationPage } from "./LocationPage";
import { ClubPage } from "./ClubPage";
import { HandicapPage } from "./HandicapPage";
import { PreferencesPage } from "./PreferencesPage";

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
  HomePage: undefined;
  Home: { user: any };
};

type OnboardingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Onboarding"
>;

interface OnboardingScreenProps {
  navigation: OnboardingScreenNavigationProp;
  route?: {
    params?: {
      oauthData?: {
        tempToken?: string;
        requiredFields?: string[];
        email?: string;
        firstName?: string;
        lastName?: string;
        picture?: string;
        authProvider?: "google" | "apple";
      };
    };
  };
}

interface Styles {
  container: ViewStyle;
  progressBarContainer: ViewStyle;
  progressBar: ViewStyle;
  stepContainer: ViewStyle;
}

type StepComponent = React.FC<{
  onNext: (data: Partial<OnboardingData>) => void;
  onBack?: () => void;
  onGetStarted?: () => void;
  onLogin?: () => void;
  initialPhone?: string;
  initialData?: OnboardingData;
  initialEmail?: string;
  initialProfilePhotoUri?: string;
  initialZipCode?: string;
  initialLocation?: string;
  initialClub?: string;
  initialHandicap?: string;
  initialPreferences?: OnboardingData["preferences"];
}>;

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  navigation,
  route,
}) => {
  const oauthData = route?.params?.oauthData;

  // Debug logging
  console.log("OnboardingScreen - Mounted");
  console.log(
    "OnboardingScreen - Route params:",
    JSON.stringify(route?.params, null, 2),
  );
  console.log(
    "OnboardingScreen - OAuth data:",
    JSON.stringify(oauthData, null, 2),
  );

  // Determine starting step for OAuth users
  const getInitialStepIndex = () => {
    if (!oauthData) return 0; // Start at signup options for non-OAuth
    // OAuth: skip signup options, go to phone (step 1)
    console.log(
      "OnboardingScreen - OAuth user detected, starting at step 1 (Phone)",
    );
    return 1;
  };

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(
    getInitialStepIndex(),
  );
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [userData, setUserData] = useState<Partial<OnboardingData>>({
    email: oauthData?.email || undefined,
    firstName: oauthData?.firstName || undefined,
    lastName: oauthData?.lastName || undefined,
  });

  const currentStep = STEP_ORDER[currentStepIndex];

  const handleNext = (data: Partial<OnboardingData>): void => {
    console.log("OnboardingScreen - handleNext called with data:", data);
    console.log("Current step index:", currentStepIndex);
    console.log("Total steps:", STEP_ORDER.length);

    // Merge new data with existing userData
    setUserData((prev) => ({ ...prev, ...data }));

    // Calculate next step index
    let nextStepIndex = currentStepIndex + 1;

    // From SignUpOptionsPage: user chose phone, skip standalone PHONE step
    if (
      currentStep === ONBOARDING_STEPS.SIGNUP_OPTIONS &&
      data.phoneNumber &&
      STEP_ORDER[nextStepIndex] === ONBOARDING_STEPS.PHONE
    ) {
      console.log("SignUpOptionsPage - skipping PHONE step, going to MAGIC_LINK");
      nextStepIndex++;
    }

    // For OAuth users, skip the magic link step (they're already authenticated)
    if (
      oauthData?.tempToken &&
      STEP_ORDER[nextStepIndex] === ONBOARDING_STEPS.MAGIC_LINK
    ) {
      console.log("OAuth user - skipping magic link step");
      nextStepIndex++;
    }

    // For OAuth users with email, skip the email step
    if (
      oauthData?.email &&
      STEP_ORDER[nextStepIndex] === ONBOARDING_STEPS.EMAIL
    ) {
      console.log("OAuth user with email - skipping email step");
      nextStepIndex++;
    }

    // Navigate to next step
    if (nextStepIndex < STEP_ORDER.length) {
      console.log("Moving to step index:", nextStepIndex);
      setCurrentStepIndex(nextStepIndex);
    } else {
      // Complete onboarding
      console.log("Last step reached - completing onboarding");
      completeOnboarding({ ...userData, ...data });
    }
  };

  const handleBack = (): void => {
    if (currentStepIndex === 0) {
      // Sign up w/SSO: back goes to Gateway (Welcome) screen
      navigation.replace("Welcome");
    } else {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const completeOnboarding = async (
    finalData: Partial<OnboardingData>,
  ): Promise<void> => {
    console.log("completeOnboarding called with data:", finalData);

    if (isRegistering) {
      console.log("Already registering, skipping...");
      return;
    }

    // Validate required fields
    const missingFields: string[] = [];

    if (!finalData.phoneNumber) missingFields.push("Phone number");
    if (!finalData.firstName?.trim()) missingFields.push("First name");
    if (!finalData.lastName?.trim()) missingFields.push("Last name");

    // Only validate preferences for non-OAuth flow
    // OAuth users can complete preferences later
    if (!oauthData?.tempToken) {
      // Validate preferences for regular signup
      if (!finalData.preferences) {
        missingFields.push("Preferences");
      } else {
        if (!finalData.preferences.playerCount)
          missingFields.push("Preferred player count");
        if (!finalData.preferences.playStyle)
          missingFields.push("Walk/Ride preference");
        if (
          !finalData.preferences.preferredTimes ||
          finalData.preferences.preferredTimes.length === 0
        ) {
          missingFields.push("Preferred time of day");
        }
      }
    }

    if (missingFields.length > 0) {
      console.log("Validation failed. Missing fields:", missingFields);
      Alert.alert(
        "Missing Information",
        `Please complete the following fields:\n\n${missingFields.join("\n")}`,
      );
      return;
    }

    console.log("Validation passed. Starting registration...");
    setIsRegistering(true);
    try {
      console.log("Registering user directly:", finalData);

      // Generate username from first and last name
      const username = `${finalData.firstName?.toLowerCase()}${finalData.lastName?.toLowerCase()}${Math.floor(
        Math.random() * 1000,
      )}`;

      // Map preferences to backend format
      const mapPreferredTime = (times: string[] | undefined): string => {
        if (!times || times.length === 0) return "any";
        const timeMap: Record<string, string> = {
          morning: "morning",
          late_morning: "midday",
          afternoon: "afternoon",
          evening: "evening",
          any: "any",
        };
        // Use first time preference or "any"
        return timeMap[times[0]] || "any";
      };

      const mapGroupSize = (count: string | undefined): string => {
        if (!count) return "any";
        const sizeMap: Record<string, string> = {
          "1": "solo",
          "2": "twosome",
          "3": "threesome",
          "4": "foursome",
          solo: "solo",
          twosome: "twosome",
          threesome: "threesome",
          foursome: "foursome",
          any: "any",
        };
        return sizeMap[count] || "any";
      };

      const requestBody = {
        phoneNumber: finalData.phoneNumber,
        firstName: finalData.firstName,
        lastName: finalData.lastName,
        username: username,
        email: finalData.email || null,
        zipCode: finalData.zipCode || null,
        profilePhotoBase64: finalData.profilePhotoBase64 || null,
        handicap: finalData.handicap
          ? parseInt(finalData.handicap as string)
          : null,
        location: finalData.location?.name || null,
        homeCourse: finalData.club?.name || null,
        preferredTeeTime: mapPreferredTime(
          finalData.preferences?.preferredTimes,
        ),
        walkOrRide: finalData.preferences?.playStyle || "either",
        playingPartnerPreference: mapGroupSize(
          finalData.preferences?.playerCount,
        ),
      };

      console.log("Request body:", JSON.stringify(requestBody, null, 2));
      console.log("API endpoint:", API_ENDPOINTS.REGISTER);
      console.log("API_URL from config:", API_URL);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let response;

      // Check if this is OAuth registration (has tempToken)
      if (oauthData?.tempToken) {
        console.log("Completing OAuth registration with tempToken");

        // Ensure we have firstName/lastName - use user input or OAuth data
        const firstName =
          finalData.firstName?.trim() || oauthData.firstName || null;
        const lastName =
          finalData.lastName?.trim() || oauthData.lastName || null;

        // Validate and clean email
        let email = finalData.email?.trim() || oauthData.email || null;

        // Basic email validation - if invalid, set to null
        if (email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            console.log("Invalid email format, setting to null:", email);
            email = null;
          }
        }

        console.log("Resolved names:", { firstName, lastName, email });

        if (!firstName || !lastName) {
          Alert.alert(
            "Missing Information",
            "First name and last name are required. Please go back and fill them in.",
          );
          setIsRegistering(false);
          return;
        }

        const oauthRequestBody = {
          tempToken: oauthData.tempToken,
          phoneNumber: finalData.phoneNumber,
          email: email,
          firstName: firstName,
          lastName: lastName,
          username: username,
          zipCode: finalData.zipCode || null,
          profilePhotoBase64: finalData.profilePhotoBase64 || null,
          handicap: finalData.handicap
            ? parseInt(finalData.handicap as string)
            : null,
        };

        console.log(
          "OAuth request body:",
          JSON.stringify(oauthRequestBody, null, 2),
        );

        response = await fetch(`${API_URL}/auth/complete-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(oauthRequestBody),
          signal: controller.signal,
        });
      } else {
        // Regular registration
        response = await fetch(API_ENDPOINTS.REGISTER, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      let data;
      try {
        const responseText = await response.text();
        console.log("Response body:", responseText);
        data = JSON.parse(responseText);
        console.log("Response data:", data);
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        throw new Error("Invalid response from server. Please try again.");
      }

      if (!response.ok) {
        // Extract detailed error information
        let errorMessage = "Failed to create account";
        let errorDetails = "";

        if (data.details && typeof data.details === 'object') {
          // Format validation errors
          const detailMessages = Object.entries(data.details)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n');
          errorDetails = detailMessages;
          errorMessage = data.message || "Validation failed";
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        }

        console.error("Server error:", { errorMessage, errorDetails, fullData: data });

        // Show user-friendly error
        const displayMessage = errorDetails
          ? `${errorMessage}\n\n${errorDetails}`
          : errorMessage;

        throw new Error(displayMessage);
      }

      console.log("User registered successfully:", data);

      // If OAuth registration (status: authenticated), save session and go to Home
      if (data.status === "authenticated" && data.accessToken) {
        const { sessionManager } = await import("../../utils/sessionManager");
        await sessionManager.saveSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });

        console.log("OAuth registration complete - navigating to Home");

        // Navigate immediately to Home, show welcome toast after
        navigation.replace("Home", { user: data.user });

        // Show non-blocking success message after navigation
        setTimeout(() => {
          Alert.alert(
            "Welcome!",
            "Your account has been created successfully.",
          );
        }, 500);
        return;
      }

      // Show success message and navigate to Login
      Alert.alert(
        "Account Created!",
        "Your account has been created successfully. Please login to continue.",
        [
          {
            text: "Login",
            onPress: () => navigation.navigate("Login"),
          },
        ],
      );
    } catch (error) {
      console.error("Error registering user:", error);
      console.error("Error type:", typeof error);
      console.error("Error string:", String(error));
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      } else {
        console.error(
          "Non-Error object thrown:",
          JSON.stringify(error, null, 2),
        );
      }

      let errorMessage = "Please try again.";
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage =
            "Request timed out. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        // Try to extract error message from object
        const err = error as any;
        errorMessage =
          err.error || err.message || "An unexpected error occurred";
      }

      Alert.alert("Signup Failed", errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const getStepComponent = (step: string): StepComponent => {
    switch (step) {
      case ONBOARDING_STEPS.SIGNUP_OPTIONS:
        return SignUpOptionsPage as unknown as StepComponent;
      case ONBOARDING_STEPS.PHONE:
        return PhoneVerificationPage as unknown as StepComponent;
      case ONBOARDING_STEPS.MAGIC_LINK:
        return MagicLinkPage as unknown as StepComponent;
      case ONBOARDING_STEPS.NAME:
        return NamePage as unknown as StepComponent;
      case ONBOARDING_STEPS.EMAIL:
        return EmailPage as unknown as StepComponent;
      case ONBOARDING_STEPS.PHOTO_ZIP:
        return PhotoZipPage as unknown as StepComponent;
      case ONBOARDING_STEPS.LOCATION:
        return LocationPage as unknown as StepComponent;
      case ONBOARDING_STEPS.CLUB:
        return ClubPage as unknown as StepComponent;
      case ONBOARDING_STEPS.HANDICAP:
        return HandicapPage as unknown as StepComponent;
      case ONBOARDING_STEPS.PREFERENCES:
        return PreferencesPage as unknown as StepComponent;
      default:
        return SignUpOptionsPage as unknown as StepComponent;
    }
  };

  const handleOAuthSuccess = (data: any) => {
    if (data.needsOnboarding && data.oauthData) {
      navigation.navigate("OAuthOnboarding", {
        oauthData: data.oauthData,
      });
    } else if (data.isNewUser && data.partialData) {
      navigation.navigate("Onboarding", {
        oauthData: data.partialData,
      });
    } else {
      navigation.replace("Home");
    }
  };

  const renderStep = (): React.ReactElement => {
    const StepComponent = getStepComponent(currentStep);

    // Special handling for SignUpOptionsPage - needs onOAuthSuccess
    if (currentStep === ONBOARDING_STEPS.SIGNUP_OPTIONS) {
      return (
        <View style={styles.stepContainer}>
          <SignUpOptionsPage
            onNext={handleNext}
            onBack={handleBack}
            onOAuthSuccess={handleOAuthSuccess}
          />
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <StepComponent
          onNext={handleNext}
          onBack={handleBack}
          initialPhone={userData.phoneNumber}
          initialData={userData as OnboardingData}
          initialEmail={userData.email}
          initialProfilePhotoUri={userData.profilePhotoUri}
          initialZipCode={userData.zipCode}
          initialLocation={userData.location?.name}
          initialClub={userData.club?.name}
          initialHandicap={userData.handicap?.toString() || ""}
          initialPreferences={userData.preferences}
        />
      </View>
    );
  };

  // Progress indicator
  const progressPercentage = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Progress Bar */}
      {currentStepIndex > 0 && (
        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBar, { width: `${progressPercentage}%` }]}
          />
        </View>
      )}

      {/* Step Content */}
      {renderStep()}

      {/* Loading Overlay */}
      {isRegistering && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Creating your account...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.surface,
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  stepContainer: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMain,
  },
});
