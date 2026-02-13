/**
 * Safe wrapper around expo-location.
 * Lazy-loads the native module so the app does not crash when ExpoLocation
 * is missing (e.g. dev client built before expo-location was added).
 * Rebuild the native app (expo prebuild + run:ios) to get full location support.
 */

export const LOCATION_UNAVAILABLE = "LOCATION_UNAVAILABLE";

let expoLocation: typeof import("expo-location") | null = null;
let checked = false;

function loadExpoLocation(): typeof import("expo-location") | null {
  if (checked) return expoLocation;
  checked = true;
  try {
    expoLocation = require("expo-location");
    return expoLocation;
  } catch {
    return null;
  }
}

export function isLocationAvailable(): boolean {
  return loadExpoLocation() !== null;
}

export async function requestForegroundPermissionsAsync(): Promise<{
  status: string;
}> {
  const loc = loadExpoLocation();
  if (!loc) throw new Error(LOCATION_UNAVAILABLE);
  return loc.requestForegroundPermissionsAsync();
}

export async function getCurrentPositionAsync(options?: {
  accuracy?: number;
}): Promise<{ coords: { latitude: number; longitude: number } }> {
  const loc = loadExpoLocation();
  if (!loc) throw new Error(LOCATION_UNAVAILABLE);
  return loc.getCurrentPositionAsync(options ?? {});
}

export async function reverseGeocodeAsync(params: {
  latitude: number;
  longitude: number;
}): Promise<Array<{ city?: string; region?: string; subAdministrativeArea?: string }>> {
  const loc = loadExpoLocation();
  if (!loc) throw new Error(LOCATION_UNAVAILABLE);
  return loc.reverseGeocodeAsync(params);
}

/** Use when location is available; otherwise use a stub (e.g. Balanced = 2) for types. */
export const Accuracy = (() => {
  const loc = loadExpoLocation();
  return loc ? loc.Accuracy : { Balanced: 2 };
})();
