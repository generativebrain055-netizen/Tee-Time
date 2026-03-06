import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from "react-native";
import { MessageCircle } from "lucide-react-native";
import { useColors, useTheme } from "../../ui/theme";
import { rosterApi, messagesApi } from "../../services/api";
import { logger } from "../../utils/logger";

interface RosterListProps {
    navigation: any;
}

const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
};

const formatLastPlayed = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays === 2) return "2 days ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return "last month";
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
};

const RosterItem = memo(({ item, index, navigation, colors, theme }: { 
    item: any; 
    index: number; 
    navigation: any;
    colors: any;
    theme: any;
}) => {
    const contact = item.contact || item;
    const userId = contact.userId;
    
    const handlePress = () => {
        navigation?.navigate("FriendProfile", {
            userId: userId || item.id,
            user: {
                id: userId || item.id,
                firstName: contact.name?.split(" ")[0] || contact.firstName || "",
                lastName: contact.name?.split(" ").slice(1).join(" ") || contact.lastName || "",
                avatar: avatar || undefined,
                friendshipStatus: "friend" as const,
            },
        });
    };
    
    const handleMessage = useCallback(async (e: any) => {
        e?.stopPropagation();
        if (!userId) {
            Alert.alert("Message", "This contact is not a registered user and cannot be messaged.");
            return;
        }
        try {
            const convRes = await messagesApi.getOrCreateConversation({ recipientId: userId });
            if (convRes.success && convRes.conversation) {
                const name = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
                navigation?.navigate("ChatDetail", {
                    chatInfo: {
                        conversationId: convRes.conversation.id,
                        recipientId: userId,
                        id: userId,
                        name: name || "Unknown",
                        subtitle: "Direct message",
                        img: contact.avatar,
                        isGroup: false,
                    },
                });
            }
        } catch (err) {
            logger.error("[SimpleRosterList] Failed to open conversation", err);
            Alert.alert("Error", "Could not open conversation.");
        }
    }, [userId, contact, navigation]);
    
    const firstName = contact.name?.split(" ")[0] || contact.firstName || "";
    const lastName = contact.name?.split(" ").slice(1).join(" ") || contact.lastName || "";
    const avatar = contact.avatar || item.avatar;
    const lastPlayed = item.stats?.lastPlayedTogether || item.lastPlayed;

    return (
        <>
        <TouchableOpacity 
            onPress={handlePress}
            activeOpacity={0.7}
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 20,
                backgroundColor: "#FFFFFF",
            }}
        >
            {/* Green numbered badge */}
            <View 
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#22C55E",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                }}
            >
                <Text style={{ fontFamily: theme.fontFamily.bold, fontSize: 14, color: "#FFFFFF" }}>
                    {index + 1}
                </Text>
            </View>

            {/* Avatar */}
            {avatar ? (
                <Image 
                    source={{ uri: avatar }} 
                    style={{ width: 56, height: 56, borderRadius: 28 }}
                />
            ) : (
                <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#FFFFFF" }}>
                        {getInitials(firstName, lastName)}
                    </Text>
                </View>
            )}

            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#111827" }}>
                    {contact.name || `${firstName} ${lastName}`.trim()}
                </Text>
                <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>
                    Last played: {lastPlayed ? formatLastPlayed(lastPlayed) : "never"}
                </Text>
            </View>

            {/* Message button */}
            <TouchableOpacity 
                onPress={handleMessage}
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#DBEAFE",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                activeOpacity={0.7}
            >
                <MessageCircle size={18} color="#3B82F6" strokeWidth={2} />
            </TouchableOpacity>
        </TouchableOpacity>
        </>
    );
});

RosterItem.displayName = "RosterItem";

export default function SimpleRosterList({ navigation }: RosterListProps) {
    const colors = useColors();
    const theme = useTheme();
    const scrollRef = React.useRef<ScrollView | null>(null);
    const [roster, setRoster] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadRoster = useCallback(async () => {
        try {
            const response = await rosterApi.getRoster();
            if (response.success) {
                setRoster(response.roster || []);
            }
        } catch (error) {
            logger.error("[SimpleRosterList] Failed to load roster", error);
            setRoster([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadRoster();
    }, [loadRoster]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadRoster();
    }, [loadRoster]);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (roster.length === 0) {
        return (
            <ScrollView 
                style={{ flex: 1, backgroundColor: "#FFFFFF" }}
                contentContainerStyle={{ flex: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
                    <Text style={{ 
                        fontFamily: theme.fontFamily.bold, 
                        fontSize: 20, 
                        color: "#111827",
                        marginBottom: 12,
                        textAlign: "center",
                    }}>
                        Build your roster
                    </Text>
                    <Text style={{ 
                        fontFamily: theme.fontFamily.regular, 
                        fontSize: 15, 
                        color: "#6B7280",
                        textAlign: "center",
                        lineHeight: 22,
                        marginBottom: 24,
                    }}>
                        Your go-to list of golfing buddies. Manage your players in one place, set their invite order, and quickly fill tee times without manually adding each time.
                    </Text>
                    <TouchableOpacity
                        style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: 32,
                            paddingVertical: 14,
                            borderRadius: 10,
                        }}
                        onPress={() => navigation?.navigate('FindPlayers')}
                    >
                        <Text style={{ 
                            fontFamily: theme.fontFamily.semiBold,
                            fontSize: 15, 
                            color: "#FFFFFF",
                        }}>
                            Find players
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {roster.map((item, index) => (
                    <React.Fragment key={item.id || index}>
                        <RosterItem 
                            item={item} 
                            index={index} 
                            navigation={navigation} 
                            colors={colors} 
                            theme={theme}
                        />
                        {index < roster.length - 1 && (
                            <View style={{ height: 1, backgroundColor: "#F3F4F6", marginLeft: 88 }} />
                        )}
                    </React.Fragment>
                ))}
                <View style={{ height: 100 }} />
            </ScrollView>

        </View>
    );
}
