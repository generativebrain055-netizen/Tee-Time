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
 * Format message/conversation timestamp for list (e.g. "2m ago", "1h ago", "Mar 5")
 */
export function formatRelativeMessageTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
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

/**
 * Calendar day key `YYYY-MM-DD` for matching tee times to week columns (no UTC shift).
 * API `teeDate` strings use the leading Y-M-D as the intended play date.
 */
export function toCalendarDateKey(
  input: Date | string | null | undefined,
): string {
  if (input == null || input === "") return "";
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return "";
    return `${input.getFullYear()}-${padZero(input.getMonth() + 1)}-${padZero(input.getDate())}`;
  }
  const s = String(input).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${padZero(dt.getMonth() + 1)}-${padZero(dt.getDate())}`;
}

/** Parse `YYYY-MM-DD` (or leading prefix) as a local calendar date for display. */
export function parseCalendarDateLocal(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr).trim());
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(dateStr);
}

/**
 * US date display MM/DD/YYYY.
 * Parses plain YYYY-MM-DD as a calendar date (no UTC midnight shift).
 * Other values are parsed as Date (ISO timestamps use local calendar for display).
 */
export function formatDateMMDDYYYY(
  input: string | Date | null | undefined,
): string {
  if (input == null || input === "") return "";
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return "";
    return `${padZero(input.getMonth() + 1)}/${padZero(input.getDate())}/${input.getFullYear()}`;
  }
  const s = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [ys, ms, ds] = s.split("-");
    const y = parseInt(ys, 10);
    const m = parseInt(ms, 10);
    const d = parseInt(ds, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      return "";
    }
    return `${padZero(m)}/${padZero(d)}/${y}`;
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return "";
  return `${padZero(dt.getMonth() + 1)}/${padZero(dt.getDate())}/${dt.getFullYear()}`;
}

/** Timestamp as "MM/DD/YYYY, h:mm AM/PM" in local time */
export function formatDateTimeMMDDYYYY(iso: string | null | undefined): string {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return String(iso);
  const d = formatDateMMDDYYYY(dt);
  const t = dt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${d}, ${t}`;
}

/**
 * Format remaining milliseconds as a countdown clock.
 * Always returns HH:MM or HH:MM:SS (hours can exceed 24).
 */
export function formatRemainingClock(
  diffMs: number,
  includeSeconds = false,
): string {
  if (diffMs <= 0) return "Expired";

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalHours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return includeSeconds
    ? `${padZero(totalHours)}:${padZero(minutes)}:${padZero(seconds)}`
    : `${padZero(totalHours)}:${padZero(minutes)}`;
}
