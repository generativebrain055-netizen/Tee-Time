/**
 * React Native Paper MD3 Theme — derived from design tokens.
 * Supports light + dark. Plus Jakarta Sans throughout.
 */
import {
  MD3LightTheme,
  MD3DarkTheme,
  configureFonts,
  type MD3Theme,
} from 'react-native-paper';
import { colors, typeScale, fontFamily, radii } from './tokens';

// --------------------------------------------------------------------------
// Font config → Paper MD3 type scale
// --------------------------------------------------------------------------
const fontConfig = {
  ...typeScale,
  default: {
    fontFamily: fontFamily.regular,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
};

const fonts = configureFonts({ config: fontConfig });

// --------------------------------------------------------------------------
// Light theme
// --------------------------------------------------------------------------
const lightColors: MD3Theme['colors'] = {
  ...MD3LightTheme.colors,

  primary: colors.light.primary,
  onPrimary: colors.light.onPrimary,
  primaryContainer: colors.light.primaryContainer,
  onPrimaryContainer: colors.light.onPrimaryContainer,

  secondary: '#4A9C63',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8F5E9',
  onSecondaryContainer: '#1B5E20',

  tertiary: colors.light.info,
  onTertiary: '#FFFFFF',
  tertiaryContainer: colors.light.infoContainer,
  onTertiaryContainer: colors.light.onInfoContainer,

  error: colors.light.error,
  onError: colors.light.onError,
  errorContainer: colors.light.errorContainer,
  onErrorContainer: colors.light.onErrorContainer,

  background: colors.light.background,
  onBackground: colors.light.textPrimary,
  surface: colors.light.surface,
  onSurface: colors.light.textPrimary,
  surfaceVariant: colors.light.surfaceSecondary,
  onSurfaceVariant: colors.light.textSecondary,
  surfaceDisabled: 'rgba(28, 28, 30, 0.12)',
  onSurfaceDisabled: 'rgba(28, 28, 30, 0.38)',

  outline: colors.light.border,
  outlineVariant: colors.light.borderLight,

  inverseSurface: '#1C1C1E',
  inverseOnSurface: '#F5F5F5',
  inversePrimary: '#A5D6A7',

  shadow: 'rgba(0, 0, 0, 0.08)',
  scrim: colors.light.scrim,
  backdrop: colors.light.overlay,

  elevation: {
    level0: 'transparent',
    level1: '#F6F9F6',
    level2: '#F0F5F0',
    level3: '#EBF1EB',
    level4: '#E8EFE8',
    level5: '#E5ECE5',
  },
};

// --------------------------------------------------------------------------
// Dark theme
// --------------------------------------------------------------------------
const darkColors: MD3Theme['colors'] = {
  ...MD3DarkTheme.colors,

  primary: colors.dark.primary,
  onPrimary: colors.dark.onPrimary,
  primaryContainer: colors.dark.primaryContainer,
  onPrimaryContainer: colors.dark.onPrimaryContainer,

  secondary: '#8DD49D',
  onSecondary: '#003919',
  secondaryContainer: '#1B5E20',
  onSecondaryContainer: '#C8E6C9',

  tertiary: colors.dark.info,
  onTertiary: colors.dark.onInfo,
  tertiaryContainer: colors.dark.infoContainer,
  onTertiaryContainer: colors.dark.onInfoContainer,

  error: colors.dark.error,
  onError: colors.dark.onError,
  errorContainer: colors.dark.errorContainer,
  onErrorContainer: colors.dark.onErrorContainer,

  background: colors.dark.background,
  onBackground: colors.dark.textPrimary,
  surface: colors.dark.surface,
  onSurface: colors.dark.textPrimary,
  surfaceVariant: colors.dark.surfaceSecondary,
  onSurfaceVariant: colors.dark.textSecondary,
  surfaceDisabled: 'rgba(255, 255, 255, 0.12)',
  onSurfaceDisabled: 'rgba(255, 255, 255, 0.38)',

  outline: colors.dark.border,
  outlineVariant: colors.dark.borderLight,

  inverseSurface: '#E5E5E5',
  inverseOnSurface: '#1C1C1E',
  inversePrimary: '#2E7D32',

  shadow: 'rgba(0, 0, 0, 0.3)',
  scrim: colors.dark.scrim,
  backdrop: colors.dark.overlay,

  elevation: {
    level0: 'transparent',
    level1: '#1E1E1E',
    level2: '#232323',
    level3: '#272727',
    level4: '#2C2C2C',
    level5: '#313131',
  },
};

// --------------------------------------------------------------------------
// Assembled themes
// --------------------------------------------------------------------------
export const paperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: lightColors,
  fonts,
  roundness: radii.md,
};

export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: darkColors,
  fonts,
  roundness: radii.md,
};
