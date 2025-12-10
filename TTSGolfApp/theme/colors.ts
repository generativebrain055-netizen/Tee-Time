// Theme Colors - Single source of truth for app colors

export interface Colors {
  // Primary brand colors
  primary: string;
  primaryDark: string;
  primaryDarker: string;
  primaryLight: string;

  // Button colors
  buttonPrimary: string;
  buttonShadow: string;

  // Gradient colors
  gradientStart: string;
  gradientMiddle: string;
  gradientEnd: string;

  // Neutral colors
  white: string;
  black: string;
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceDark: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textLight: string;
  textWhite: string;

  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;

  // UI element colors
  placeholder: string;
  border: string;
  divider: string;
  disabled: string;
  overlay: string;

  // Shadow colors
  shadow: string;
  shadowPrimary: string;
}

export const colors: Colors = {
  // Primary brand colors
  primary: "#5EBC68",
  primaryDark: "#4CAF50",
  primaryDarker: "#43A047",
  primaryLight: "#E8F5E9",

  // Button colors
  buttonPrimary: "#5EBC68",
  buttonShadow: "#4CAF50",

  // Gradient colors
  gradientStart: "#5EBC68",
  gradientMiddle: "#4CAF50",
  gradientEnd: "#43A047",

  // Neutral colors
  white: "#FFFFFF",
  black: "#000000",
  background: "#FFFFFF",
  surface: "#F5F5F5",
  surfaceLight: "#F8F8F8",
  surfaceDark: "#E0E0E0",

  // Text colors
  textPrimary: "#1a1a1a",
  textSecondary: "#666666",
  textTertiary: "#999999",
  textLight: "rgba(255, 255, 255, 0.9)",
  textWhite: "#FFFFFF",

  // Status colors
  success: "#2E7D32",
  error: "#D32F2F",
  warning: "#F57C00",
  info: "#1976D2",

  // UI element colors
  placeholder: "#B0B0B0",
  border: "#E0E0E0",
  divider: "#F5F5F5",
  disabled: "#C0C0C0",
  overlay: "rgba(0, 0, 0, 0.5)",

  // Shadow colors
  shadow: "#000000",
  shadowPrimary: "#4CAF50",
};

export interface Gradients {
  primary: string[];
  primaryReverse: string[];
}

// Gradient presets
export const gradients: Gradients = {
  primary: [colors.gradientStart, colors.gradientMiddle, colors.gradientEnd],
  primaryReverse: [
    colors.gradientEnd,
    colors.gradientMiddle,
    colors.gradientStart,
  ],
};

export default colors;
