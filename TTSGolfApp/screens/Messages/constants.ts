export const COLORS = {
    primary: "#5EBC68",
    secondary: "#F6F6F6",
    textMain: "#1F2937",
    textSub: "#6B7280",
    divider: "#E5E7EB",
    white: "#FFFFFF",
    bg: "#F6F6F6",
    unreadBg: "#FFFFFF",
    readBg: "#F9FAFB",
};

export interface Message {
    id: string;
    name: string;
    message: string;
    time: string;
    img?: string;
    unread?: number;
    isRead?: boolean;
    isGroup?: boolean;
    groupInfo?: string;
}
