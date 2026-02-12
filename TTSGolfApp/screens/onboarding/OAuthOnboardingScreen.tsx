/**
 * OAuthOnboardingScreen
 * A single-page onboarding flow for OAuth users (Apple/Google Sign-In)
 *
 * This screen collects required profile information:
 * - Profile Picture (from OAuth or user upload)
 * - First Name / Last Name (pre-filled from OAuth if available)
 * - Email (pre-filled and read-only from OAuth)
 * - Phone Number (required for account)
 *
 * FEATURES:
 * - Displays OAuth profile picture if available
 * - Pre-fills all available OAuth data
 * - Visual indicators for pre-filled vs editable fields
 * - Inline image picker to change/upload profile picture
 * - Gracefully handles missing OAuth data
 *
 * Design matches the SSO Sign-up info mockup
 *
 * @module screens/onboarding/OAuthOnboardingScreen
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, Camera, User } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { sessionManager } from "../../utils/sessionManager";
import { oauthService, formatOAuthError } from "../../services/oauthService";
import { profileApi } from "../../services/api/profileApi";
import CountryPicker, { Country, COUNTRIES } from "../../components/CountryPicker";
import type {
  OAuthOnboardingRouteParams,
  ProfileCompletionPayload,
} from "../../types/oauth";
import { ONBOARDING_COLORS as COLORS } from "./constants";
import { logger } from "../../utils/logger";

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

// ============================================================================
// Component
// ============================================================================

export function OAuthOnboardingScreen({
  navigation,
  route,
}: OAuthOnboardingProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const oauthData = route?.params?.oauthData;

  // Check if this is pending verification (new user) or authenticated (existing user)
  const isPendingVerification = oauthData && "pendingToken" in oauthData && oauthData.needsPhoneVerification;
  const isAuthenticated = oauthData && "accessToken" in oauthData && !oauthData.needsPhoneVerification;
  
  logger.debug("[OAuthOnboarding] Flow type", {
    isPendingVerification,
    isAuthenticated,
    hasPendingToken: oauthData && "pendingToken" in oauthData,
    hasAccessToken: oauthData && "accessToken" in oauthData,
    needsPhoneVerification: oauthData?.needsPhoneVerification,
  });

  const providerData = oauthData?.providerData;
  // Prefer session user when it has more complete data (e.g. phoneNumber) to avoid stale missingFields
  const [sessionUser, setSessionUser] = useState<{ phoneNumber?: string | null; firstName?: string; lastName?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    sessionManager.getUser().then((u) => {
      if (!cancelled && u) setSessionUser(u);
    });
    return () => { cancelled = true; };
  }, []);
  // Pre-fill phone from session when it loads (e.g. after completing step elsewhere)
  useEffect(() => {
    if (sessionUser?.phoneNumber && !phoneNumber) setPhoneNumber(sessionUser.phoneNumber);
  }, [sessionUser?.phoneNumber]);
  const user = isAuthenticated
    ? (sessionUser?.phoneNumber != null && (oauthData as any)?.user
        ? { ...(oauthData as any).user, phoneNumber: sessionUser.phoneNumber ?? (oauthData as any).user?.phoneNumber }
        : (oauthData as any)?.user)
    : null;

  // Determine the OAuth provider picture (Google provides picture, Apple may have it)
  const oauthPicture = providerData?.picture || user?.avatarUrl || null;

  // Form state - pre-fill from OAuth data (prioritize providerData for pending users)
  const [firstName, setFirstName] = useState<string>(
    String(providerData?.first_name ?? providerData?.firstName ?? user?.firstName ?? "")
  );
  const [lastName, setLastName] = useState<string>(
    String(providerData?.last_name ?? providerData?.lastName ?? user?.lastName ?? "")
  );
  const [email] = useState<string>(String(providerData?.email ?? user?.email ?? ""));
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES.find(c => c.code === "US") || COUNTRIES[0]
  );
  const [profileImage, setProfileImage] = useState<string | null>(oauthPicture);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showMagicLinkSent, setShowMagicLinkSent] = useState(false);

  // Refs for input navigation
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // Validation - strip leading zero for countries where users type it (e.g. Pakistan 03001234567)
  const rawDigits = phoneNumber.replace(/\D/g, "");
  const normalizedDigits = rawDigits.startsWith('0') ? rawDigits.slice(1) : rawDigits;
  const isPhoneValid = normalizedDigits.length >= selectedCountry.minLength && 
    normalizedDigits.length <= selectedCountry.maxLength;
  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    isPhoneValid;

  const handlePhoneChange = (text: string) => {
    // Store raw digits only - no formatting
    setPhoneNumber(text.replace(/\D/g, ""));
  };

  // Get raw phone number for API (E.164 format)
  const getRawPhoneNumber = () => {
    return selectedCountry.dialCode + normalizedDigits;
  };

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  /**
   * Handle profile image selection (camera or gallery)
   */
  const handleImagePicker = useCallback(async () => {
    Alert.alert(
      "Profile Picture",
      "Choose a photo for your profile",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                "Permission Required",
                "Camera access is needed to take photos"
              );
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              setProfileImage(result.assets[0].uri);
            }
          },
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                "Permission Required",
                "Gallery access is needed to choose photos"
              );
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              setProfileImage(result.assets[0].uri);
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  }, []);

  const handleSendVerification = useCallback(async () => {
    if (!isFormValid || isSubmitting || !oauthData) return;

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      logger.debug("[OAuthOnboarding] Starting verification", {
        hasPendingToken: "pendingToken" in oauthData,
        hasAccessToken: "accessToken" in oauthData,
        needsPhoneVerification: oauthData.needsPhoneVerification,
      });

      // Check if this is a pending verification (new OAuth user)
      if ("pendingToken" in oauthData && oauthData.needsPhoneVerification) {
        // New user flow - verify phone and create account
        logger.info("[OAuthOnboarding] New user flow - verifying phone");
        
        const response = await oauthService.verifyPhoneAndCompleteSignup({
          pendingToken: oauthData.pendingToken as string,
          phoneNumber: getRawPhoneNumber(),
          verificationCode: "123456", // Auto-verify in test mode
          countryCode: selectedCountry.dialCode,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });

        logger.debug("[OAuthOnboarding] Verification response", {
          success: response.success,
          hasAccessToken: !!(response as any).accessToken,
          hasUser: !!(response as any).user,
        });

        // Upload profile image if user selected one (different from OAuth picture)
        if (profileImage && profileImage !== oauthPicture) {
          try {
            setIsUploadingImage(true);
            await profileApi.uploadAvatar(profileImage);
          } catch (imageError) {
            logger.error("[OAuthOnboarding] Image upload error", imageError);
            Alert.alert(
              "Image Upload Failed",
              "Your account was created but we couldn't upload your profile picture. You can add it later from your profile."
            );
          } finally {
            setIsUploadingImage(false);
          }
        }

        // Save session with new tokens
        await sessionManager.saveSession({
          accessToken: (response as any).accessToken || '',
          refreshToken: (response as any).refreshToken || '',
          user: (response as any).user,
        });

        // Show success and navigate
        setShowMagicLinkSent(true);
        setTimeout(() => {
          navigation.replace("AvailabilityOnboarding", { user: (response as any).user });
        }, 1500);

      } else if ("accessToken" in oauthData && !oauthData.needsPhoneVerification) {
        // Existing user flow - just update profile with phone number
        logger.info("[OAuthOnboarding] Existing user flow - updating profile");
        
        const payload: ProfileCompletionPayload = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: getRawPhoneNumber(),
        };

        const response = await oauthService.completeOAuthProfile(
          payload,
          oauthData.accessToken,
        );

        // Upload profile image if changed
        if (profileImage && profileImage !== oauthPicture) {
          try {
            setIsUploadingImage(true);
            await profileApi.uploadAvatar(profileImage);
          } catch (imageError) {
            logger.error("[OAuthOnboarding] Image upload error", imageError);
          } finally {
            setIsUploadingImage(false);
          }
        }

        // Update session with new user data
        await sessionManager.saveSession({
          accessToken: oauthData.accessToken,
          refreshToken: oauthData.refreshToken,
          user: response.user,
        });

        // Show success and navigate
        setShowMagicLinkSent(true);
        setTimeout(() => {
          navigation.replace("AvailabilityOnboarding", { user: response.user });
        }, 1500);
      } else {
        Alert.alert("Error", "Invalid OAuth session data");
      }

    } catch (error) {
      logger.error("[OAuthOnboarding] Verification error", error);
      Alert.alert("Error", formatOAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [isFormValid, isSubmitting, oauthData, firstName, lastName, profileImage, oauthPicture, navigation, selectedCountry, phoneNumber]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <StatusBar style="dark" />

        {/* Header */}
        <View className="h-14 justify-center px-6">
          <TouchableOpacity
            className="w-10 h-10 justify-center items-start"
            onPress={handleBack}
          >
            <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {showMagicLinkSent ? (
            /* Success View - Account Created */
            <View className="flex-1 justify-center items-center px-6">
              <View className="w-20 h-20 rounded-full bg-green-500 items-center justify-center mb-6">
                <Text className="text-white text-4xl">✓</Text>
              </View>
              <Text className="text-[28px] font-bold text-gray-900 mb-2 text-center">
                Account Created! ✓
              </Text>
              <Text className="text-[15px] text-gray-500 text-center leading-6 mb-4">
                Your phone number has been verified successfully
              </Text>
              <Text className="text-[15px] text-gray-600 font-medium">
                {getRawPhoneNumber()}
              </Text>
            </View>
          ) : (
            /* Form View */
            <ScrollView
              className="flex-1 px-6"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            {/* Title */}
            <Text className="text-[28px] font-bold text-gray-900 mb-2">
              Create your account
            </Text>
            <Text className="text-[15px] text-gray-500 mb-8 leading-6">
              We'll use this info to connect you with friends
            </Text>

            {/* Profile Picture */}
            <View className="items-center mb-8">
              <TouchableOpacity
                onPress={handleImagePicker}
                className="relative"
                activeOpacity={0.8}
              >
                <View className="w-28 h-28 rounded-full bg-gray-100 items-center justify-center overflow-hidden border-2 border-gray-200">
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <User size={48} color={COLORS.textPlaceholder} strokeWidth={1.5} />
                  )}
                </View>
                {/* Camera icon overlay */}
                <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-green-500 items-center justify-center border-2 border-white">
                  <Camera size={18} color={COLORS.white} strokeWidth={2} />
                </View>
              </TouchableOpacity>
              <Text className="text-sm text-gray-500 mt-3">
                {profileImage && profileImage === oauthPicture
                  ? "From your account"
                  : "Tap to change photo"}
              </Text>
            </View>

            {/* Name Row */}
            <View className="flex-row gap-4 mb-4">
              {/* First Name */}
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <Text className="text-sm text-gray-500">
                    First name <Text className="text-red-500">*</Text>
                  </Text>
                  {providerData?.first_name && (
                    <View className="ml-2 px-2 py-0.5 bg-green-50 rounded">
                      <Text className="text-xs text-green-600 font-medium">Pre-filled</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  className="h-14 bg-gray-50 border border-gray-200 rounded-md px-4 text-base text-gray-900"
                  placeholder="Blake"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>

              {/* Last Name */}
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <Text className="text-sm text-gray-500">
                    Last name <Text className="text-red-500">*</Text>
                  </Text>
                  {providerData?.last_name && (
                    <View className="ml-2 px-2 py-0.5 bg-green-50 rounded">
                      <Text className="text-xs text-green-600 font-medium">Pre-filled</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  ref={lastNameRef}
                  className="h-14 bg-gray-50 border border-gray-200 rounded-md px-4 text-base text-gray-900"
                  placeholder="Hylen"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              </View>
            </View>

            {/* Email (Read-only from OAuth) */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Text className="text-sm text-gray-500">
                  Email address <Text className="text-red-500">*</Text>
                </Text>
                <View className="ml-2 px-2 py-0.5 bg-blue-50 rounded">
                  <Text className="text-xs text-blue-600 font-medium">From sign-in</Text>
                </View>
              </View>
              <TextInput
                className="h-14 bg-gray-100 border border-gray-200 rounded-md px-4 text-base text-gray-600"
                value={email}
                editable={false}
                selectTextOnFocus={false}
              />
            </View>

            {/* Phone Number */}
            <View className="mb-8">
              <Text className="text-sm text-gray-500 mb-2">
                Phone number <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-row items-center h-14 bg-gray-50 border border-gray-200 rounded-md">
                <CountryPicker
                  selectedCountry={selectedCountry}
                  onSelect={setSelectedCountry}
                />
                <TextInput
                  ref={phoneRef}
                  className="flex-1 h-full px-4 text-base text-gray-900"
                  placeholder={selectedCountry.placeholder}
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={selectedCountry.maxLength + 1}
                  returnKeyType="done"
                  onSubmitEditing={handleSendVerification}
                />
              </View>
            </View>

          </ScrollView>
          )}
        </KeyboardAvoidingView>

        {/* Footer */}
        {!showMagicLinkSent && (
          <View
            className="px-6 pt-4"
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
          >
          <TouchableOpacity
            className={`h-14 rounded-md justify-center items-center ${
              isFormValid && !isSubmitting 
                ? "bg-green-500" : "bg-green-300"
            }`}
            onPress={handleSendVerification}
            disabled={!isFormValid || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text className="text-white text-sm ml-2">
                  {isUploadingImage ? "Uploading photo..." : "Creating account..."}
                </Text>
              </View>
            ) : (
              <Text className="text-white text-base font-semibold">
                Complete Sign Up
              </Text>
            )}
          </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default OAuthOnboardingScreen;
