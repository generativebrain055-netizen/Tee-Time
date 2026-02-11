import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import type { NamePageProps } from "../../types";
import { ONBOARDING_COLORS as COLORS } from "./constants";

export const NamePage: React.FC<NamePageProps> = ({
  onNext,
  onBack,
  initialData = {},
}) => {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState<string>(initialData.firstName || "");
  const [lastName, setLastName] = useState<string>(initialData.lastName || "");
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);

  const isValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;

  const handleNext = (): void => {
    if (!isValid) return;
    Keyboard.dismiss();
    onNext({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top > 0 ? 0 : 16 }}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 px-6">
            {/* Header */}
            <View className="h-14 justify-center">
              <TouchableOpacity className="w-10 h-10 justify-center" onPress={onBack}>
                <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View className="flex-1 pt-4">
              <Text className="text-[28px] font-bold text-gray-900 mb-2">
                What's your name?
              </Text>

              {/* Form - Side by Side Inputs */}
              <View className="flex-row gap-3 mt-6">
                <View className="flex-1">
                  <Text className="text-[13px] font-medium text-gray-600 mb-2">
                    First name
                  </Text>
                  <TextInput
                    className={`h-14 bg-white border-2 rounded-md px-4 text-base text-gray-900 ${
                      firstNameFocused ? 'border-green-500' : 'border-gray-200'
                    }`}
                    placeholder="Blake"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={firstName}
                    onChangeText={setFirstName}
                    onFocus={() => setFirstNameFocused(true)}
                    onBlur={() => setFirstNameFocused(false)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-[13px] font-medium text-gray-600 mb-2">
                    Last name
                  </Text>
                  <TextInput
                    className={`h-14 bg-white border-2 rounded-md px-4 text-base text-gray-900 ${
                      lastNameFocused ? 'border-green-500' : 'border-gray-200'
                    }`}
                    placeholder="Hylen"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={lastName}
                    onChangeText={setLastName}
                    onFocus={() => setLastNameFocused(true)}
                    onBlur={() => setLastNameFocused(false)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                  />
                </View>
              </View>
            </View>

            {/* Bottom Section */}
            <View className="pb-8">
              <TouchableOpacity
                className="h-14 rounded-md items-center justify-center"
                style={{ 
                  backgroundColor: isValid ? COLORS.primary : COLORS.primary,
                  opacity: isValid ? 1 : 0.5 
                }}
                onPress={handleNext}
                disabled={!isValid}
                activeOpacity={0.8}
              >
                <Text className="text-base font-semibold text-white">
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};
