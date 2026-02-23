import type { AdSlot } from "./components";

export const COLORS = {
  primary: "#5EBC68",
  bg: "#F8F8F8",
  white: "#FFFFFF",
  text: "#1C1C1E",
  textSecondary: "#8E8E93",
  border: "#E5E5EA",
  cardBg: "#F2F2F7",
  confirmedBg: "#E8F5E9",
  confirmedText: "#4CAF50",
  greenAccent: "#34C759",
};

export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Default ad slots for Home, Invites, and Messages (Figma 1349-4110, 1349-4189, 1349-4138, 1349-4451) */
export const DEFAULT_AD_SLOTS: AdSlot[] = [
  { id: "ad-1", adLabel: "Ad", title: "Upgrade your game", description: "Discover deals on courses and gear near you.", ctaText: "Learn more" },
  { id: "ad-2", adLabel: "Ad", title: "Book a lesson", description: "Connect with PGA pros and improve your swing.", ctaText: "See options" },
  { id: "ad-3", adLabel: "Ad", title: "Golf gear sale", description: "Save on clubs, balls, and apparel this week.", ctaText: "Shop now" },
  { id: "ad-4", adLabel: "Ad", title: "New courses added", description: "Check out the latest courses in your area.", ctaText: "Explore" },
];
