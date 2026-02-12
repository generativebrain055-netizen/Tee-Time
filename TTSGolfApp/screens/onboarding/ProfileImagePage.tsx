import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, Camera, Image as ImageIcon } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import type { ProfileImagePageProps } from "../../types";
import { ONBOARDING_COLORS as COLORS } from "./constants";

export const ProfileImagePage: React.FC<ProfileImagePageProps> = ({
  onNext,
  onBack,
  initialData = {},
}) => {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | undefined>(
    initialData.picture || initialData.avatar
  );
  const [isLoading, setIsLoading] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === "granted";
  };

  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        "Camera Permission Required",
        "Please allow camera access to take a photo."
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      const { logger } = require("../../utils/logger");
      logger.error("[ProfileImagePage] Error taking photo", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoosePhoto = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      Alert.alert(
        "Gallery Permission Required",
        "Please allow gallery access to choose a photo."
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      const { logger } = require("../../utils/logger");
      logger.error("[ProfileImagePage] Error choosing photo", error);
      Alert.alert("Error", "Failed to choose photo. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    onNext({
      avatar: imageUri,
      picture: imageUri,
    });
  };

  const handleSkip = () => {
    onNext({
      avatar: undefined,
      picture: undefined,
    });
  };

  return (
    <View
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top > 0 ? 0 : 16 }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View className="h-14 flex-row justify-between items-center px-6">
        <TouchableOpacity
          className="w-10 h-10 justify-center"
          onPress={onBack}
        >
          <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
        </TouchableOpacity>
        <TouchableOpacity className="py-2 px-1" onPress={handleSkip}>
          <Text className="text-[15px] font-semibold text-gray-500">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 pt-4">
        <Text className="text-[28px] font-bold text-gray-900 mb-2">
          Add your photo
        </Text>
        <Text className="text-[15px] text-gray-500 leading-6 mb-10">
          Help others recognize you on the course
        </Text>

        {/* Profile Image Preview */}
        <View className="items-center mb-8">
          <View className="w-32 h-32 rounded-full bg-gray-100 items-center justify-center overflow-hidden border-2 border-gray-200">
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-gray-200 items-center justify-center">
                <ImageIcon size={40} color={COLORS.textSub} strokeWidth={1.5} />
              </View>
            )}
          </View>
        </View>

        {/* Action Button */}
        <View>
          <TouchableOpacity
            className="h-14 bg-gray-50 rounded-md flex-row items-center justify-center gap-3"
            onPress={handleChoosePhoto}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <>
                <ImageIcon size={20} color={COLORS.textMain} strokeWidth={2} />
                <Text className="text-base font-semibold text-gray-900">
                  {imageUri ? "Change image" : "Add image"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Button */}
      <View className="px-6 pb-8">
        <TouchableOpacity
          className="h-14 rounded-md items-center justify-center"
          style={{ backgroundColor: COLORS.primary }}
          onPress={imageUri ? handleNext : handleSkip}
          activeOpacity={0.8}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: COLORS.white }}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
