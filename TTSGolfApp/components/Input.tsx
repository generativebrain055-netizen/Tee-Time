import React from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  ViewStyle,
  TextStyle,
  KeyboardTypeOptions,
} from "react-native";
import { colors } from "../theme";

interface TextInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  maxLength?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  error?: string;
  editable?: boolean;
  centered?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  containerStyle?: ViewStyle;
}

interface OTPInputProps {
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
  length?: number;
  style?: ViewStyle;
}

/**
 * Styled Text Input Component
 * Consistent input styling across the app
 */
export const TextInput: React.FC<TextInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  secureTextEntry = false,
  autoCapitalize = "none",
  autoCorrect = false,
  maxLength,
  style,
  inputStyle,
  labelStyle,
  error,
  editable = true,
  centered = false,
  multiline = false,
  numberOfLines = 1,
  containerStyle,
}) => {
  return (
    <View className="mb-6" style={[style, containerStyle]}>
      {label && <Text className="text-base font-bold text-text-primary mb-2" style={labelStyle}>{label}</Text>}
      <RNTextInput
        className="w-full h-14 bg-surface-secondary rounded-md px-6 text-lg text-text-primary"
        style={[
          centered && { textAlign: "center" },
          multiline && { height: "auto", minHeight: 56, paddingVertical: 16, textAlignVertical: "top" },
          error && { borderWidth: 1, borderColor: colors.error },
          !editable && { backgroundColor: "#E8E8E8", color: "#9E9E9E" },
          inputStyle,
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        editable={editable}
        showSoftInputOnFocus={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
      {error && <Text className="mt-1 text-sm" style={{ color: colors.error }}>{error}</Text>}
    </View>
  );
};

/**
 * OTP Input Component
 * Styled for 6-digit OTP entry
 */
export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChangeText,
  maxLength = 6,
  length,
  style,
}) => {
  const actualMaxLength = length || maxLength;

  const handleChange = (text: string): void => {
    // Only allow numeric input
    const numericOnly = text.replace(/\D/g, "");
    onChangeText(numericOnly);
  };

  return (
    <View className="w-full" style={style}>
      <RNTextInput
        className="w-full h-14 bg-surface-secondary rounded-md px-6 text-4xl font-semibold text-text-primary text-center"
        style={[
          { letterSpacing: value ? 8 : 0 },
        ]}
        placeholder={"0".repeat(actualMaxLength)}
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={actualMaxLength}
        autoFocus
        showSoftInputOnFocus
      />
    </View>
  );
};

export default { TextInput, OTPInput };
