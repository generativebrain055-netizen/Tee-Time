export const COLORS = {
  primary: "#5EBC68",
  bg: "#FFFFFF",
  white: "#FFFFFF",
  text: "#1F2937",
  textSub: "#9CA3AF",
  border: "#E5E7EB",
  inputBg: "#FFFFFF",
};

/** Figma 1269-3055, 1269-3123, 1269-3370, 1269-3456 – Your players list */
export const FIGMA_YOUR_PLAYERS = {
  title: "Your players",
  searchPlaceholder: "Search players",
  avatarSize: 49,
  rowPaddingVertical: 14,
  rowPaddingHorizontal: 16,
  nameFontSize: 16,
  nameColor: "#000000",
  checkSize: 24,
  inputBorderRadius: 12,
  inputBorderColor: "#E5E7EB",
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Hours for picker (1-12)
export const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

// Minutes for picker (00-59)
export const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

// AM/PM
export const PERIODS = ["AM", "PM"];
