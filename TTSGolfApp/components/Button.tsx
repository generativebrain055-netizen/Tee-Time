import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, fontSize, fontWeight } from "../theme";
import { usePressAnimation } from "../hooks/useAnimations";

type IconPosition = "left" | "right";

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: IconPosition;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

interface TextButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

interface Styles {
  primaryButton: ViewStyle;
  buttonDisabled: ViewStyle;
  primaryButtonText: TextStyle;
  secondaryButton: ViewStyle;
  secondaryButtonDisabled: ViewStyle;
  secondaryButtonText: TextStyle;
  textButton: ViewStyle;
  textButtonText: TextStyle;
  textDisabled: TextStyle;
  buttonContent: ViewStyle;
  iconLeft: ViewStyle;
  iconRight: ViewStyle;
}

/**
 * Primary Button Component
 * Green filled button with optional icon and loading state
 */
export const PrimaryButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = "right",
  style,
  textStyle,
}) => {
  const { scaleAnim, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        style={[styles.primaryButton, disabled && styles.buttonDisabled]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <View style={styles.buttonContent}>
            {icon && iconPosition === "left" && (
              <Ionicons
                name={icon as any}
                size={18}
                color={colors.white}
                style={styles.iconLeft}
              />
            )}
            <Text style={[styles.primaryButtonText, textStyle]}>{title}</Text>
            {icon && iconPosition === "right" && (
              <Ionicons
                name={icon as any}
                size={18}
                color={colors.white}
                style={styles.iconRight}
              />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Secondary Button Component
 * Light gray filled button
 */
export const SecondaryButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = "right",
  style,
  textStyle,
}) => {
  const { scaleAnim, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        style={[
          styles.secondaryButton,
          disabled && styles.secondaryButtonDisabled,
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color={colors.textPrimary} size="small" />
        ) : (
          <View style={styles.buttonContent}>
            {icon && iconPosition === "left" && (
              <Ionicons
                name={icon as any}
                size={18}
                color={colors.textPrimary}
                style={styles.iconLeft}
              />
            )}
            <Text style={[styles.secondaryButtonText, textStyle]}>{title}</Text>
            {icon && iconPosition === "right" && (
              <Ionicons
                name={icon as any}
                size={18}
                color={colors.textPrimary}
                style={styles.iconRight}
              />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Text Button Component
 * Simple text-only button (for links)
 */
export const TextButton: React.FC<TextButtonProps> = ({
  title,
  onPress,
  disabled = false,
  color = colors.primary,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      style={[styles.textButton, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Text
        style={[
          styles.textButtonText,
          { color },
          disabled && styles.textDisabled,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create<Styles>({
  // Primary Button
  primaryButton: {
    width: "100%",
    height: 54,
    backgroundColor: colors.buttonPrimary,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.buttonShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
    shadowOpacity: 0.1,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
  },

  // Secondary Button
  secondaryButton: {
    width: "100%",
    height: 54,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
  },

  // Text Button
  textButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  textButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as TextStyle["fontWeight"],
  },
  textDisabled: {
    opacity: 0.5,
  },

  // Shared
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  iconLeft: {
    marginRight: spacing.xs,
  },
  iconRight: {
    marginLeft: spacing.xs,
  },
});

export default { PrimaryButton, SecondaryButton, TextButton };
