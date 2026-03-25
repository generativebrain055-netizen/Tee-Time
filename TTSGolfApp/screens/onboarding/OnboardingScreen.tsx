import React, { useState, useEffect, useRef } from "react";
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
import { profileApi } from "../../services/api";
import type { OnboardingData } from "../../types";
import { logger } from "../../utils/logger";
import { sessionManager } from "../../utils/sessionManager";

// Import all step components
import { SignUpOptionsPage } from "./SignUpOptionsPage";
import { MagicLinkPage } from "./MagicLinkPage";
import { NamePage } from "./NamePage";
import { EmailPage } from "./EmailPage";
import { ProfileImagePage } from "./ProfileImagePage";
import { LocationPage } from "./LocationPage";
import { ClubPage } from "./ClubPage";
import { HandicapPage } from "./HandicapPage";
import { PreferencesPage } from "./PreferencesPage";
import { CreateYourAccountPage } from "./CreateYourAccountPage";

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
  loadingOverlay: ViewStyle;
  loadingContainer: ViewStyle;
  loadingText: import("react-native").TextStyle;
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
  const routeOauthData = route?.params?.oauthData;

  // activeOauthData is state so handleOAuthSuccess can set it without re-navigating.
  // Initialise from route params (covers Login → Onboarding case).
  const [activeOauthData, setActiveOauthData] = useState<any>(routeOauthData || null);

  // Derive the starting step from the initial oauthData value.
  // SSO (no phone verification): skip phone + magic link + name/email → start at Profile Image (4).
  const getInitialStepIndex = (): number => {
    const od = routeOauthData as any;
    if (!od) return 0;
    if (od.fromVerifiedMagicLink && od.firstName && od.lastName && od.email) return 4;
    if (od.user || od.providerData) return 4; // SSO sign-up without phone verification
    return 0;
  };

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => getInitialStepIndex());
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const lastStepSubmittedRef = useRef<boolean>(false);
  const [userData, setUserData] = useState<Partial<OnboardingData>>({
    email: routeOauthData?.email || undefined,
    firstName: routeOauthData?.firstName || undefined,
    lastName: routeOauthData?.lastName || undefined,
  });

  // Keep activeOauthData in sync if route params change (e.g. navigation from Login).
  useEffect(() => {
    if (route?.params?.oauthData) {
      setActiveOauthData(route.params.oauthData);
    }
  }, [route?.params?.oauthData]);

  // Use activeOauthData everywhere (replaces the old read-only const).
  const oauthData = activeOauthData;

  // SSO flow adds "Create your account" step after Preferences (Figma flow).
  const stepOrder =
    oauthData && ((oauthData as any).tempToken || (oauthData as any).user || (oauthData as any).providerData)
      ? [...STEP_ORDER, ONBOARDING_STEPS.SSO_CREATE_ACCOUNT]
      : STEP_ORDER;

  const currentStep = stepOrder[currentStepIndex];

  const handleNext = (data: Partial<OnboardingData>): void => {
    logger.debug("[OnboardingScreen] handleNext called", {
      currentStepIndex,
      totalSteps: stepOrder.length,
      step: currentStep,
    });

    // Merge new data with existing userData
    setUserData((prev) => ({ ...prev, ...data }));

    const nextStepIndex = currentStepIndex + 1;

    if (nextStepIndex < stepOrder.length) {
      logger.debug("[OnboardingScreen] Moving to step index", { nextStepIndex });
      setCurrentStepIndex(nextStepIndex);
    } else {
      // Last step in stepOrder (Preferences for non-SSO only; SSO last step is Create your account, handled by handleFinishSetup)
      if (lastStepSubmittedRef.current) {
        logger.warn("[OnboardingScreen] Last step already submitted, ignoring duplicate tap");
        return;
      }
      lastStepSubmittedRef.current = true;
      setIsRegistering(true);
      completeOnboarding({ ...userData, ...data });
    }
  };

  const handleFinishSetup = async (data: { firstName: string; lastName: string; email: string; phoneNumber: string }): Promise<void> => {
    if (lastStepSubmittedRef.current) return;
    lastStepSubmittedRef.current = true;
    setIsRegistering(true);

    try {
      // Merge all collected onboarding data with the form fields
      const merged = {
        ...userData,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        phoneNumber: data.phoneNumber,
      };
      if (!merged.preferences) {
        merged.preferences = {
          playStyle: "either",
          preferredTimes: ["afternoon"],
          playingPartnerPreference: "casual",
        };
      }

      const mapTime = (times: string[] | undefined): string => {
        if (!times || times.length === 0) return "any";
        const map: Record<string, string> = {
          morning: "morning",
          late_morning: "midday",
          afternoon: "afternoon",
          evening: "evening",
          any: "any",
        };
        return map[times[0]] || "any";
      };

      // Get bearer token from oauthData or current session
      const session = await sessionManager.getSession();
      const bearerToken = (oauthData as any)?.accessToken || session?.accessToken;

      if (!bearerToken) {
        throw new Error("No authentication token. Please sign in again.");
      }

      // Build clubs array
      const clubs = Array.isArray(merged.clubs) && merged.clubs.length > 0
        ? merged.clubs.map((c: any) => ({ id: c.id || null, name: c.name || null, location: c.location || null, type: c.type || "Public" }))
        : merged.club
          ? [{ id: merged.club.id || null, name: merged.club.name || null, location: merged.club.location || null, type: merged.club.type || "Public" }]
          : [];

      // Normalize phone to E.164
      const rawPhone = String(merged.phoneNumber || "").replace(/\D/g, "");
      const e164Phone = rawPhone.length === 10 ? `+1${rawPhone}` : rawPhone.length > 10 ? `+${rawPhone}` : null;

      const username = `${merged.firstName.toLowerCase()}${merged.lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;

      const body: Record<string, unknown> = {
        firstName: merged.firstName,
        lastName: merged.lastName,
        email: merged.email || null,
        phoneNumber: e164Phone,
        username,
        zipCode: merged.zipCode || null,
        handicap: merged.handicap != null ? parseInt(String(merged.handicap), 10) : null,
        location: merged.location?.name || null,
        homeCourse: clubs.length > 0 ? clubs[0].name : null,
        clubs,
        preferredTeeTime: mapTime(merged.preferences?.preferredTimes as string[] | undefined),
        walkOrRide: merged.preferences?.playStyle || null,
        playingPartnerPreference: merged.preferences?.playingPartnerPreference || null,
        drinkOfChoice: (merged.preferences as any)?.drinkOfChoice || null,
      };

      if (merged.profilePhotoBase64) {
        body.profilePhotoBase64 = merged.profilePhotoBase64;
      }

      logger.info("[OnboardingScreen] SSO Finish setup – saving profile", {
        hasBearer: !!bearerToken,
        hasName: !!(body.firstName && body.lastName),
      });

      const response = await fetch(`${API_URL}/auth/complete-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(body),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        logger.error("[OnboardingScreen] complete-profile failed", { status: response.status, resData });
        throw new Error(resData.error || resData.message || "Failed to save profile");
      }

      logger.info("[OnboardingScreen] Profile saved successfully");

      // Persist updated user to session
      if (resData.user) {
        const existing = await sessionManager.getSession();
        await sessionManager.saveSession({
          accessToken: existing?.accessToken || bearerToken,
          refreshToken: existing?.refreshToken || (oauthData as any)?.refreshToken,
          user: resData.user,
        });
      }

      // Navigate to Availability Onboarding AFTER successful save
      (navigation as any).replace("AvailabilityOnboarding", { user: resData.user || merged });
    } catch (error: any) {
      logger.error("[OnboardingScreen] handleFinishSetup error", error);
      lastStepSubmittedRef.current = false;
      setIsRegistering(false);
      Alert.alert("Error", error?.message || "Failed to save profile. Please try again.");
    }
  };

  const handleSkipPreferences = (): void => {
    if (oauthData && stepOrder[currentStepIndex + 1] === ONBOARDING_STEPS.SSO_CREATE_ACCOUNT) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleNext({
        preferences: {
          playStyle: "either",
          preferredTimes: ["afternoon"],
          playingPartnerPreference: "casual",
        },
      });
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
    logger.debug("[OnboardingScreen] completeOnboarding called");

    if (isRegistering) {
      logger.warn("[OnboardingScreen] Already registering, skipping...");
      return;
    }

    // Validate required fields
    const missingFields: string[] = [];
    // SSO flow: user verified magic link, or already has session, or is completing SSO sign-up (tempToken)
    let hasOAuthSession = false;
    const isSsoSignUp = !!(oauthData as any)?.tempToken || (oauthData as any)?.user || (oauthData as any)?.providerData;
    if (oauthData) {
      const session = await sessionManager.getSession();
      hasOAuthSession = !!(session?.accessToken && session?.user);
    }
    const isFromVerifiedMagicLink =
      !!(oauthData as any)?.fromVerifiedMagicLink ||
      !!(finalData as any)?.fromVerifiedMagicLink ||
      hasOAuthSession ||
      isSsoSignUp;

    if (!isFromVerifiedMagicLink) {
      if (!finalData.phoneNumber) missingFields.push("Phone number");
      if (!finalData.firstName?.trim()) missingFields.push("First name");
      if (!finalData.lastName?.trim()) missingFields.push("Last name");
    }

    // Full onboarding requires preferences for all flows
    if (!finalData.preferences) {
      missingFields.push("Preferences");
    } else {
      if (!finalData.preferences.playStyle)
        missingFields.push("Walk/Ride preference");
      if (
        !finalData.preferences.preferredTimes ||
        finalData.preferences.preferredTimes.length === 0
      ) {
        missingFields.push("Preferred time of day");
      }
      if (!finalData.preferences.playingPartnerPreference)
        missingFields.push("Golf vibe");
    }

    if (missingFields.length > 0) {
      logger.warn("[OnboardingScreen] Validation failed. Missing fields", { missingFields });
      Alert.alert(
        "Missing Information",
        `Please complete the following fields:\n\n${missingFields.join("\n")}`,
      );
      return;
    }

    logger.info("[OnboardingScreen] Validation passed. Starting registration...");
    setIsRegistering(true);
    try {
      logger.debug("[OnboardingScreen] Registering user", {
        hasPhone: !!finalData.phoneNumber,
        hasName: !!(finalData.firstName && finalData.lastName),
        isOAuth: !!oauthData?.tempToken,
      });

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

      // Format clubs array for backend (support multiple clubs)
      const clubsArray = Array.isArray(finalData.clubs) && finalData.clubs.length > 0
        ? finalData.clubs.map(club => ({
            id: club.id || null,
            name: club.name || null,
            location: club.location || null,
            type: club.type || "Public",
          }))
        : finalData.club
          ? [{
              id: finalData.club.id || null,
              name: finalData.club.name || null,
              location: finalData.club.location || null,
              type: finalData.club.type || "Public",
            }]
          : [];

      const requestBody = {
        phoneNumber: finalData.phoneNumber,
        firstName: finalData.firstName,
        lastName: finalData.lastName,
        username: username,
        email: finalData.email || null,
        zipCode: finalData.zipCode || null,
        profilePhotoBase64: finalData.profilePhotoBase64 || null,
        handicap: finalData.handicap != null ? parseInt(String(finalData.handicap), 10) : null,
        location: finalData.location?.name || null,
        homeCourse: clubsArray.length > 0 ? clubsArray[0].name : null, // Keep for backward compatibility
        clubs: clubsArray, // Send clubs array
        preferredTeeTime: mapPreferredTime(
          finalData.preferences?.preferredTimes,
        ),
        walkOrRide: finalData.preferences?.playStyle || "either",
        playingPartnerPreference: finalData.preferences?.playingPartnerPreference || null,
        drinkOfChoice: finalData.preferences?.drinkOfChoice || null,
      };

      logger.debug("[OnboardingScreen] Registration request", {
        endpoint: API_ENDPOINTS.REGISTER,
        hasPhone: !!requestBody.phoneNumber,
        hasName: !!(requestBody.firstName && requestBody.lastName),
      });

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let response;

      // Post magic-link: user already exists; update profile with collected onboarding data
      if (isFromVerifiedMagicLink) {
        const mapPreferredTime = (times: string[] | undefined): string => {
          if (!times || times.length === 0) return "any";
          const timeMap: Record<string, string> = {
            morning: "morning",
            late_morning: "midday",
            afternoon: "afternoon",
            evening: "evening",
            any: "any",
          };
          return timeMap[times[0]] || "any";
        };
        const clubsArray = Array.isArray(finalData.clubs) && finalData.clubs.length > 0
          ? finalData.clubs.map(club => ({ id: club.id || undefined, name: club.name || "", location: club.location || undefined }))
          : finalData.club
            ? [{ id: finalData.club.id || undefined, name: finalData.club.name || "", location: finalData.club.location || undefined }]
            : undefined;
        const updatePayload: Record<string, unknown> = {
          location: finalData.location?.name || finalData.zipCode || undefined,
          homeCourse: clubsArray?.length ? clubsArray[0].name : undefined,
          clubs: clubsArray,
          handicap: finalData.handicap != null ? parseInt(String(finalData.handicap), 10) : undefined,
          preferences: finalData.preferences ? {
            preferredTeeTime: mapPreferredTime(finalData.preferences.preferredTimes),
            walkOrRide: finalData.preferences.playStyle || undefined,
            playingPartnerPreference: finalData.preferences.playingPartnerPreference || undefined,
          } : undefined,
        };
        if (finalData.profilePhotoBase64) {
          try {
            const uploadRes = await profileApi.uploadAvatar(finalData.profilePhotoBase64);
            if (uploadRes.avatarUrl) updatePayload.avatarUrl = uploadRes.avatarUrl;
          } catch (e) {
            logger.warn("[OnboardingScreen] Avatar upload failed, continuing without", e);
          }
        }
        const updateRes = await profileApi.updateProfile(updatePayload as any);
        logger.info("[OnboardingScreen] Profile updated after magic-link onboarding");
        if (updateRes.user) {
          const existing = await sessionManager.getSession();
          if (existing?.user) {
            await sessionManager.saveSession({ ...existing, user: { ...existing.user, ...updateRes.user } });
          }
        }
        (navigation as any).replace("AvailabilityOnboarding", { user: updateRes.user || oauthData });
        setIsRegistering(false);
        return;
      }

      // Existing OAuth user (has accessToken, no tempToken): update profile with Authorization header
      const oauthAccessToken = (oauthData as any)?.accessToken;
      if (oauthAccessToken && !oauthData?.tempToken) {
        logger.info("[OnboardingScreen] Existing OAuth user - updating profile with Bearer token");
        const firstName =
          finalData.firstName?.trim() || (oauthData as any).firstName || (oauthData as any).providerData?.firstName || null;
        const lastName =
          finalData.lastName?.trim() || (oauthData as any).lastName || (oauthData as any).providerData?.lastName || null;
        let email = finalData.email?.trim() || (oauthData as any).email || (oauthData as any).providerData?.email || null;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = null;
        let phoneNumber = finalData.phoneNumber ? String(finalData.phoneNumber).replace(/\D/g, "") : null;
        if (phoneNumber && phoneNumber.length === 10) phoneNumber = `+1${phoneNumber}`;
        else if (phoneNumber && !phoneNumber.startsWith("+")) phoneNumber = null;
        const oauthClubsArray = Array.isArray(finalData.clubs) && finalData.clubs.length > 0
          ? finalData.clubs.map((club: any) => ({
              id: club.id || null,
              name: club.name || null,
              location: club.location || null,
              type: club.type || "Public",
            }))
          : finalData.club
            ? [{
                id: finalData.club.id || null,
                name: finalData.club.name || null,
                location: finalData.club.location || null,
                type: finalData.club.type || "Public",
              }]
            : [];
        const updateBody = {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email || undefined,
          phoneNumber: phoneNumber || undefined,
          username: username || undefined,
          zipCode: finalData.zipCode || undefined,
          handicap: finalData.handicap != null ? parseInt(String(finalData.handicap), 10) : undefined,
          location: finalData.location?.name || undefined,
          homeCourse: oauthClubsArray.length > 0 ? oauthClubsArray[0].name : undefined,
          clubs: oauthClubsArray.length > 0 ? oauthClubsArray : undefined,
          preferredTeeTime: finalData.preferences?.preferredTimes?.length ? mapPreferredTime(finalData.preferences.preferredTimes) : undefined,
          walkOrRide: finalData.preferences?.playStyle || undefined,
          playingPartnerPreference: finalData.preferences?.playingPartnerPreference || undefined,
          drinkOfChoice: finalData.preferences?.drinkOfChoice || undefined,
        };
        if (finalData.profilePhotoBase64) {
          (updateBody as any).profilePhotoBase64 = finalData.profilePhotoBase64;
        }
        response = await fetch(`${API_URL}/auth/complete-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${oauthAccessToken}`,
          },
          body: JSON.stringify(updateBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          logger.error("[OnboardingScreen] Complete profile (existing user) failed", { status: response.status, data });
          throw new Error(data.error || data.message || "Failed to update profile");
        }
        logger.info("[OnboardingScreen] Profile updated for existing OAuth user");
        if (data.user) {
          const existing = await sessionManager.getSession();
          if (existing?.accessToken || existing?.refreshToken) {
            await sessionManager.saveSession({
              ...existing,
              user: data.user,
            });
          }
        }
        (navigation as any).replace("AvailabilityOnboarding", { user: data.user });
        setIsRegistering(false);
        return;
      }

      // Check if this is OAuth registration (has tempToken)
      if (oauthData?.tempToken) {
        logger.info("[OnboardingScreen] Completing OAuth registration with tempToken");

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
            logger.warn("[OnboardingScreen] Invalid email format, setting to null", { email });
            email = null;
          }
        }

        logger.debug("[OnboardingScreen] Resolved names", { firstName, lastName, hasEmail: !!email });

        if (!firstName || !lastName) {
          Alert.alert(
            "Missing Information",
            "First name and last name are required. Please go back and fill them in.",
          );
          setIsRegistering(false);
          return;
        }

        // Format clubs array for OAuth registration
        const oauthClubsArray = Array.isArray(finalData.clubs) && finalData.clubs.length > 0
          ? finalData.clubs.map(club => ({
              id: club.id || null,
              name: club.name || null,
              location: club.location || null,
              type: club.type || "Public",
            }))
          : finalData.club
            ? [{
                id: finalData.club.id || null,
                name: finalData.club.name || null,
                location: finalData.club.location || null,
                type: finalData.club.type || "Public",
              }]
            : [];

        const oauthRequestBody = {
          tempToken: oauthData.tempToken,
          phoneNumber: finalData.phoneNumber,
          email: email,
          firstName: firstName,
          lastName: lastName,
          username: username,
          zipCode: finalData.zipCode || null,
          profilePhotoBase64: finalData.profilePhotoBase64 || null,
          handicap: finalData.handicap != null ? parseInt(String(finalData.handicap), 10) : null,
          location: finalData.location?.name || null,
          homeCourse: oauthClubsArray.length > 0 ? oauthClubsArray[0].name : null,
          clubs: oauthClubsArray,
          preferredTeeTime: finalData.preferences?.preferredTimes?.length ? mapPreferredTime(finalData.preferences.preferredTimes) : null,
          walkOrRide: finalData.preferences?.playStyle || null,
          playingPartnerPreference: finalData.preferences?.playingPartnerPreference || null,
          drinkOfChoice: finalData.preferences?.drinkOfChoice || null,
        };

        logger.debug("[OnboardingScreen] OAuth request body prepared", {
          hasTempToken: !!oauthRequestBody.tempToken,
          hasPhone: !!oauthRequestBody.phoneNumber,
          hasName: !!(oauthRequestBody.firstName && oauthRequestBody.lastName),
        });

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

      logger.debug("[OnboardingScreen] Registration response", {
        status: response.status,
        ok: response.ok,
      });

      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
        logger.debug("[OnboardingScreen] Response parsed successfully");
      } catch (parseError) {
        logger.error("[OnboardingScreen] Failed to parse response", parseError);
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

        logger.error("[OnboardingScreen] Server error", {
          errorMessage,
          errorDetails,
          status: response.status,
        });

        // Show user-friendly error
        const displayMessage = errorDetails
          ? `${errorMessage}\n\n${errorDetails}`
          : errorMessage;

        throw new Error(displayMessage);
      }

      logger.info("[OnboardingScreen] User registered successfully", {
        hasAccessToken: !!data.accessToken,
        status: data.status,
      });

      // If OAuth registration (status: authenticated), save session and go to Availability Onboarding (Figma 1269-2679)
      if (data.status === "authenticated" && data.accessToken) {
        await sessionManager.saveSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });

        logger.info("[OnboardingScreen] OAuth registration complete - navigating to AvailabilityOnboarding");

        // After onboarding (Figma 839-550), SSO sign-up goes to Availability Onboarding (Figma 1269-2679)
        (navigation as any).replace("AvailabilityOnboarding", { user: data.user });

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
      logger.error("[OnboardingScreen] Error registering user", error);

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
      case ONBOARDING_STEPS.MAGIC_LINK:
        return MagicLinkPage as unknown as StepComponent;
      case ONBOARDING_STEPS.NAME:
        return NamePage as unknown as StepComponent;
      case ONBOARDING_STEPS.EMAIL:
        return EmailPage as unknown as StepComponent;
      case ONBOARDING_STEPS.PROFILE_IMAGE:
        return ProfileImagePage as unknown as StepComponent;
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
    const pd = data.providerData;
    const isUnregisteredSso =
      (data.status === "pending_phone_verification" && pd) || (data.isNewUser && pd && !data.user);

    if (isUnregisteredSso) {
      // Stay on this screen – just flip to SSO-mode (screen 18 phone-only UI)
      logger.info("[OnboardingScreen] Unregistered SSO → screen 18 (state update, no navigation)");
      setActiveOauthData({
        email: pd?.email ?? undefined,
        firstName: pd?.firstName ?? pd?.first_name ?? undefined,
        lastName: pd?.lastName ?? pd?.last_name ?? undefined,
        picture: pd?.picture ?? undefined,
        providerData: pd,
        needsPhoneVerification: true,
      });
      setCurrentStepIndex(0);
      return;
    }
    if (data.needsOnboarding && data.oauthData) {
      (navigation as any).replace("Onboarding", { oauthData: data.oauthData });
      return;
    }
    navigation.replace("Home");
  };

  const renderStep = (): React.ReactElement => {
    const StepComponent = getStepComponent(currentStep);

    // Special handling for SignUpOptionsPage - needs onOAuthSuccess and optional oauthData (SSO = phone-only UI)
    if (currentStep === ONBOARDING_STEPS.SIGNUP_OPTIONS) {
      return (
        <View style={styles.stepContainer}>
          <SignUpOptionsPage
            onNext={handleNext}
            onBack={handleBack}
            onOAuthSuccess={handleOAuthSuccess}
            oauthData={oauthData ?? undefined}
          />
        </View>
      );
    }

    // Magic Link step: pass oauthData when SSO so we send with userData and handle OAuth verify
    if (currentStep === ONBOARDING_STEPS.MAGIC_LINK) {
      return (
        <View style={styles.stepContainer}>
          <MagicLinkPage
            onNext={handleNext}
            onBack={handleBack}
            initialPhone={userData.phoneNumber}
            oauthData={oauthData ?? undefined}
          />
        </View>
      );
    }

    // Create your account (SSO only, after Preferences): name, email, phone, Finish setup
    if (currentStep === ONBOARDING_STEPS.SSO_CREATE_ACCOUNT) {
      const od = oauthData as any;
      return (
        <View style={styles.stepContainer}>
          <CreateYourAccountPage
            onBack={handleBack}
            onFinishSetup={handleFinishSetup}
            initialFirstName={userData.firstName || od?.firstName || od?.providerData?.firstName || ""}
            initialLastName={userData.lastName || od?.lastName || od?.providerData?.lastName || ""}
            initialEmail={userData.email || od?.email || od?.providerData?.email || ""}
            initialPhoneNumber={userData.phoneNumber || ""}
            isSubmitting={isRegistering}
          />
        </View>
      );
    }

    // Preferences: pass isSubmitting and onSkip (Skip → next step for SSO, or default prefs for non-SSO)
    if (currentStep === ONBOARDING_STEPS.PREFERENCES) {
      return (
        <View style={styles.stepContainer}>
          <PreferencesPage
            onNext={handleNext}
            onBack={handleBack}
            initialPreferences={userData.preferences}
            isSubmitting={isRegistering}
            onSkip={handleSkipPreferences}
          />
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <StepComponent
          onNext={handleNext}
          onBack={handleBack}
          onOAuthSuccess={handleOAuthSuccess}
          initialPhone={userData.phoneNumber}
          initialData={userData as OnboardingData}
          initialEmail={userData.email}
          initialProfilePhotoUri={userData.profilePhotoUri}
          initialZipCode={userData.zipCode}
          initialLocation={userData.location?.name}
          initialZipCode={userData.zipCode ?? undefined}
          initialClub={userData.club?.name}
          initialHandicap={userData.handicap?.toString() || ""}
          initialPreferences={userData.preferences}
        />
      </View>
    );
  };

  // Progress indicator
  const progressPercentage = ((currentStepIndex + 1) / stepOrder.length) * 100;

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
    color: colors.textPrimary,
  },
});
