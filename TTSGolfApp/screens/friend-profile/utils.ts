/**
 * Friend Profile utility functions
 */

export const getPreferredTeeTimeDisplay = (pref?: string, style: "full" | "compact" = "full"): string => {
    const raw = typeof pref === "string" ? pref.trim() : "";
    if (!raw) return style === "compact" ? "Not set" : "Any time";
    const key = raw.toLowerCase();
    const compact: Record<string, string> = {
        morning: "Morning",
        midday: "Midday",
        afternoon: "Afternoon",
        evening: "Evening",
    };
    const full: Record<string, string> = {
        morning: "Morning (6-9 AM)",
        midday: "Midday (9 AM-12 PM)",
        afternoon: "Afternoon (12-4 PM)",
        evening: "Evening (4-7 PM)",
    };
    return style === "compact" ? (compact[key] || raw) : (full[key] || raw);
};

/** Labels aligned with profile / design mockups (e.g. cart vs ride). */
export const getWalkOrRideDisplay = (pref?: string): string => {
    const raw = typeof pref === "string" ? pref.trim() : "";
    if (!raw) return "Not set";
    const key = raw.toLowerCase();
    const map: Record<string, string> = {
        walk: "Walk",
        ride: "Cart",
        cart: "Cart",
        either: "Either",
    };
    return map[key] || raw;
};

export const getInitials = (firstName?: string, lastName?: string): string => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
};

export const getFullName = (firstName?: string, lastName?: string): string => {
    return `${firstName || ""} ${lastName || ""}`.trim() || "User";
};
