import React from "react";
import {
  View,
  StyleSheet,
  Animated,
  Image,
  ViewStyle,
  ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  gradients,
  spacing,
  borderRadius,
  shadows,
  platform,
} from "../theme";

interface GradientHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  animated?: boolean;
}

interface GradientContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface IconContainerProps {
  icon?: string;
  children?: React.ReactNode;
  size?: number;
  iconSize?: number;
  color?: string;
  iconColor?: string;
  style?: ViewStyle;
}

interface LogoBoxProps {
  source?: ImageSourcePropType;
  width?: number;
  height?: number;
  imageWidth?: number;
  imageHeight?: number;
  style?: ViewStyle;
}

interface Styles {
  gradientContainer: ViewStyle;
  headerGradient: ViewStyle;
  card: ViewStyle;
  iconContainer: ViewStyle;
  logoBox: ViewStyle;
}

/**
 * Gradient Header Component
 * Used in Login/Signup screens
 */
export const GradientHeader: React.FC<GradientHeaderProps> = ({
  children,
  style,
}) => {
  return <View style={[styles.headerGradient, style]}>{children}</View>;
};

/**
 * Card Component
 * White rounded card for content areas
 */
export const Card: React.FC<CardProps> = ({
  children,
  style,
  animated = false,
}) => {
  if (animated) {
    return (
      <Animated.View style={[styles.card, style]}>{children}</Animated.View>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
};

/**
 * Full Screen Gradient Container
 * Background gradient that covers entire screen
 */
export const GradientContainer: React.FC<GradientContainerProps> = ({
  children,
  style,
}) => {
  return (
    <LinearGradient
      colors={gradients.primary as any}
      style={[styles.gradientContainer, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

/**
 * Icon Container
 * Circular icon background with Ionicon
 */
export const IconContainer: React.FC<IconContainerProps> = ({
  icon,
  children,
  size = 64,
  iconSize = 32,
  color = colors.primaryLight,
  iconColor = colors.primary,
  style,
}) => {
  return (
    <View
      style={[
        styles.iconContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    >
      {icon && (
        <Ionicons name={icon as any} size={iconSize} color={iconColor} />
      )}
      {children}
    </View>
  );
};

/**
 * Logo Box Component
 * White rounded box for displaying logo with image
 */
export const LogoBox: React.FC<LogoBoxProps> = ({
  source,
  width = 140,
  height = 80,
  imageWidth = 120,
  imageHeight = 60,
  style,
}) => {
  return (
    <View style={[styles.logoBox, { width, height }, style]}>
      {source && (
        <Image
          source={source}
          style={{ width: imageWidth, height: imageHeight }}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
  gradientContainer: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: platform.statusBarHeight,
    paddingBottom: spacing.massive,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxxl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxl,
    ...shadows.xl,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logoBox: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.lg,
  },
});

export default {
  GradientHeader,
  Card,
  GradientContainer,
  IconContainer,
  LogoBox,
};
