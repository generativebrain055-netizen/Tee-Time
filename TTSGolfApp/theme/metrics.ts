import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

export interface Spacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  huge: number;
  massive: number;
}

// Spacing scale (multiples of 4)
export const spacing: Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 60,
};

export interface BorderRadius {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  full: number;
}

// Border radius scale
export const borderRadius: BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  full: 9999,
};

export interface FontSize {
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  huge: number;
  massive: number;
  giant: number;
}

// Font sizes
export const fontSize: FontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  huge: 28,
  massive: 32,
  giant: 42,
};

export interface FontWeight {
  normal: string;
  medium: string;
  semibold: string;
  bold: string;
  extrabold: string;
}

// Font weights
export const fontWeight: FontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
};

export interface LineHeight {
  tight: number;
  normal: number;
  relaxed: number;
  loose: number;
}

// Line heights
export const lineHeight: LineHeight = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
};

export interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface Shadows {
  sm: Shadow;
  md: Shadow;
  lg: Shadow;
  large: Shadow;
  xl: Shadow;
  button: Shadow;
}

// Shadows
export const shadows: Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  button: {
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};

export interface Screen {
  width: number;
  height: number;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
}

// Screen dimensions
export const screen: Screen = {
  width,
  height,
  isSmall: width < 375,
  isMedium: width >= 375 && width < 414,
  isLarge: width >= 414,
};

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  statusBarHeight: number;
}

// Platform specific
export const platform: PlatformInfo = {
  isIOS: Platform.OS === "ios",
  isAndroid: Platform.OS === "android",
  statusBarHeight: Platform.OS === "android" ? 40 : 0,
};

export interface Animation {
  fast: number;
  normal: number;
  slow: number;
  verySlow: number;
  splash: number;
}

// Animation durations
export const animation: Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
  splash: 1500,
};

export interface InputHeight {
  sm: number;
  md: number;
  lg: number;
}

// Common input height
export const inputHeight: InputHeight = {
  sm: 44,
  md: 52,
  lg: 58,
};

export default {
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  screen,
  platform,
  animation,
  inputHeight,
};
