/**
 * Hooks Index
 * Re-exports all custom hooks for cleaner imports
 */

// Animation hooks
export * from "./useAnimations";
export { default as useAnimations } from "./useAnimations";

// Authentication hooks
export { useAuth } from "./useAuth";
export type { default as useAuthType } from "./useAuth";

// Notification hooks
export { useNotifications } from "./useNotifications";

// Utility hooks
export { useDebounce } from "./useDebounce";

// Theme hooks
export { useTheme, useThemeColors, useDarkClass, ThemeProvider } from "./useTheme";
