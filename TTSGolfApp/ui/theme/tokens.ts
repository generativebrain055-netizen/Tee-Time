/**
 * Design Tokens — Single Source of Truth
 *
 * Enterprise-grade design tokens following Material Design 3 spec.
 * These tokens power NativeWind, React Native Paper, and all UI components.
 *
 * RULES:
 * - No magic numbers anywhere in the codebase. Period.
 * - All values must trace back to a token defined here.
 * - Dark mode values are derived, never hard-coded per-screen.
 * - NativeWind arbitrary values are FORBIDDEN.
 */

// ============================================================================
// PALETTE — raw color values (never use directly in components)
// ============================================================================
export const palette = {
  green50: '#F0FDF4',
  green100: '#DCFCE7',
  green200: '#BBF7D0',
  green300: '#86EFAC',
  green400: '#4ADE80',
  green500: '#5EBC68',
  green600: '#16A34A',
  green700: '#15803D',
  green800: '#166534',
  green900: '#14532D',

  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  white: '#FFFFFF',
  black: '#000000',

  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',
  red800: '#991B1B',

  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber700: '#B45309',
  amber800: '#92400E',

  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue800: '#1E40AF',

  emerald500: '#10B981',
  emerald600: '#059669',
  emerald700: '#047857',

  // Dark mode surface palette
  dark0: '#000000',
  dark50: '#0A0A0A',
  dark100: '#121212',
  dark200: '#1E1E1E',
  dark300: '#2A2A2A',
  dark400: '#333333',
  dark500: '#444444',
  dark600: '#555555',
} as const;

// ============================================================================
// SEMANTIC COLORS — light and dark themes
// ============================================================================
export const colors = {
  light: {
    // Brand
    primary: palette.green500,
    primaryDark: '#4BA85A',
    primaryLight: palette.green100,
    primaryContainer: '#D1FAE5',
    onPrimary: palette.white,
    onPrimaryContainer: palette.green800,

    // Backgrounds
    background: palette.white,
    backgroundSecondary: '#F8F9FA',
    surface: palette.white,
    surfaceSecondary: palette.gray50,
    surfaceTertiary: palette.gray100,
    surfaceElevated: palette.white,

    // Text
    textPrimary: '#1C1C1E',
    textSecondary: palette.gray500,
    textMuted: palette.gray400,
    textDisabled: '#C0C0C0',
    textInverse: palette.white,

    // Borders
    border: palette.gray200,
    borderLight: palette.gray100,
    borderDark: palette.gray700,
    divider: palette.gray200,

    // Semantic status
    success: palette.emerald500,
    successContainer: '#E8F5E9',
    onSuccess: palette.white,
    onSuccessContainer: '#2E7D32',

    error: palette.red500,
    errorContainer: palette.red100,
    onError: palette.white,
    onErrorContainer: palette.red700,

    warning: palette.amber500,
    warningContainer: palette.amber100,
    onWarning: palette.white,
    onWarningContainer: '#E65100',

    info: palette.blue500,
    infoContainer: palette.blue100,
    onInfo: palette.white,
    onInfoContainer: palette.blue800,

    // Status indicators
    confirmed: { bg: '#E8F5E9', text: '#2E7D32' },
    pending: { bg: '#FFF3E0', text: '#E65100' },
    available: '#22C55E',
    requested: palette.amber500,

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    overlayHeavy: 'rgba(0, 0, 0, 0.7)',
    scrim: 'rgba(0, 0, 0, 0.32)',

    // Shadows
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowMedium: 'rgba(0, 0, 0, 0.15)',
    shadowHeavy: 'rgba(0, 0, 0, 0.25)',
    shadowPrimary: 'rgba(94, 188, 104, 0.3)',

    // Gradients
    gradientStart: '#5EBC68',
    gradientMiddle: '#4CAF50',
    gradientEnd: '#43A047',

    // Compatibility aliases
    black: palette.black,
    white: palette.white,
    textMain: '#1C1C1E',
    textSub: palette.gray500,
    textTertiary: palette.gray400,
    textPlaceholder: palette.gray400,
  },
  dark: {
    // Brand
    primary: '#7BC88E',
    primaryDark: '#5EBC68',
    primaryLight: palette.green800,
    primaryContainer: palette.green800,
    onPrimary: '#003919',
    onPrimaryContainer: '#A5D6A7',

    // Backgrounds
    background: palette.dark100,
    backgroundSecondary: '#0F0F0F',
    surface: palette.dark200,
    surfaceSecondary: palette.dark300,
    surfaceTertiary: palette.dark400,
    surfaceElevated: '#2D2D2D',

    // Text
    textPrimary: '#E5E5E5',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    textDisabled: 'rgba(255, 255, 255, 0.38)',
    textInverse: palette.black,

    // Borders
    border: palette.dark500,
    borderLight: palette.dark400,
    borderDark: palette.gray600,
    divider: palette.dark400,

    // Semantic status
    success: '#34D399',
    successContainer: '#064E3B',
    onSuccess: palette.white,
    onSuccessContainer: '#6EE7B7',

    error: '#F87171',
    errorContainer: '#7F1D1D',
    onError: '#601010',
    onErrorContainer: '#FECACA',

    warning: '#FBBF24',
    warningContainer: '#78350F',
    onWarning: palette.black,
    onWarningContainer: '#FDE68A',

    info: '#93C5FD',
    infoContainer: '#1E3A5F',
    onInfo: '#002B5C',
    onInfoContainer: '#BFDBFE',

    // Status indicators
    confirmed: { bg: '#064E3B', text: '#6EE7B7' },
    pending: { bg: '#78350F', text: '#FDE68A' },
    available: '#34D399',
    requested: '#FBBF24',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
    overlayHeavy: 'rgba(0, 0, 0, 0.85)',
    scrim: 'rgba(0, 0, 0, 0.6)',

    // Shadows
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowMedium: 'rgba(0, 0, 0, 0.4)',
    shadowHeavy: 'rgba(0, 0, 0, 0.5)',
    shadowPrimary: 'rgba(123, 200, 142, 0.3)',

    // Gradients
    gradientStart: '#4BA85A',
    gradientMiddle: '#3D8B4A',
    gradientEnd: '#2E6D3A',

    // Compatibility aliases
    black: palette.black,
    white: palette.white,
    textMain: '#E5E5E5',
    textSub: '#A1A1AA',
    textTertiary: '#71717A',
    textPlaceholder: '#71717A',
  },
} as const;

