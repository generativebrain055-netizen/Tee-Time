/**
 * Create your account – SSO sign-up (Figma: first name, last name, email, phone, Finish setup)
 * Shown after Playing preferences in SSO flow.
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { ONBOARDING_COLORS as COLORS } from "./constants";

export interface CreateYourAccountPageProps {
  onBack: () => void;
  onFinishSetup: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  }) => void;
  initialFirstName?: string;
  initialLastName?: string;
  initialEmail?: string;
  initialPhoneNumber?: string;
  isSubmitting?: boolean;
}

export function CreateYourAccountPage({
  onBack,
  onFinishSetup,
  initialFirstName = "",
  initialLastName = "",
  initialEmail = "",
  initialPhoneNumber = "",
  isSubmitting = false,
}: CreateYourAccountPageProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);

  const formatPhone = (text: string): string => {
    const digits = text.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (text: string): void => {
    setPhoneNumber(formatPhone(text));
  };

  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phoneNumber.replace(/\D/g, "").length >= 10;

  const handleFinishSetup = (): void => {
    if (!isValid || isSubmitting) return;
    onFinishSetup({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.replace(/\D/g, ""),
    });
  };

  return (
    <View
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top > 0 ? 0 : 16 }}
      pointerEvents="box-none"
    >
      <StatusBar style="dark" />
      <View className="flex-1">
        <View className="flex-1 px-6" pointerEvents="box-none">
          <View className="h-14 flex-row items-center">
            <TouchableOpacity className="w-10 h-10 justify-center items-start" onPress={onBack}>
              <ArrowLeft size={24} color={COLORS.black} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardDismissMode="on-drag"
            nestedScrollEnabled
          >
            <Text className="text-[28px] font-bold text-gray-900 mb-2">Create your account</Text>
            <Text className="text-[15px] text-gray-500 leading-[22px] mb-8">
              We'll use this info to connect you with friends
            </Text>

            <View className="flex-row gap-4 mb-4">
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-gray-900 mb-2">
                  First name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className="h-14 bg-white rounded-md border border-gray-200 px-4 text-base text-gray-900"
                  placeholder="John"
                  placeholderTextColor="#9CA3AF"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  editable
                  selectTextOnFocus={false}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-gray-900 mb-2">
                  Last name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  ref={lastNameRef}
                  className="h-14 bg-white rounded-md border border-gray-200 px-4 text-base text-gray-900"
                  placeholder="Smith"
                  placeholderTextColor="#9CA3AF"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  editable
                  selectTextOnFocus={false}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-[15px] font-medium text-gray-900 mb-2">
                Email address <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                ref={emailRef}
                className="h-14 bg-white rounded-md border border-gray-200 px-4 text-base text-gray-900"
                placeholder="e.g. name@domain.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                editable
                selectTextOnFocus={false}
              />
            </View>

            <View className="mb-6">
              <Text className="text-[15px] font-medium text-gray-900 mb-2">
                Phone number <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                ref={phoneRef}
                className="h-14 bg-white rounded-md border border-gray-200 px-4 text-base text-gray-900"
                placeholder="(555) 123-4567"
                placeholderTextColor="#9CA3AF"
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={14}
                editable
                selectTextOnFocus={false}
              />
            </View>
          </ScrollView>

          <View className="pb-8">
            <TouchableOpacity
              className={`h-14 rounded-md justify-center items-center ${!isValid || isSubmitting ? "opacity-60 bg-primary" : "bg-primary"}`}
              onPress={handleFinishSetup}
              disabled={!isValid || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Finish setup</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
