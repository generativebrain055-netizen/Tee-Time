import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Animated,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
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
        className="w-full h-[54px] bg-primary rounded-md justify-center items-center"
        style={[
          disabled && { backgroundColor: colors.disabled, shadowOpacity: 0.1 },
          {
            shadowColor: colors.buttonShadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          },
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <View className="flex-row items-center justify-center gap-2">
            {icon && iconPosition === "left" && (
              <Ionicons
                name={icon as any}
                size={18}
                color={colors.white}
                className="mr-1"
              />
            )}
            <Text className="text-white text-lg font-bold" style={textStyle}>{title}</Text>
            {icon && iconPosition === "right" && (
              <Ionicons
                name={icon as any}
                size={18}
                color={colors.white}
                className="ml-1"
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
        className="w-full h-[54px] bg-surface-secondary rounded-md justify-center items-center"
        style={disabled && { opacity: 0.5 }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color={colors.textPrimary} size="small" />
        ) : (
          <View className="flex-row items-center justify-center gap-2">
            {icon && iconPosition === "left" && (
              <Ionicons
                name={icon as any}
                size={18}
                color={colors.textPrimary}
                className="mr-1"
              />
            )}
            <Text className="text-text-primary text-lg font-bold" style={textStyle}>{title}</Text>
            {icon && iconPosition === "right" && (
              <Ionicons
                name={icon as any}
                size={18}
                color={colors.textPrimary}
                className="ml-1"
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
      className="py-2 px-4"
      style={style}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Text
        className="text-base font-semibold"
        style={[
          { color },
          disabled && { opacity: 0.5 },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default { PrimaryButton, SecondaryButton, TextButton };
