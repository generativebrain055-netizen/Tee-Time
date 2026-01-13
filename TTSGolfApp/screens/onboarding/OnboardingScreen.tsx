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
import { WelcomePage } from "./WelcomePage";
import { PhoneVerificationPage } from "./PhoneVerificationPage";
import { MagicLinkPage } from "./MagicLinkPage";
import { NamePage } from "./NamePage";
import { EmailPage } from "./EmailPage";
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
  initialLocation?: string;
  initialClub?: string;
  initialHandicap?: string;
  initialPreferences?: OnboardingData["preferences"];
}>;

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  navigation,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [userData, setUserData] = useState<Partial<OnboardingData>>({});

  const currentStep = STEP_ORDER[currentStepIndex];

  const handleNext = (data: Partial<OnboardingData>): void => {
    console.log("OnboardingScreen - handleNext called with data:", data);
    console.log("Current step index:", currentStepIndex);
    console.log("Total steps:", STEP_ORDER.length);

    // Merge new data with existing userData
    setUserData((prev) => ({ ...prev, ...data }));

    // Navigate to next step
    if (currentStepIndex < STEP_ORDER.length - 1) {
      console.log("Moving to next step");
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Complete onboarding
      console.log("Last step reached - completing onboarding");
      completeOnboarding({ ...userData, ...data });
    }
  };

  const handleBack = (): void => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const completeOnboarding = async (
    finalData: Partial<OnboardingData>
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

    // Validate preferences
    if (!finalData.preferences) {
      missingFields.push("Preferences");
    } else {
      if (!finalData.preferences.playerCount) missingFields.push("Preferred player count");
      if (!finalData.preferences.playStyle) missingFields.push("Walk/Ride preference");
      if (!finalData.preferences.preferredTimes || finalData.preferences.preferredTimes.length === 0) {
        missingFields.push("Preferred time of day");
      }
    }

    if (missingFields.length > 0) {
      console.log("Validation failed. Missing fields:", missingFields);
      Alert.alert(
        "Missing Information",
        `Please complete the following fields:\n\n${missingFields.join("\n")}`
      );
      return;
    }

    console.log("Validation passed. Starting registration...");
    setIsRegistering(true);
    try {
      console.log("Registering user directly:", finalData);

      // Generate username from first and last name
      const username = `${finalData.firstName?.toLowerCase()}${finalData.lastName?.toLowerCase()}${Math.floor(
        Math.random() * 1000
      )}`;

      // Map preferences to backend format
      const mapPreferredTime = (times: string[] | undefined): string => {
        if (!times || times.length === 0) return "any";
        const timeMap: Record<string, string> = {
          "morning": "morning",
          "late_morning": "midday",
          "afternoon": "afternoon",
          "evening": "evening",
          "any": "any",
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
          "solo": "solo",
          "twosome": "twosome",
          "threesome": "threesome",
          "foursome": "foursome",
          "any": "any",
        };
        return sizeMap[count] || "any";
      };

      const requestBody = {
        phoneNumber: finalData.phoneNumber,
        firstName: finalData.firstName,
        lastName: finalData.lastName,
        username: username,
        email: finalData.email || null,
        handicap: finalData.handicap ? parseInt(finalData.handicap as string) : null,
        location: finalData.location?.name || null,
        homeCourse: finalData.club?.name || null,
        preferredTeeTime: mapPreferredTime(finalData.preferences?.preferredTimes),
        walkOrRide: finalData.preferences?.playStyle || "either",
        playingPartnerPreference: mapGroupSize(finalData.preferences?.playerCount),
      };

      console.log("Request body:", JSON.stringify(requestBody, null, 2));
      console.log("API endpoint:", API_ENDPOINTS.REGISTER);
      console.log("API_URL from config:", API_URL);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // Register user directly via /auth/register endpoint (passwordless signup)
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to create account");
      }

      console.log("User registered successfully:", data);

      // Show success message and navigate to Login
      Alert.alert(
        "Account Created!",
        "Your account has been created successfully. Please login to continue.",
        [
          {
            text: "Login",
            onPress: () => navigation.navigate("Login"),
          },
        ]
      );
    } catch (error) {
      console.error("Error registering user:", error);

      let errorMessage = "Please try again.";
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timed out. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert(
        "Signup Failed",
        errorMessage
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const getStepComponent = (step: string): StepComponent => {
    switch (step) {
      case ONBOARDING_STEPS.WELCOME:
        return WelcomePage as unknown as StepComponent;
      case ONBOARDING_STEPS.PHONE:
        return PhoneVerificationPage as unknown as StepComponent;
      case ONBOARDING_STEPS.MAGIC_LINK:
        return MagicLinkPage as unknown as StepComponent;
      case ONBOARDING_STEPS.NAME:
        return NamePage as unknown as StepComponent;
      case ONBOARDING_STEPS.EMAIL:
        return EmailPage as unknown as StepComponent;
      case ONBOARDING_STEPS.LOCATION:
        return LocationPage as unknown as StepComponent;
      case ONBOARDING_STEPS.CLUB:
        return ClubPage as unknown as StepComponent;
      case ONBOARDING_STEPS.HANDICAP:
        return HandicapPage as unknown as StepComponent;
      case ONBOARDING_STEPS.PREFERENCES:
        return PreferencesPage as unknown as StepComponent;
      default:
        return WelcomePage as unknown as StepComponent;
    }
  };

  const renderStep = (): React.ReactElement => {
    const StepComponent = getStepComponent(currentStep);

    // Special handling for WelcomePage props
    if (currentStep === ONBOARDING_STEPS.WELCOME) {
      return (
        <View style={styles.stepContainer}>
          <WelcomePage
            onGetStarted={() => handleNext({})}
            onLogin={() => navigation.navigate("Login")}
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
