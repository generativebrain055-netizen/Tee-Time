/**
 * Hooks Index
 * Re-exports all custom hooks for cleaner imports
 */

// Animation hooks
export * from "./useAnimations";
export { default as useAnimations } from "./useAnimations";
export type { Direction } from "./useAnimations";

// Authentication hooks
export { useAuth } from "./useAuth";
export type { default as useAuthType } from "./useAuth";

// Notification hooks
export { useNotifications } from "./useNotifications";
