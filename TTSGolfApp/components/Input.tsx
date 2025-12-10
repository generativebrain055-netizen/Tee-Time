import React from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  KeyboardTypeOptions,
} from "react-native";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  inputHeight,
} from "../theme";

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

interface Styles {
  container: ViewStyle;
  label: TextStyle;
  input: TextStyle;
  inputCentered: TextStyle;
  inputMultiline: TextStyle;
  inputError: ViewStyle;
  inputDisabled: TextStyle;
  errorText: TextStyle;
  otpContainer: ViewStyle;
  otpInput: TextStyle;
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
    <View style={[styles.container, style, containerStyle]}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          centered && styles.inputCentered,
          multiline && styles.inputMultiline,
          error && styles.inputError,
          !editable && styles.inputDisabled,
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
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
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
    <View style={[styles.otpContainer, style]}>
      <RNTextInput
        style={styles.otpInput}
        placeholder={"0".repeat(actualMaxLength)}
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={actualMaxLength}
        autoFocus
      />
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    width: "100%",
    height: inputHeight.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxl,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  inputCentered: {
    textAlign: "center",
  },
  inputMultiline: {
    height: "auto",
    minHeight: inputHeight.lg,
    paddingVertical: spacing.lg,
    textAlignVertical: "top",
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceDark,
    color: colors.textTertiary,
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  // OTP Input
  otpContainer: {
    width: "100%",
  },
  otpInput: {
    width: "100%",
    height: inputHeight.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxl,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.semibold as TextStyle["fontWeight"],
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: 8,
  },
});

export default { TextInput, OTPInput };
