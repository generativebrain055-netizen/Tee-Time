import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
    Home,
    Clock,
    MessageCircle,
    Users,
    User,
    Edit3,
    Check,
    CheckCheck,
} from "lucide-react-native";

// --- TYPES ---
interface Message {
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

// --- CONSTANTS ---
const COLORS = {
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

// --- MOCK DATA ---
const TEE_TIME_MESSAGES: Message[] = [
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

const ALL_MESSAGES: Message[] = [
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

const GROUP_MESSAGES: Message[] = [
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

export default function MessagesScreen({ navigation }: any) {
    const [activeTab, setActiveTab] = useState("All");
    const [activeBottomTab, setActiveBottomTab] = useState("Messages");

    // --- HEADER ---
    const Header = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Messages</Text>
            <TouchableOpacity style={styles.composeButton}>
                <Edit3 size={24} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
    );

    // --- TAB BAR ---
    const TabBar = () => {
        const tabs = ["All", "Tee Times", "Groups"];
        return (
            <View style={styles.tabBar}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[
                            styles.tabButton,
                            activeTab === tab && styles.tabButtonActive,
                        ]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text
                            style={[
                                styles.tabButtonText,
                                activeTab === tab && styles.tabButtonTextActive,
                            ]}
                        >
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    // --- MESSAGE ITEM ---
    const MessageItem = ({ message }: { message: Message }) => (
        <TouchableOpacity
            style={[
                styles.messageItem,
                !message.isRead && styles.messageItemUnread,
            ]}
            onPress={() =>
                navigation &&
                (navigation as any).navigate("ChatDetail", {
                    chatInfo: {
                        id: message.id,
                        name: message.name,
                        subtitle: message.isGroup ? message.groupInfo : "Active now",
                        img: message.img,
                        isGroup: message.isGroup,
                    },
                })
            }
        >
            <View style={styles.messageAvatar}>
                <Image source={{ uri: message.img }} style={styles.avatar} />
                {message.unread && message.unread > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{message.unread}</Text>
                    </View>
                )}
            </View>
            <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                    <Text style={styles.messageName} numberOfLines={1}>
                        {message.name}
                    </Text>
                    <Text style={styles.messageTime}>{message.time}</Text>
                </View>
                <View style={styles.messagePreview}>
                    <Text style={styles.messageText} numberOfLines={1}>
                        {message.message}
                    </Text>
                    {message.isRead && (
                        <CheckCheck size={16} color={COLORS.primary} style={styles.checkIcon} />
                    )}
                    {message.unread && message.unread > 0 && (
                        <View style={styles.unreadCount}>
                            <Text style={styles.unreadCountText}>{message.unread}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    // --- GROUP MESSAGE ITEM (for Tee Times) ---
    const GroupMessageItem = ({ message }: { message: Message }) => (
        <TouchableOpacity
            style={styles.groupMessageItem}
            onPress={() =>
                navigation &&
                (navigation as any).navigate("ChatDetail", {
                    chatInfo: {
                        id: message.id,
                        name: message.name,
                        subtitle: message.groupInfo || "Group chat",
                        img: message.img,
                        isGroup: true,
                    },
                })
            }
        >
            <View style={styles.groupAvatarContainer}>
                <View style={styles.groupAvatar}>
                    <Users size={24} color={COLORS.white} />
                </View>
                {message.unread && message.unread > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{message.unread}</Text>
                    </View>
                )}
            </View>
            <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                    <Text style={styles.messageName} numberOfLines={1}>
                        {message.name}
                    </Text>
                    <Text style={styles.messageTime}>{message.time}</Text>
                </View>
                <Text style={styles.messageText} numberOfLines={1}>
                    {message.message}
                </Text>
            </View>
        </TouchableOpacity>
    );

    // --- RENDER CONTENT ---
    const renderContent = () => {
        let messages: Message[] = [];
        let ItemComponent = MessageItem;

        switch (activeTab) {
            case "All":
                messages = ALL_MESSAGES;
                break;
            case "Tee Times":
                messages = TEE_TIME_MESSAGES;
                ItemComponent = GroupMessageItem;
                break;
            case "Groups":
                messages = GROUP_MESSAGES;
                break;
        }

        return (
            <ScrollView
                style={styles.messagesList}
                contentContainerStyle={styles.messagesListContent}
                showsVerticalScrollIndicator={false}
            >
                {messages.map((message) => (
                    <ItemComponent key={message.id} message={message} />
                ))}
            </ScrollView>
        );
    };

    // --- BOTTOM NAVIGATION ---
    const BottomNav = () => {
        const tabs = [
            { name: "Home", icon: Home },
            { name: "Availability", icon: Clock },
            { name: "Messages", icon: MessageCircle },
            { name: "Roster", icon: Users },
            { name: "Profile", icon: User },
        ];

        return (
            <View style={styles.bottomNav}>
                {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeBottomTab === tab.name;
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.bottomNavItem}
                            onPress={() => {
                                setActiveBottomTab(tab.name);
                                if (navigation) {
                                    if (tab.name === "Home") {
                                        (navigation as any).navigate("HomePage");
                                    } else if (tab.name === "Roster") {
                                        (navigation as any).navigate("Roster");
                                    } else if (tab.name === "Profile") {
                                        (navigation as any).navigate("Profile");
                                    }
                                }
                            }}
                        >
                            <IconComponent
                                size={24}
                                color={isActive ? COLORS.primary : COLORS.textSub}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <Text
                                style={[
                                    styles.bottomNavLabel,
                                    { color: isActive ? COLORS.primary : COLORS.textSub },
                                ]}
                            >
                                {tab.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Header />
            <TabBar />
            {renderContent()}
            <BottomNav />
        </View>
    );
}


// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
        backgroundColor: COLORS.white,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    composeButton: {
        padding: 8,
    },
    tabBar: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        gap: 8,
    },
    tabButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    tabButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    tabButtonTextActive: {
        color: COLORS.white,
    },
    messagesList: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    messagesListContent: {
        paddingBottom: 20,
    },
    messageItem: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.readBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    messageItemUnread: {
        backgroundColor: COLORS.unreadBg,
    },
    messageAvatar: {
        position: "relative",
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.divider,
    },
    unreadBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    unreadText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: "bold",
    },
    messageContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
    },
    messageHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    messageName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textMain,
        flex: 1,
        marginRight: 8,
    },
    messageTime: {
        fontSize: 13,
        color: COLORS.textSub,
    },
    messagePreview: {
        flexDirection: "row",
        alignItems: "center",
    },
    messageText: {
        fontSize: 14,
        color: COLORS.textSub,
        flex: 1,
    },
    checkIcon: {
        marginLeft: 4,
    },
    unreadCount: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    unreadCountText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: "bold",
    },
    groupMessageItem: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    groupAvatarContainer: {
        position: "relative",
    },
    groupAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.textSub,
        justifyContent: "center",
        alignItems: "center",
    },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 12,
        paddingBottom: 25,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: "#F0F0F0",
        elevation: 10,
    },
    bottomNavItem: {
        alignItems: "center",
    },
    bottomNavLabel: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: "500",
    },
});
