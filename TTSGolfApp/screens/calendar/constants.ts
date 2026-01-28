/**
 * Calendar screen constants
 */
import { Dimensions } from "react-native";

export const SCREEN_WIDTH = Dimensions.get("window").width;
// Account for card margins (20*2) and card padding (20*2)
export const CALENDAR_CONTENT_WIDTH = SCREEN_WIDTH - 40 - 40;
// Use floor to avoid fractional pixels causing overflow
export const DAY_CELL_WIDTH = Math.floor(CALENDAR_CONTENT_WIDTH / 7);

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export const CALENDAR_COLORS = {
    primary: "#5DB075",
    bg: "#F6F6F6",
    white: "#FFFFFF",
    text: "#1C1C1E",
    textSecondary: "#8A8A8E",
    border: "#E5E5EA",
    confirmedBg: "#E8F5E9",
    confirmedText: "#2E7D32",
    pendingBg: "#FFF3E0",
    pendingText: "#E65100",
    grayCircle: "#E5E5EA",
};
