export const COLORS = {
  primary: "#5EBC68",
  bg: "#FFFFFF",
  white: "#FFFFFF",
  text: "#1F2937",
  textSub: "#9CA3AF",
  border: "#E5E7EB",
  inputBg: "#FFFFFF",
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
