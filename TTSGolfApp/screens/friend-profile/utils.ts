/**
 * Friend Profile utility functions
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

export const getWalkOrRideDisplay = (pref?: string): string => {
    if (!pref) return "Either";
    const map: Record<string, string> = {
        walk: "Walk",
        ride: "Ride",
        cart: "Cart",
        either: "Either",
    };
    return map[pref] || pref;
};

export const getInitials = (firstName?: string, lastName?: string): string => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
};

export const getFullName = (firstName?: string, lastName?: string): string => {
    return `${firstName || ""} ${lastName || ""}`.trim() || "User";
};
