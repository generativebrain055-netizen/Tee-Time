import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Home, Clock, MessageCircle, Users, User, Edit3 } from "lucide-react-native";
import { friendApi, Friend } from "../../services/api";

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

interface Conversation {
    id: string;
    recipientId: string;
    name: string;
    avatar?: string;
    lastMessage?: string;
    lastMessageTime?: string;
    unread?: number;
    isGroup?: boolean;
}

export default function MessagesScreen({ navigation }: any) {
    const [activeTab, setActiveTab] = useState("All");
    const [friends, setFriends] = useState<Friend[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFriends = useCallback(async () => {
        try {
            const response = await friendApi.getFriends();
            if (response.success) {
                setFriends(response.friends);
                // Convert friends to conversations format
                const convos: Conversation[] = response.friends.map((f) => ({
                    id: f.id,
                    recipientId: f.id,
                    name: `${f.firstName || ""} ${f.lastName || ""}`.trim() || "Unknown",
                    avatar: f.avatar,
                    lastMessage: "Start a conversation",
                    lastMessageTime: "",
                    unread: 0,
                }));
                setConversations(convos);
            }
        } catch (error) {
            console.error("Failed to fetch friends:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFriends();
    };

    const handleMessagePress = (conversation: Conversation) => {
        navigation?.navigate("ChatDetail", {
            chatInfo: {
                id: conversation.id,
                recipientId: conversation.recipientId,
                name: conversation.name,
                subtitle: "Active now",
                img: conversation.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.name}`,
                isGroup: conversation.isGroup,
            },
        });
    };

    const Header = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Messages</Text>
            <TouchableOpacity style={styles.composeButton}>
                <Edit3 size={24} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
    );

    const TabBar = () => {
        const tabs = ["All", "Tee Times", "Groups"];
        return (
            <View style={styles.tabBar}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const MessageItem = ({ conversation }: { conversation: Conversation }) => (
        <TouchableOpacity
            style={[styles.messageItem, conversation.unread ? styles.unreadItem : styles.readItem]}
            onPress={() => handleMessagePress(conversation)}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {conversation.avatar ? (
                    <Image source={{ uri: conversation.avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>
                            {conversation.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                    <Text style={[styles.messageName, conversation.unread && styles.unreadText]} numberOfLines={1}>
                        {conversation.name}
                    </Text>
                    {conversation.lastMessageTime && (
                        <Text style={styles.messageTime}>{conversation.lastMessageTime}</Text>
                    )}
                </View>
                <Text style={styles.messagePreview} numberOfLines={1}>
                    {conversation.lastMessage}
                </Text>
            </View>
            {conversation.unread ? (
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>{conversation.unread}</Text>
                </View>
            ) : null}
        </TouchableOpacity>
    );

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            );
        }

        if (conversations.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <MessageCircle size={48} color={COLORS.textSub} />
                    <Text style={styles.emptyTitle}>No conversations yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Add friends from the Availability tab to start messaging
                    </Text>
                </View>
            );
        }

        return (
            <ScrollView
                style={styles.messagesList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >
                {conversations.map((conversation) => (
                    <MessageItem key={conversation.id} conversation={conversation} />
                ))}
                <View style={{ height: 100 }} />
            </ScrollView>
        );
    };

    const BottomNav = () => {
        const tabs = [
            { name: "Home", icon: Home, screen: "HomePage" },
            { name: "Availability", icon: Clock, screen: "Availability" },
            { name: "Messages", icon: MessageCircle, screen: "Messages" },
            { name: "Roster", icon: Users, screen: "Roster" },
            { name: "Profile", icon: User, screen: "Profile" },
        ];

        return (
            <View style={styles.bottomNav}>
                {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = tab.name === "Messages";
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.bottomNavItem}
                            onPress={() => {
                                if (navigation && tab.screen && tab.name !== "Messages") {
                                    navigation.navigate(tab.screen);
                                }
                            }}
                        >
                            <IconComponent
                                size={24}
                                color={isActive ? COLORS.primary : COLORS.textSub}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <Text style={[styles.bottomNavLabel, { color: isActive ? COLORS.primary : COLORS.textSub }]}>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
        backgroundColor: COLORS.white,
    },
    headerTitle: { fontSize: 28, fontWeight: "bold", color: COLORS.textMain },
    composeButton: { padding: 8 },
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
        borderRadius: 12,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    tabButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabButtonText: { fontSize: 14, fontWeight: "600", color: COLORS.textSub },
    tabButtonTextActive: { color: COLORS.white },
    messagesList: { flex: 1, backgroundColor: COLORS.bg },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: "600", color: COLORS.textMain, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: COLORS.textSub, textAlign: "center", marginTop: 8 },
    messageItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    unreadItem: { backgroundColor: COLORS.unreadBg },
    readItem: { backgroundColor: COLORS.readBg },
    avatarContainer: { marginRight: 12 },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.divider },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitial: { fontSize: 20, fontWeight: "bold", color: COLORS.white },
    messageContent: { flex: 1 },
    messageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    messageName: { fontSize: 16, fontWeight: "500", color: COLORS.textMain, flex: 1 },
    unreadText: { fontWeight: "700" },
    messageTime: { fontSize: 12, color: COLORS.textSub, marginLeft: 8 },
    messagePreview: { fontSize: 14, color: COLORS.textSub, marginTop: 4 },
    unreadBadge: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 8,
        marginLeft: 8,
    },
    unreadCount: { fontSize: 12, fontWeight: "bold", color: COLORS.white },
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
    bottomNavItem: { alignItems: "center" },
    bottomNavLabel: { fontSize: 10, marginTop: 4, fontWeight: "500" },
});
