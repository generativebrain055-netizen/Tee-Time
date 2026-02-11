import React from "react";
import { View, Text, TextInput } from "react-native";
import { COLORS } from "../../constants/colors";

interface InputFieldProps {
    label: string;
    value: string;
    onChangeText?: (text: string) => void;
    keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
    editable?: boolean;
    isEditMode: boolean;
    maxLength?: number;
}

export default function InputField({
    label,
    value,
    onChangeText,
    keyboardType = "default",
    editable = true,
    isEditMode,
    maxLength,
}: InputFieldProps) {
    return (
        <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">{label}</Text>
            {isEditMode && editable ? (
                <TextInput
                    className="bg-gray-100 rounded-md px-4 py-3.5 text-base text-gray-900 border border-gray-200"
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor={COLORS.placeholder}
                    maxLength={maxLength}
                />
            ) : (
                <View className="bg-gray-100 rounded-md px-4 py-3.5 border border-gray-200">
                    <Text className="text-base text-gray-900">{value || "Not set"}</Text>
                </View>
            )}
        </View>
    );
}
