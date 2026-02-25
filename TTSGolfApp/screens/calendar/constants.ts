/**
 * Calendar screen constants (Figma 565-* full schedule / month view)
 */
import { Dimensions } from "react-native";
import { spacing } from "../../ui/theme/tokens";

export const SCREEN_WIDTH = Dimensions.get("window").width;
export const CALENDAR_CONTENT_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.xl * 2;
export const DAY_CELL_WIDTH = Math.floor(CALENDAR_CONTENT_WIDTH / 7);

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const CALENDAR_COLORS = {
  primary: "#5EBC68",
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
