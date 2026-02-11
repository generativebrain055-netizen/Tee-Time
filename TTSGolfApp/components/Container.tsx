import React from "react";
import {
  View,
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

/**
 * Gradient Header Component
 * Used in Login/Signup screens
 */
export const GradientHeader: React.FC<GradientHeaderProps> = ({
  children,
  style,
}) => {
  return (
    <View 
      className="pb-20"
      style={[{ paddingTop: platform.statusBarHeight }, style]}
    >
      {children}
    </View>
  );
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
  const cardClassName = "flex-1 bg-white rounded-md mx-5 mb-5 px-8 pt-12 pb-6";
  const shadowStyle = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 15,
  };

  if (animated) {
    return (
      <Animated.View className={cardClassName} style={[shadowStyle, style]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <View className={cardClassName} style={[shadowStyle, style]}>
      {children}
    </View>
  );
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
      className="flex-1"
      style={style}
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
      className="justify-center items-center mb-6"
      style={[
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
    <View 
      className="bg-white rounded-md justify-center items-center"
      style={[
        { width, height },
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 10,
        },
        style,
      ]}
    >
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

export default {
  GradientHeader,
  Card,
  GradientContainer,
  IconContainer,
  LogoBox,
};
