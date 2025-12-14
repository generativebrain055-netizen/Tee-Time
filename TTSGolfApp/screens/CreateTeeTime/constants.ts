import { Dimensions } from "react-native";

export const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const COLORS = {
    primary: "#22C55E",
    bg: "#FFFFFF",
    white: "#FFFFFF",
    text: "#1F2937",
    textSub: "#9CA3AF",
    border: "#E5E7EB",
    inputBg: "#FFFFFF",
};

export const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Generate time slots from 6:00 AM to 6:00 PM in 15-min intervals
export const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 6; hour <= 18; hour++) {
        for (let min = 0; min < 60; min += 15) {
            const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            const ampm = hour >= 12 ? "PM" : "AM";
            const m = min.toString().padStart(2, "0");
            slots.push(`${h}:${m} ${ampm}`);
        }
    }
    return slots;
};

export const TIME_SLOTS = generateTimeSlots();
