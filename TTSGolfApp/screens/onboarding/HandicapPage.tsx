import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, AlertCircle, HelpCircle } from "lucide-react-native";
import type { HandicapPageProps } from "../../types";
import { ONBOARDING_COLORS as COLORS } from "./constants";

export const HandicapPage: React.FC<HandicapPageProps> = ({
  onNext,
  onBack,
  initialHandicap = "",
}) => {
  const insets = useSafeAreaInsets();
  const [handicap, setHandicap] = useState<string>(initialHandicap);
  const [error, setError] = useState<string>("");

  const validateHandicap = (value: string): boolean => {
    if (value === "") return true;

    const num = parseFloat(value);
    if (isNaN(num)) {
      setError("Please enter a valid number");
      return false;
    }
    if (num < -10 || num > 54) {
      setError("Handicap must be between -10 and 54");
      return false;
    }
    setError("");
    return true;
  };

  const handleChange = (text: string): void => {
    const cleaned = text.replace(/[^0-9.-]/g, "");
    setHandicap(cleaned);
    validateHandicap(cleaned);
  };

  const handleNext = (): void => {
    if (!validateHandicap(handicap)) return;
    Keyboard.dismiss();
    const handicapValue = handicap !== "" ? parseFloat(handicap) : null;
    onNext({ handicap: handicapValue });
  };

  const isValid = handicap === "" || (error === "" && handicap !== "");

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top > 0 ? 0 : 16 }}>
      <StatusBar style="dark" />

      <View className="flex-1">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 px-6">
            {/* Header */}
            <View className="h-14 flex-row justify-between items-center">
              <TouchableOpacity className="w-10 h-10 justify-center items-start" onPress={onBack}>
                <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View className="flex-1 pt-4">
              <Text className="text-[28px] font-bold text-gray-900 mb-2">What's your handicap?</Text>
              <Text className="text-[15px] text-gray-500 leading-[22px] mb-10">
                This helps us match you with players of similar skill
              </Text>

              {/* Form */}
              <View className="mb-6">
                <Text className="text-[13px] font-semibold text-gray-500 mb-2">Handicap index</Text>
                <TextInput
                  className={`h-14 bg-gray-50 rounded-md px-4 text-base text-gray-900 ${error ? "border border-red-500" : ""}`}
                  placeholder="Enter your handicap (e.g., 12.5)"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={handicap}
                  onChangeText={handleChange}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
                {error ? (
                  <View className="flex-row items-center gap-[6px] mt-2">
                    <AlertCircle size={14} color={COLORS.error} />
                    <Text className="text-[13px] text-red-500">{error}</Text>
                  </View>
                ) : null}
              </View>

              {/* Info Card */}
              <View className="flex-row bg-green-50 rounded-md p-4 gap-3 mb-6">
                <HelpCircle size={24} color={COLORS.primary} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900 mb-1">Don't have a handicap?</Text>
                  <Text className="text-sm text-gray-500 leading-5">
                    No worries! You can skip this for now and add it later in your profile settings.
                  </Text>
                </View>
              </View>

              {/* Range Hints */}
              <View className="flex-row justify-around py-4 border-t border-gray-200">
                <View className="items-center">
                  <Text className="text-xs text-gray-500 mb-1">Scratch</Text>
                  <Text className="text-base font-semibold text-primary">0</Text>
                </View>
                <View className="items-center">
                  <Text className="text-xs text-gray-500 mb-1">Average</Text>
                  <Text className="text-base font-semibold text-primary">15-20</Text>
                </View>
                <View className="items-center">
                  <Text className="text-xs text-gray-500 mb-1">Beginner</Text>
                  <Text className="text-base font-semibold text-primary">25+</Text>
                </View>
              </View>
            </View>

            {/* Bottom Section */}
            <View className="pb-8">
              <TouchableOpacity
                className={`h-14 bg-primary rounded-md justify-center items-center ${!isValid ? "opacity-60" : ""}`}
                onPress={handleNext}
                disabled={!isValid}
                activeOpacity={0.8}
              >
                <Text className="text-base font-semibold text-white">
                  {handicap ? "Next" : "Skip"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
};
