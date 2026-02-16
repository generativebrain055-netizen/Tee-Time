import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, ChevronDown, Check } from "lucide-react-native";
import type { PreferencesPageProps, PreferencesData } from "../../types";
import { ONBOARDING_COLORS as COLORS } from "./constants";

interface DropdownOption {
  label: string;
  value: string;
}

const TIME_OPTIONS: DropdownOption[] = [
  { label: "Morning", value: "morning" },
  { label: "Late morning", value: "late_morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Late afternoon", value: "late_afternoon" },
  { label: "Evening", value: "evening" },
];

const PLAY_STYLE_OPTIONS: DropdownOption[] = [
  { label: "Walk", value: "walk" },
  { label: "Ride", value: "ride" },
  { label: "Either", value: "either" },
];

const GOLF_VIBE_OPTIONS: DropdownOption[] = [
  { label: "Weekend warrior", value: "weekend_warrior" },
  { label: "Competitive player", value: "competitive" },
  { label: "Casual golfer", value: "casual" },
  { label: "Scratch golfer", value: "scratch" },
];


interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  zIndex?: number;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select...",
  zIndex = 1,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = useCallback((optionValue: string) => {
    onSelect(optionValue);
    setIsOpen(false);
  }, [onSelect]);

  return (
    <View className="mb-6" style={{ zIndex: isOpen ? zIndex : 1 }}>
      <Text className="text-[15px] font-medium text-gray-900 mb-[10px]">{label}</Text>
      <View style={{ position: 'relative' }}>
        <TouchableOpacity
          className="flex-row items-center justify-between h-14 bg-white rounded-md border border-gray-200 px-4"
          onPress={() => setIsOpen(!isOpen)}
          activeOpacity={0.7}
        >
          <Text
            className={`text-base ${!selectedOption ? "text-gray-400" : "text-gray-900"}`}
          >
            {selectedOption?.label || placeholder}
          </Text>
          <ChevronDown 
            size={20} 
            color={COLORS.textSub}
            style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {/* Inline Dropdown Options */}
        {isOpen && (
          <View 
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              backgroundColor: 'white',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
              zIndex: zIndex,
            }}
          >
            {options.map((item, index) => (
              <TouchableOpacity
                key={item.value}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderBottomWidth: index < options.length - 1 ? 1 : 0,
                  borderBottomColor: '#F3F4F6',
                  backgroundColor: item.value === value ? '#F0FDF4' : 'white',
                }}
                onPress={() => handleSelect(item.value)}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: item.value === value ? COLORS.primary : '#111827',
                    fontWeight: item.value === value ? '600' : '400',
                  }}
                >
                  {item.label}
                </Text>
                {item.value === value && (
                  <Check size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export const PreferencesPage: React.FC<PreferencesPageProps> = ({
  onNext,
  onBack,
  initialPreferences = {},
}) => {
  const insets = useSafeAreaInsets();
  const [preferredTime, setPreferredTime] = useState<string>(
    initialPreferences.preferredTimes?.join(",") || ""
  );
  const [playStyle, setPlayStyle] = useState<string>(
    initialPreferences.playStyle || ""
  );
  const [golfVibe, setGolfVibe] = useState<string>(
    initialPreferences.playingPartnerPreference || ""
  );
  const [drinkOfChoice, setDrinkOfChoice] = useState<string>(
    initialPreferences.drinkOfChoice || ""
  );

  const isValid = preferredTime !== "" && playStyle !== "" && golfVibe !== "";

  const handleNext = useCallback((): void => {
    // Validation handled by button disabled state

    if (!isValid) {
      return;
    }

    const preferencesData: PreferencesData = {
      playStyle: playStyle as "walk" | "ride" | "either",
      preferredTimes: preferredTime.split(","),
      playingPartnerPreference: golfVibe,
      drinkOfChoice: drinkOfChoice.trim() || undefined,
    };

    onNext({ preferences: preferencesData });
  }, [isValid, playStyle, preferredTime, golfVibe, drinkOfChoice, onNext]);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top > 0 ? 0 : 16 }}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-6">
          <View className="h-14 flex-row items-center justify-between">
            <TouchableOpacity className="w-10 h-10 justify-center items-start" onPress={onBack}>
              <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            className="flex-1 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <Text className="text-[28px] font-bold text-gray-900 mb-2">Playing preferences</Text>
            <Text className="text-[15px] text-gray-500 leading-[22px] mb-8">Tell us how you like to play</Text>

            {/* Order: url-3 → url-4 → url-5 → url-6 → url-7 → url-8 → url-9 (Figma flow) */}
            <Dropdown
              label="What time of day do you like to play?"
              value={preferredTime}
              options={TIME_OPTIONS}
              onSelect={setPreferredTime}
              placeholder="Select time..."
              zIndex={105}
            />

            <Dropdown
              label="Do you prefer to walk or ride?"
              value={playStyle}
              options={PLAY_STYLE_OPTIONS}
              onSelect={setPlayStyle}
              placeholder="Select preference..."
              zIndex={104}
            />

            <Dropdown
              label="What's your golf vibe?"
              value={golfVibe}
              options={GOLF_VIBE_OPTIONS}
              onSelect={setGolfVibe}
              placeholder="Select..."
              zIndex={103}
            />

            <View className="mb-6" style={{ zIndex: 1 }}>
              <Text className="text-[15px] font-medium text-gray-900 mb-[10px]">What's your drink of choice?</Text>
              <TextInput
                className="h-14 bg-white rounded-md border border-gray-200 px-4 text-base text-gray-900"
                placeholder="e.g. Transfusion"
                placeholderTextColor="#9CA3AF"
                value={drinkOfChoice}
                onChangeText={setDrinkOfChoice}
              />
            </View>
          </ScrollView>

          <View className="pb-8">
            <TouchableOpacity
              className={`h-14 bg-primary rounded-md justify-center items-center ${!isValid ? "opacity-60" : ""}`}
              onPress={handleNext}
              disabled={!isValid}
              activeOpacity={0.8}
            >
              <Text className="text-base font-semibold text-white">Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
