import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

interface InputFieldProps {
    label: string;
    value: string;
    onChangeText?: (text: string) => void;
    keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
    editable?: boolean;
    isEditMode: boolean;
}

export default function InputField({
    label,
    value,
    onChangeText,
    keyboardType = "default",
    editable = true,
    isEditMode,
}: InputFieldProps) {
    return (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            {isEditMode && editable ? (
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor={COLORS.placeholder}
                />
            ) : (
                <View style={styles.inputDisplay}>
                    <Text style={styles.inputValue}>{value || "Not set"}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.secondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textMain,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    inputDisplay: {
        backgroundColor: COLORS.secondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    inputValue: {
        fontSize: 16,
        color: COLORS.textMain,
    },
});
