/**
 * Shared formatting utilities
 * Single source of truth for date, time, and text formatting
 */

/**
 * Format a date string into display components
 */
export function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString("en-US", { weekday: "short" }),
    date: date.getDate(),
    month: date.toLocaleDateString("en-US", { month: "short" }),
    year: date.getFullYear(),
    full: date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    short: date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
  };
}

/**
 * Format a HH:MM or HH:MM:SS time string to 12-hour format
 */
export function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Get initials from first and last name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

/**
 * Deterministic avatar background color based on an ID
 */
const AVATAR_COLORS = [
  "#10B981", // emerald-500
  "#3B82F6", // blue-500
  "#8B5CF6", // violet-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#EC4899", // pink-500
] as const;

export function getAvatarColor(id: string): string {
  const index = parseInt(id.slice(-2), 16) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Pad a number with leading zero (for countdown timers)
 */
export function padZero(num: number): string {
  return num.toString().padStart(2, "0");
}
