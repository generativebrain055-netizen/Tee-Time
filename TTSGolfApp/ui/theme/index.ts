/**
 * Theme barrel — single import point for the entire design system.
 *
 * Usage:
 *   import { tokens, useAppTheme, paperLightTheme } from '@/ui/theme';
 */

// Tokens (the source of truth)
export * from './tokens';

// Theme context & hooks
export { AppThemeProvider, useAppTheme, useColors, useTheme } from './ThemeContext';

// Paper themes
export { paperLightTheme, paperDarkTheme } from './paperTheme';
