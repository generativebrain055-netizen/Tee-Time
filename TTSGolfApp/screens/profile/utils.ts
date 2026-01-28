/**
 * Profile utility functions
 */

/**
 * Safely format a number to fixed decimal places
 * Handles string, number, null, and undefined inputs
 */
export const formatScore = (value: string | number | null | undefined, decimals = 1): string => {
  if (value == null) return "0.0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0.0";
  return num.toFixed(decimals);
};

/**
 * Get display text for preferred tee time
 */
export const getPreferredTeeTimeDisplay = (pref?: string): string => {
  if (!pref) return "Any time";
  const map: Record<string, string> = {
    morning: "Morning (6-9 AM)",
    midday: "Midday (9 AM-12 PM)",
    afternoon: "Afternoon (12-4 PM)",
    evening: "Evening (4-7 PM)",
  };
  return map[pref] || pref;
};

/**
 * Get display text for walk or ride preference
 */
export const getWalkOrRideDisplay = (pref?: string): string => {
  if (!pref) return "Either";
  const map: Record<string, string> = {
    walk: "Walk",
    ride: "Ride",
    either: "Either",
  };
  return map[pref] || pref;
};

/**
 * Get display text for group size preference
 */
export const getGroupSizeDisplay = (pref?: string): string => {
  if (!pref) return "Any size";
  const map: Record<string, string> = {
    solo: "Solo (1 player)",
    twosome: "Twosome (2 players)",
    threesome: "Threesome (3 players)",
    foursome: "Foursome (4 players)",
    any: "Any size",
  };
  return map[pref] || pref;
};

/**
 * Get user initials from first and last name
 */
export const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.[0] || "";
  const last = lastName?.[0] || "";
  return (first + last).toUpperCase() || "U";
};

/**
 * Get full name from first and last name
 */
export const getFullName = (firstName?: string, lastName?: string): string => {
  return `${firstName || ""} ${lastName || ""}`.trim() || "User";
};
