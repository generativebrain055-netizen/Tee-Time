/**
 * OAuthPhoneEntryScreen
 * Collects phone number from new OAuth users and sends SMS magic link for verification
 * 
 * Flow:
 * 1. User signs in with Google/Apple (new user)
 * 2. Backend returns pending_phone_verification status
 * 3. This screen collects phone number
 * 4. Sends SMS magic link
 * 5. Navigates to MagicLinkVerificationScreen
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, User } from "lucide-react-native";

import CountryPicker, { Country, COUNTRIES } from "../../components/CountryPicker";
import { requestSmsMagicLink } from "../../utils/smsMagicLink";
import { ONBOARDING_COLORS as COLORS } from "./constants";

interface OAuthPhoneEntryProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
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

export function OAuthPhoneEntryScreen({
  navigation,
  route,
}: OAuthPhoneEntryProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const providerData = route?.params?.providerData;

  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES.find(c => c.code === "US") || COUNTRIES[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phoneRef = useRef<TextInput>(null);

  // Validation
  const rawDigits = phoneNumber.replace(/\D/g, "");
  const normalizedDigits = rawDigits.startsWith('0') ? rawDigits.slice(1) : rawDigits;
  const isPhoneValid = normalizedDigits.length >= selectedCountry.minLength && 
    normalizedDigits.length <= selectedCountry.maxLength;

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text.replace(/\D/g, ""));
  };

  const getRawPhoneNumber = () => {
    return selectedCountry.dialCode + normalizedDigits;
  };

  const handleSendVerification = async () => {
    if (!isPhoneValid || isSubmitting) return;

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      const fullPhoneNumber = getRawPhoneNumber();
      console.log("[OAuthPhoneEntry] Sending SMS magic link to:", fullPhoneNumber);

      const result = await requestSmsMagicLink(fullPhoneNumber);

      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to send verification link");
        setIsSubmitting(false);
        return;
      }

      console.log("[OAuthPhoneEntry] SMS sent successfully, navigating to verification screen");

      // Navigate to magic link verification screen
      navigation.navigate("OAuthMagicLinkVerification", {
        phoneNumber: fullPhoneNumber,
        providerData,
      });

    } catch (error) {
      console.error("[OAuthPhoneEntry] Error:", error);
      Alert.alert("Error", "Failed to send verification link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const firstName = providerData?.first_name || providerData?.firstName || "";
  const lastName = providerData?.last_name || providerData?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const profilePicture = providerData?.picture;

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
          <View className="flex-1 px-6">
            {/* Profile Picture */}
            {profilePicture && (
              <View className="items-center mb-6">
                <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center overflow-hidden border-2 border-gray-200">
                  <Image
                    source={{ uri: profilePicture }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                {fullName && (
                  <Text className="text-base text-gray-700 mt-2 font-medium">
                    {fullName}
                  </Text>
                )}
              </View>
            )}

            {/* Title */}
            <Text className="text-[28px] font-bold text-gray-900 mb-2">
              Verify your phone number
            </Text>
            <Text className="text-[15px] text-gray-500 mb-8 leading-6">
              We'll text you a link to verify your phone number
            </Text>

            {/* Phone Number Input */}
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
                  autoFocus
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View
          className="px-6 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        >
          <TouchableOpacity
            className={`h-14 rounded-md justify-center items-center ${
              isPhoneValid && !isSubmitting 
                ? "bg-green-500" : "bg-green-300"
            }`}
            onPress={handleSendVerification}
            disabled={!isPhoneValid || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text className="text-white text-sm ml-2">
                  Sending...
                </Text>
              </View>
            ) : (
              <Text className="text-white text-base font-semibold">
                Send Verification Link
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

export default OAuthPhoneEntryScreen;
