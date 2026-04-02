/**
 * OAuthProfileCompletionScreen
 * Collects name and profile picture after phone verification
 * Creates the user account with all collected data
 */

import React, { useState, useRef, useCallback } from "react";
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
import { Camera, User } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { sessionManager } from "../../utils/sessionManager";
import { profileApi } from "../../services/api/profileApi";
import { API_URL } from "../../config/api";
import { ONBOARDING_COLORS as COLORS } from "./constants";
import { logger } from "../../utils/logger";

interface OAuthProfileCompletionProps {
  navigation: {
    replace: (screen: string, params?: Record<string, unknown>) => void;
  };
  route?: {
    params?: {
      phoneNumber: string;
      verifiedPhoneNumber: string;
      providerData?: {
        email?: string;
        first_name?: string;
        firstName?: string;
        last_name?: string;
        lastName?: string;
        picture?: string;
      };
    };
  };
}

export function OAuthProfileCompletionScreen({
  navigation,
  route,
}: OAuthProfileCompletionProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const providerData = route?.params?.providerData;
  const verifiedPhoneNumber = route?.params?.verifiedPhoneNumber || route?.params?.phoneNumber || "";

  const oauthPicture = providerData?.picture || null;

  const [firstName, setFirstName] = useState(
    providerData?.first_name || providerData?.firstName || ""
  );
  const [lastName, setLastName] = useState(
    providerData?.last_name || providerData?.lastName || ""
  );
  const [profileImage, setProfileImage] = useState<string | null>(oauthPicture);
  const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const lastNameRef = useRef<TextInput>(null);

  const isFormValid = firstName.trim().length > 0 && lastName.trim().length > 0;

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
              mediaTypes: "Images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
              base64: true,
            });

            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              setProfileImage(asset.uri);
              setProfileImageBase64(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null);
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
              mediaTypes: "Images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
              base64: true,
            });

            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              setProfileImage(asset.uri);
              setProfileImageBase64(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null);
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

  const handleComplete = async () => {
    if (!isFormValid || isSubmitting) return;

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      logger.debug("[OAuthProfileCompletion] Creating account", {
        hasFirstName: !!firstName.trim(),
        hasLastName: !!lastName.trim(),
        hasPhone: !!verifiedPhoneNumber,
        hasEmail: !!providerData?.email,
        hasProfileImage: !!profileImage,
      });

      // Register user with verified phone and OAuth data
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: verifiedPhoneNumber,
          email: providerData?.email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          isVerified: true, // Phone already verified via magic link
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error("[OAuthProfileCompletion] Account creation failed", {
          status: response.status,
          error: data.error || data.message,
        });
        throw new Error(data.error || data.message || "Failed to create account");
      }

      logger.info("[OAuthProfileCompletion] Account created successfully");

      // Save session
      await sessionManager.saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });

      // Upload profile image if user selected one (different from OAuth picture)
      if (profileImageBase64 && profileImage && profileImage !== oauthPicture) {
        try {
          setIsUploadingImage(true);
          await profileApi.uploadAvatar(profileImageBase64);
          logger.info("[OAuthProfileCompletion] Profile picture uploaded");
        } catch (imageError) {
          logger.error("[OAuthProfileCompletion] Image upload error", imageError);
          Alert.alert(
            "Image Upload Failed",
            "Your account was created but we couldn't upload your profile picture. You can add it later from your profile."
          );
        } finally {
          setIsUploadingImage(false);
        }
      }

      // Navigate to availability onboarding
      navigation.replace("AvailabilityOnboarding", { user: data.user });

    } catch (error) {
      logger.error("[OAuthProfileCompletion] Error creating account", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <StatusBar style="dark" />

        {/* Content */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Text className="text-[28px] font-bold text-gray-900 mb-2 mt-6">
              Complete your profile
            </Text>
            <Text className="text-[15px] text-gray-500 mb-8 leading-6">
              Tell us a bit about yourself
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
                  placeholder="John"
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
                  placeholder="Smith"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleComplete}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View
          className="px-6 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        >
          <TouchableOpacity
            className={`h-14 rounded-md justify-center items-center ${
              isFormValid && !isSubmitting 
                ? "bg-green-500" : "bg-green-300"
            }`}
            onPress={handleComplete}
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
      </View>
    </TouchableWithoutFeedback>
  );
}

export default OAuthProfileCompletionScreen;
