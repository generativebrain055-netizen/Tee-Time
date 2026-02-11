/**
 * React Native Paper Theme - Material Design 3
 * Uses Plus Jakarta Sans throughout, derives from design tokens
 * Supports both Light and Dark modes
 */
import { MD3LightTheme, MD3DarkTheme, configureFonts } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import { fontFamilies, typeScale } from "./fonts";
import { colorTokens } from "./tokens";

// --------------------------------------------------------------------------
// Paper font configuration (MD3 type scale → Plus Jakarta Sans)
// --------------------------------------------------------------------------
const fontConfig = {
  displayLarge: typeScale.displayLarge,
  displayMedium: typeScale.displayMedium,
  displaySmall: typeScale.displaySmall,
  headlineLarge: typeScale.headlineLarge,
  headlineMedium: typeScale.headlineMedium,
  headlineSmall: typeScale.headlineSmall,
  titleLarge: typeScale.titleLarge,
  titleMedium: typeScale.titleMedium,
  titleSmall: typeScale.titleSmall,
  bodyLarge: typeScale.bodyLarge,
  bodyMedium: typeScale.bodyMedium,
  bodySmall: typeScale.bodySmall,
  labelLarge: typeScale.labelLarge,
  labelMedium: typeScale.labelMedium,
  labelSmall: typeScale.labelSmall,
  default: {
    fontFamily: fontFamilies.regular,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
};

const fonts = configureFonts({ config: fontConfig });

// --------------------------------------------------------------------------
// LIGHT Color palette mapped to Paper's MD3 scheme
// --------------------------------------------------------------------------
const lightColors: MD3Theme["colors"] = {
  ...MD3LightTheme.colors,

  // Primary
  primary: colorTokens.brand.primary,
  onPrimary: colorTokens.brand.onPrimary,
  primaryContainer: colorTokens.brand.primaryContainer,
  onPrimaryContainer: colorTokens.brand.onPrimaryContainer,

  // Secondary
  secondary: "#4A9C63",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E8F5E9",
  onSecondaryContainer: "#1B5E20",

  // Tertiary
  tertiary: colorTokens.semantic.info,
  onTertiary: "#FFFFFF",
  tertiaryContainer: colorTokens.semantic.infoContainer,
  onTertiaryContainer: colorTokens.semantic.onInfoContainer,

  // Error
  error: colorTokens.semantic.error,
  onError: colorTokens.semantic.onError,
  errorContainer: colorTokens.semantic.errorContainer,
  onErrorContainer: colorTokens.semantic.onErrorContainer,

  // Surfaces
  background: colorTokens.neutral.background,
  onBackground: colorTokens.text.primary,
  surface: colorTokens.neutral.background,
  onSurface: colorTokens.text.primary,
  surfaceVariant: colorTokens.neutral.surfaceVariant,
  onSurfaceVariant: colorTokens.text.secondary,
  surfaceDisabled: "rgba(28, 28, 30, 0.12)",
  onSurfaceDisabled: "rgba(28, 28, 30, 0.38)",

  // Outline
  outline: colorTokens.neutral.outline,
  outlineVariant: colorTokens.neutral.outlineVariant,

  // Inverse
  inverseSurface: "#1C1C1E",
  inverseOnSurface: "#F5F5F5",
  inversePrimary: "#A5D6A7",

  // Misc
  shadow: "rgba(0, 0, 0, 0.08)",
  scrim: "rgba(0, 0, 0, 0.32)",
  backdrop: colorTokens.overlay.medium,
  elevation: {
    level0: "transparent",
    level1: "#F6F9F6",
    level2: "#F0F5F0",
    level3: "#EBF1EB",
    level4: "#E8EFE8",
    level5: "#E5ECE5",
  },
};

// --------------------------------------------------------------------------
// DARK Color palette
// --------------------------------------------------------------------------
const darkColors: MD3Theme["colors"] = {
  ...MD3DarkTheme.colors,

  // Primary – brighter green for dark backgrounds
  primary: "#7BC88E",
  onPrimary: "#003919",
  primaryContainer: "#1B5E20",
  onPrimaryContainer: "#A5D6A7",

  // Secondary
  secondary: "#8DD49D",
  onSecondary: "#003919",
  secondaryContainer: "#1B5E20",
  onSecondaryContainer: "#C8E6C9",

  // Tertiary
  tertiary: "#93C5FD",
  onTertiary: "#002B5C",
  tertiaryContainer: "#1E3A5F",
  onTertiaryContainer: "#BFDBFE",

  // Error
  error: "#F87171",
  onError: "#601010",
  errorContainer: "#7F1D1D",
  onErrorContainer: "#FECACA",

  // Surfaces
  background: "#121212",
  onBackground: "#E5E5E5",
  surface: "#1E1E1E",
  onSurface: "#E5E5E5",
  surfaceVariant: "#2A2A2A",
  onSurfaceVariant: "#BFBFBF",
  surfaceDisabled: "rgba(255, 255, 255, 0.12)",
  onSurfaceDisabled: "rgba(255, 255, 255, 0.38)",

  // Outline
  outline: "#444444",
  outlineVariant: "#333333",

  // Inverse
  inverseSurface: "#E5E5E5",
  inverseOnSurface: "#1C1C1E",
  inversePrimary: "#2E7D32",

  // Misc
  shadow: "rgba(0, 0, 0, 0.3)",
  scrim: "rgba(0, 0, 0, 0.6)",
  backdrop: "rgba(0, 0, 0, 0.7)",
  elevation: {
    level0: "transparent",
    level1: "#1E1E1E",
    level2: "#232323",
    level3: "#272727",
    level4: "#2C2C2C",
    level5: "#313131",
  },
};

// --------------------------------------------------------------------------
// Assemble themes
// --------------------------------------------------------------------------
export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: lightColors,
  fonts,
  roundness: 12,
};

export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: darkColors,
  fonts,
  roundness: 12,
};

export default paperTheme;
