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
import { API_ENDPOINTS } from "../../config/api";
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
    // Merge new data with existing userData
    setUserData((prev) => ({ ...prev, ...data }));

    // Navigate to next step
    if (currentStepIndex < STEP_ORDER.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Complete onboarding
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
    if (isRegistering) return;

    setIsRegistering(true);
    try {
      console.log("Registering user directly:", finalData);

      // Generate username from first and last name
      const username = `${finalData.firstName?.toLowerCase()}${finalData.lastName?.toLowerCase()}${Math.floor(
        Math.random() * 1000
      )}`;

      // Register user directly via /auth/register endpoint (passwordless signup)
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: finalData.phoneNumber,
          firstName: finalData.firstName,
          lastName: finalData.lastName,
          username: username,
          email: finalData.email || null,
          handicap: finalData.handicap ? parseInt(finalData.handicap) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create account");
      }

      console.log("User registered successfully:", data);

      // Show success message and navigate to Login
      Alert.alert(
        "Account Created! 🎉",
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
      Alert.alert(
        "Signup Failed",
        error instanceof Error ? error.message : "Please try again."
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
});
