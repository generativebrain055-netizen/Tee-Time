import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import type { PhotoZipPageProps } from "../../types";

// Figma colors: primary #5EBC68, photo fill #D5FBE2, stroke #5EBC68
const COLORS = {
  primary: "#5EBC68",
  photoFill: "#D5FBE2",
  white: "#FFFFFF",
  black: "#000000",
  textMain: "#1A1A1A",
  textSub: "#6B7280",
  textPlaceholder: "#9CA3AF",
  border: "#E5E7EB",
  surface: "#EEEEEE",
};

export const PhotoZipPage: React.FC<PhotoZipPageProps> = ({
  onNext,
  onBack,
  initialData = {},
  initialProfilePhotoUri,
  initialZipCode,
}) => {
  const insets = useSafeAreaInsets();
  const resolvedPhoto = initialProfilePhotoUri ?? initialData.profilePhotoUri;
  const resolvedZip = initialZipCode ?? initialData.zipCode ?? "";
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | undefined>(
    resolvedPhoto,
  );
  const [profilePhotoBase64, setProfilePhotoBase64] = useState<
    string | undefined
  >(undefined);
  const [zipCode, setZipCode] = useState<string>(resolvedZip);

  const zipRegex = /^\d{5}(-\d{4})?$/;
  const isValidZip =
    zipCode.trim() === "" || zipRegex.test(zipCode.replace(/\s/g, ""));
  const canProceed = isValidZip;

  const pickImage = async (useCamera: boolean) => {
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        useCamera
          ? "Camera permission is required to take a photo."
          : "Photo library permission is required to choose a photo.",
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setProfilePhotoUri(asset.uri);
      // Store base64 for backend upload (data:image/jpeg;base64,...)
      const b64 = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : undefined;
      setProfilePhotoBase64(b64);
    }
  };

  const showImageOptions = () => {
    const options: { text: string; onPress?: () => void; style?: "cancel" | "destructive" }[] = [
      { text: "Take Photo", onPress: () => pickImage(true) },
      { text: "Choose from Library", onPress: () => pickImage(false) },
    ];
    if (profilePhotoUri) {
      options.push({
        text: "Remove Photo",
        onPress: () => {
          setProfilePhotoUri(undefined);
          setProfilePhotoBase64(undefined);
        },
        style: "destructive",
      });
    }
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Add photo", "Choose an option", options);
  };

  const handleNext = (): void => {
    Keyboard.dismiss();
    onNext({
      profilePhotoUri,
      profilePhotoBase64,
      zipCode: zipCode.trim() || undefined,
    });
  };

  const handleSkip = (): void => {
    onNext({
      profilePhotoUri,
      profilePhotoBase64,
      zipCode: undefined,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.title}>Add your photo</Text>
              <Text style={styles.subtitle}>
                Upload a photo and enter your zip code
              </Text>

              {/* Photo Upload - circular, Figma style */}
              <TouchableOpacity
                style={styles.photoContainer}
                onPress={showImageOptions}
                activeOpacity={0.8}
              >
                <View style={[styles.photoCircle, profilePhotoUri && styles.photoCircleFilled]}>
                  {profilePhotoUri ? (
                    <Image
                      source={{ uri: profilePhotoUri }}
                      style={styles.photoImage}
                    />
                  ) : (
                    <Camera
                      size={48}
                      color={COLORS.primary}
                      strokeWidth={2}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {/* Zip Code Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Zip code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12345"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={zipCode}
                  onChangeText={(text) =>
                    setZipCode(text.replace(/[^\d-]/g, "").slice(0, 10))
                  }
                  keyboardType="number-pad"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
              </View>
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !canProceed && styles.nextButtonDisabled,
                ]}
                onPress={handleNext}
                disabled={!canProceed}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    height: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSub,
  },
  mainContent: {
    flex: 1,
    paddingTop: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 8,
    alignSelf: "stretch",
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSub,
    lineHeight: 22,
    marginBottom: 40,
    alignSelf: "stretch",
  },
  photoContainer: {
    marginBottom: 40,
  },
  photoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.photoFill,
    borderWidth: 3.6,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  photoCircleFilled: {
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 65,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSub,
    marginBottom: 8,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textMain,
  },
  bottomSection: {
    paddingBottom: 32,
  },
  nextButton: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
});
