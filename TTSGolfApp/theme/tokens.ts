/**
 * Design Tokens - Single source of truth for the app's design system
 * Production-grade, follows Material Design 3 specifications
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

export const colorTokens = {
  // Brand Colors
  brand: {
    primary: "#5DB075",
    primaryDark: "#4a9c63",
    primaryLight: "#E8F5E9",
    primaryContainer: "#D1FAE5",
    onPrimary: "#FFFFFF",
    onPrimaryContainer: "#1B5E20",
  },

  // Neutral Colors
  neutral: {
    white: "#FFFFFF",
    black: "#000000",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    surfaceVariant: "#F6F6F6",
    outline: "#E5E7EB",
    outlineVariant: "#E5E5EA",
  },

  // Text Colors
  text: {
    primary: "#1F2937",
    secondary: "#6B7280",
    tertiary: "#9CA3AF",
    disabled: "#C0C0C0",
    inverse: "#FFFFFF",
    placeholder: "#9CA3AF",
  },

  // Semantic Colors
  semantic: {
    success: "#10B981",
    successContainer: "#E8F5E9",
    onSuccess: "#FFFFFF",
    onSuccessContainer: "#2E7D32",

    error: "#EF4444",
    errorContainer: "#FEE2E2",
    onError: "#FFFFFF",
    onErrorContainer: "#B91C1C",

    warning: "#F59E0B",
    warningContainer: "#FFF3E0",
    onWarning: "#FFFFFF",
    onWarningContainer: "#E65100",

    info: "#3B82F6",
    infoContainer: "#DBEAFE",
    onInfo: "#FFFFFF",
    onInfoContainer: "#1E40AF",
  },

  // State Colors
  state: {
    confirmed: {
      background: "#E8F5E9",
      text: "#2E7D32",
    },
    pending: {
      background: "#FFF3E0",
      text: "#E65100",
    },
    available: "#22C55E",
    requested: "#F59E0B",
  },

  // Shadow Colors
  shadow: {
    default: "rgba(0, 0, 0, 0.1)",
    medium: "rgba(0, 0, 0, 0.15)",
    heavy: "rgba(0, 0, 0, 0.25)",
    primary: "rgba(93, 176, 117, 0.3)",
  },

  // Overlay Colors
  overlay: {
    light: "rgba(0, 0, 0, 0.3)",
    medium: "rgba(0, 0, 0, 0.5)",
    heavy: "rgba(0, 0, 0, 0.7)",
  },
} as const;

// ============================================================================
// SPACING TOKENS
// ============================================================================

export const spacingTokens = {
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 20px */
  xl: 20,
  /** 24px */
  xxl: 24,
  /** 32px */
  xxxl: 32,
  /** 48px */
  huge: 48,
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const typographyTokens = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 32,
  },

  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ============================================================================
// BORDER TOKENS
// ============================================================================

export const borderTokens = {
  radius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },

  width: {
    none: 0,
    thin: 1,
    medium: 2,
    thick: 3,
  },
} as const;

// ============================================================================
// SHADOW TOKENS
// ============================================================================

export const shadowTokens = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  sm: {
    shadowColor: colorTokens.shadow.default,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  md: {
    shadowColor: colorTokens.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  lg: {
    shadowColor: colorTokens.shadow.heavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  xl: {
    shadowColor: colorTokens.shadow.heavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ============================================================================
// ANIMATION TOKENS
// ============================================================================

export const animationTokens = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },

  easing: {
    linear: "linear",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
  },
} as const;

// ============================================================================
// COMPONENT TOKENS
// ============================================================================

export const componentTokens = {
  button: {
    height: {
      sm: 40,
      md: 48,
      lg: 56,
    },
    paddingHorizontal: {
      sm: 12,
      md: 16,
      lg: 24,
    },
  },

  input: {
    height: {
      sm: 40,
      md: 48,
      lg: 56,
    },
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  icon: {
    size: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 48,
    },
  },

  avatar: {
    size: {
      xs: 24,
      sm: 32,
      md: 40,
      lg: 56,
      xl: 80,
    },
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ColorTokens = typeof colorTokens;
export type SpacingTokens = typeof spacingTokens;
export type TypographyTokens = typeof typographyTokens;
export type BorderTokens = typeof borderTokens;
export type ShadowTokens = typeof shadowTokens;
export type AnimationTokens = typeof animationTokens;
export type ComponentTokens = typeof componentTokens;