// ============================================================================
// SPACING — 4px base grid
// ============================================================================
export const spacing = {
  /** 0px */  none: 0,
  /** 2px */  '2xs': 2,
  /** 4px */  xs: 4,
  /** 8px */  sm: 8,
  /** 12px */ md: 12,
  /** 16px */ lg: 16,
  /** 20px */ xl: 20,
  /** 24px */ '2xl': 24,
  /** 32px */ '3xl': 32,
  /** 40px */ '4xl': 40,
  /** 48px */ '5xl': 48,
  /** 64px */ '6xl': 64,
  /** 80px */ '7xl': 80,
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export const fontFamily = {
  extraLight: 'Inter_200ExtraLight',
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

export const fontSize = {
  /** 10px */ '2xs': 10,
  /** 12px */ xs: 12,
  /** 14px */ sm: 14,
  /** 16px */ base: 16,
  /** 18px */ lg: 18,
  /** 20px */ xl: 20,
  /** 24px */ '2xl': 24,
  /** 30px */ '3xl': 30,
  /** 36px */ '4xl': 36,
  /** 48px */ '5xl': 48,
} as const;

export const lineHeight = {
  /** 14px */ '2xs': 14,
  /** 16px */ xs: 16,
  /** 20px */ sm: 20,
  /** 24px */ base: 24,
  /** 28px */ lg: 28,
  /** 28px */ xl: 28,
  /** 32px */ '2xl': 32,
  /** 36px */ '3xl': 36,
  /** 40px */ '4xl': 40,
  /** 48px */ '5xl': 48,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/**
 * Material Design 3 Type Scale — Plus Jakarta Sans
 */
export const typeScale = {
  displayLarge:  { fontFamily: fontFamily.bold,     fontSize: 57, lineHeight: 64, letterSpacing: -0.25 },
  displayMedium: { fontFamily: fontFamily.bold,     fontSize: 45, lineHeight: 52, letterSpacing: 0 },
  displaySmall:  { fontFamily: fontFamily.bold,     fontSize: 36, lineHeight: 44, letterSpacing: 0 },
  headlineLarge: { fontFamily: fontFamily.bold,     fontSize: 32, lineHeight: 40, letterSpacing: 0 },
  headlineMedium:{ fontFamily: fontFamily.semiBold, fontSize: 28, lineHeight: 36, letterSpacing: 0 },
  headlineSmall: { fontFamily: fontFamily.semiBold, fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  titleLarge:    { fontFamily: fontFamily.semiBold, fontSize: 22, lineHeight: 28, letterSpacing: 0 },
  titleMedium:   { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  titleSmall:    { fontFamily: fontFamily.medium,   fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  bodyLarge:     { fontFamily: fontFamily.regular,  fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  bodyMedium:    { fontFamily: fontFamily.regular,  fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  bodySmall:     { fontFamily: fontFamily.regular,  fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  labelLarge:    { fontFamily: fontFamily.medium,   fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  labelMedium:   { fontFamily: fontFamily.medium,   fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  labelSmall:    { fontFamily: fontFamily.medium,   fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const radii = {
  /** 0px */   none: 0,
  /** 4px */   xs: 4,
  /** 8px */   sm: 8,
  /** 12px */  md: 12,
  /** 16px */  lg: 16,
  /** 20px */  xl: 20,
  /** 24px */  '2xl': 24,
  /** 32px */  '3xl': 32,
  /** 9999px */full: 9999,
} as const;

// ============================================================================
// BORDER WIDTHS
// ============================================================================
export const borderWidth = {
  none: 0,
  thin: 1,
  medium: 2,
  thick: 3,
} as const;

// ============================================================================
// SHADOWS (React Native style objects)
// ============================================================================
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  primary: {
    shadowColor: palette.green500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

// ============================================================================
// OPACITY
// ============================================================================
export const opacity = {
  disabled: 0.5,
  pressed: 0.9,
  hover: 0.8,
  overlay: 0.5,
} as const;

// ============================================================================
// Z-INDEX
// ============================================================================
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;

// ============================================================================
// COMPONENT TOKENS — sizing / spacing for specific components
// ============================================================================
export const componentTokens = {
  /** Minimum touch target (WCAG / Apple HIG) */
  touchTarget: 44,

  button: {
    height: { sm: 40, md: 48, lg: 56 },
    paddingHorizontal: { sm: 12, md: 16, lg: 24 },
    borderRadius: radii.md,
    iconGap: spacing.sm,
  },

  input: {
    height: { sm: 40, md: 48, lg: 56 },
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.md,
  },

  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
  },

  avatar: {
    size: { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 },
  },

  icon: {
    size: { xs: 16, sm: 20, md: 24, lg: 32, xl: 48 },
  },

  header: {
    height: 56,
    paddingHorizontal: spacing.lg,
  },

  bottomNav: {
    height: 64,
    paddingBottom: 25,
  },

  modal: {
    borderRadius: radii.xl,
    padding: spacing['2xl'],
  },
} as const;

// ============================================================================
// ANIMATION TOKENS
// ============================================================================
export const animation = {
  duration: {
    instant: 100,
    fast: 150,
    normal: 250,
    slow: 400,
    verySlow: 800,
  },
  easing: {
    linear: 'linear' as const,
    easeIn: 'ease-in' as const,
    easeOut: 'ease-out' as const,
    easeInOut: 'ease-in-out' as const,
  },
  spring: {
    snappy: { type: 'spring' as const, damping: 20, stiffness: 300, mass: 0.8 },
    gentle: { type: 'spring' as const, damping: 22, stiffness: 150, mass: 1 },
    bouncy: { type: 'spring' as const, damping: 12, stiffness: 180, mass: 0.7 },
  },
  stagger: {
    /** Default delay between staggered items */
    itemDelay: 50,
    /** Max stagger to prevent slowness on long lists */
    maxItems: 12,
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type ThemeMode = 'light' | 'dark';
export type SemanticColors = typeof colors.light | typeof colors.dark;
export type SpacingKey = keyof typeof spacing;
export type RadiiKey = keyof typeof radii;
export type ShadowKey = keyof typeof shadows;
export type FontSizeKey = keyof typeof fontSize;
export type TypeScaleKey = keyof typeof typeScale;
