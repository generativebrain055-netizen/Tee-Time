/**
 * Utils Index
 * Re-exports all utility modules for cleaner imports
 */

// Session Management
export { sessionManager } from "./sessionManager";

// Device Info
export { getDeviceInfo } from "./deviceInfo";

// Logger
export { logger } from "./logger";

// Safe location (avoids crash when ExpoLocation native module is missing)
export {
  isLocationAvailable,
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  reverseGeocodeAsync,
  Accuracy,
  LOCATION_UNAVAILABLE,
} from "./safeLocation";

// Tailwind class merger
export { cn } from "./cn";

// Safe image source (avoids empty uri warning)
export { safeImageSource } from "./safeImageSource";
