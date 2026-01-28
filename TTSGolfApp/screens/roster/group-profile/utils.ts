/**
 * Group Profile utility functions
 */

export const getGroupInitials = (name?: string): string => {
    if (!name) return "GR";
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
};

export const getMemberInitials = (name?: string): string => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

export const getFriendInitials = (firstName?: string, lastName?: string): string => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
};

export const formatTeeTimeDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export const calculateAvgHandicap = (members: { contact?: { handicap?: number } }[]): string => {
    if (members.length === 0) return "-";
    const total = members.reduce((sum, m) => sum + (m.contact?.handicap || 0), 0);
    return (total / members.length).toFixed(1);
};
