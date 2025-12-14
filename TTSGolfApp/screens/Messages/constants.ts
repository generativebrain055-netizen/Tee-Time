export const COLORS = {
    primary: "#5DB075",
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
    id: number;
    name: string;
    message: string;
    time: string;
    img: string;
    unread?: number;
    isRead?: boolean;
    isGroup?: boolean;
    groupInfo?: string;
}

export const TEE_TIME_MESSAGES: Message[] = [
    {
        id: 1,
        name: "Nov 16 @ 7:40 AM – Torrey Pine...",
        message: "Cara: Looking forward to it!",
        time: "2m ago",
        img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Group1",
        unread: 4,
        isGroup: true,
        groupInfo: "Torrey Pines Golf Course",
    },
    {
        id: 2,
        name: "Nov 12 @ 11:30 AM – Rancho Sa...",
        message: "Jake: I'll be sure to bring my Titleist...",
        time: "3d ago",
        img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Group2",
        unread: 3,
        isGroup: true,
        groupInfo: "Rancho Santa Fe",
    },
    {
        id: 3,
        name: "Nov 9 @ 1:00 PM – Fairbanks Ran...",
        message: "Tom: Anyone want to do lunch after?",
        time: "5d ago",
        img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Group3",
        unread: 3,
        isGroup: true,
        groupInfo: "Fairbanks Ranch",
    },
];

export const ALL_MESSAGES: Message[] = [
    {
        id: 1,
        name: "Mike Smith",
        message: "See you at Pine Valley tomorrow!",
        time: "2m ago",
        img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
        unread: 2,
        isRead: false,
    },
    {
        id: 2,
        name: "Jessica Rodriguez",
        message: "I was thinking the same thing as w...",
        time: "2m ago",
        img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica",
        isRead: true,
    },
    {
        id: 3,
        name: "David Wilson",
        message: "Great game today buddy! Let's pla...",
        time: "2m ago",
        img: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
        isRead: true,
    },
    {
        id: 4,
        name: "Sarah Johnson",
        message: "Perfect, thanks!",
        time: "2m ago",
        img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        isRead: true,
    },
    {
        id: 5,
        name: "Robert Lee",
        message: "I'll bring my extra driver for you to...",
        time: "2m ago",
        img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
        isRead: true,
    },
    {
        id: 6,
        name: "Jay Cantor",
        message: "Maybe the following week?",
        time: "2m ago",
        img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jay",
        isRead: true,
    },
];

export const GROUP_MESSAGES: Message[] = [
    {
        id: 1,
        name: "Saturday AM Crew",
        message: "Matt: Who's bringing the cooler?",
        time: "1h ago",
        img: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&q=80&w=150&h=150",
        unread: 5,
        isGroup: true,
    },
    {
        id: 2,
        name: "The Boys",
        message: "Sam: Next Sunday works for me",
        time: "3h ago",
        img: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&q=80&w=150&h=150",
        isGroup: true,
        isRead: true,
    },
];
