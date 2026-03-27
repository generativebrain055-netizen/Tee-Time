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
import { Plus, MessageCircle } from "lucide-react-native";
import { useColors, useTheme } from "../../ui/theme";
import { rosterApi, messagesApi, friendApi } from "../../services/api";
import { logger } from "../../utils/logger";

interface OnDeckListProps {
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
    
    return date.toLocaleDateString();
};

const OnDeckItem = memo(({ item, navigation, colors, theme, onAddToRoster, onRemoveFromOnDeck, onListChanged, adding }: { 
    item: any; 
    navigation: any; 
    colors: any; 
    theme: any;
    onAddToRoster?: (item: any) => void;
    /** Delete this roster row: off On Deck and not on main Roster (use + to promote instead). */
    onRemoveFromOnDeck?: (item: any) => void;
    /** Refresh list after block, etc. */
    onListChanged?: () => void;
    adding?: boolean;
}) => {
    const handlePress = () => {
        const userId = item.contact?.userId || item.id;
        const c = item.contact || item;
        const name = c.name || "";
        const parts = name.trim().split(/\s+/);
        navigation?.navigate("FriendProfile", {
            userId,
            user: {
                id: userId,
                firstName: parts[0] || c.firstName || "",
                lastName: parts.slice(1).join(" ") || c.lastName || "",
                avatar: c.avatar || item.avatar || undefined,
                friendshipStatus: "friend" as const,
            },
        });
    };

    const handleMessage = useCallback(
        async (e: any) => {
            e?.stopPropagation?.();
            const userId = item.contact?.userId;
            if (!userId) {
                Alert.alert("Message", "This contact is not on the app yet and cannot be messaged.");
                return;
            }
            try {
                const convRes = await messagesApi.getOrCreateConversation({ recipientId: userId });
                if (convRes.success && convRes.conversation && navigation) {
                    const c = item.contact || item;
                    const name = c.name || "";
                    navigation.navigate("ChatDetail", {
                        chatInfo: {
                            conversationId: convRes.conversation.id,
                            recipientId: userId,
                            id: userId,
                            name: name || "Unknown",
                            subtitle: "Direct message",
                            img: c.avatar || item.avatar,
                            isGroup: false,
                        },
                    });
                }
            } catch (err) {
                logger.error("[OnDeckList] Failed to open conversation", err);
                Alert.alert("Error", "Could not start conversation. Please try again.");
            }
        },
        [item, navigation]
    );
    
    const handleAddToRoster = (e: any) => {
        e.stopPropagation();
        onAddToRoster?.(item);
    };

    const handleLongPress = useCallback(() => {
        const c = item.contact || item;
        const name = c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "This person";
        const userId = item.contact?.userId;

        Alert.alert(
            name,
            "Remove from On Deck removes them from your roster (they won't appear on your main Roster). Use + to move them to your main Roster instead. You can also block messages.",
            [
                {
                    text: "Remove from On Deck",
                    style: "destructive",
                    onPress: () => {
                        onRemoveFromOnDeck?.(item);
                    },
                },
                ...(userId
                    ? [
                            {
                                text: "Block messages",
                                style: "destructive" as const,
                                onPress: async () => {
                                    Alert.alert(
                                        "Block messages",
                                        `Block ${name}? They will no longer be able to message you and will be removed from your On Deck and Roster.`,
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            {
                                                text: "Block",
                                                style: "destructive",
                                                onPress: async () => {
                                                    try {
                                                        await friendApi.blockUser(userId);
                                                        onListChanged?.();
                                                    } catch (err) {
                                                        logger.error("[OnDeckList] Block failed", err);
                                                        Alert.alert("Error", "Could not block user. Please try again.");
                                                    }
                                                },
                                            },
                                        ],
                                    );
                                },
                            },
                        ]
                    : []),
                { text: "Cancel", style: "cancel" },
            ],
        );
    }, [item, onListChanged, onRemoveFromOnDeck]);

    // Extract contact data (handle both roster API format and flat format)
    const contact = item.contact || item;
    const firstName = contact.name?.split(" ")[0] || contact.firstName || "";
    const lastName = contact.name?.split(" ").slice(1).join(" ") || contact.lastName || "";
    const avatar = contact.avatar || item.avatar;
    const lastPlayed = item.stats?.lastPlayedTogether || item.lastPlayed;

    return (
        <TouchableOpacity 
            onPress={handlePress}
            onLongPress={handleLongPress}
            activeOpacity={0.7}
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 20,
                backgroundColor: "#FFFFFF",
            }}
        >
            {avatar ? (
                <Image 
                    source={{ uri: avatar }} 
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                    }}
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

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity 
                    onPress={handleAddToRoster}
                    disabled={adding}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#D1D5DB",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    activeOpacity={0.7}
                >
                    {adding ? (
                        <ActivityIndicator size="small" color="#111827" />
                    ) : (
                        <Plus size={20} color="#111827" strokeWidth={2} />
                    )}
                </TouchableOpacity>
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
            </View>
        </TouchableOpacity>
    );
});

OnDeckItem.displayName = "OnDeckItem";

export default function OnDeckList({ navigation }: OnDeckListProps) {
    const colors = useColors();
    const theme = useTheme();
    const [onDeck, setOnDeck] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);

    const loadOnDeck = useCallback(async () => {
        try {
            const response = await rosterApi.getOnDeck();
            if (response.success) {
                const data = response.onDeck || [];
                setOnDeck(data);
            }
        } catch (error) {
            logger.error("[OnDeckList] Failed to load on-deck", error);
            setOnDeck([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    
    /** On-deck rows are roster entries; clear is_on_deck and append to main roster order. */
    const moveOffDeck = useCallback(
        async (item: any) => {
            setAddingId(item.id);
            try {
                const rosterRes = await rosterApi.getRoster();
                const rosterLength =
                    rosterRes.success && rosterRes.roster ? rosterRes.roster.length : 0;
                await rosterApi.moveMember(item.id, {
                    isOnDeck: false,
                    newPosition: rosterLength,
                });
                logger.info("[OnDeckList] Moved off on-deck", { rosterId: item.id });
                await loadOnDeck();
            } catch (error: any) {
                logger.error("[OnDeckList] Failed to move off on-deck", error);
                const errorMessage =
                    error.message || "Could not update roster. Please try again.";
                Alert.alert("Error", errorMessage);
            } finally {
                setAddingId(null);
            }
        },
        [loadOnDeck],
    );

    const handleAddToRoster = useCallback(
        (item: any) => {
            void moveOffDeck(item);
        },
        [moveOffDeck],
    );

    /** Drop from On Deck without promoting: delete roster entry (same as remove from roster). */
    const removeFromOnDeckOnly = useCallback(
        async (item: any) => {
            setAddingId(item.id);
            try {
                await rosterApi.removeFromRoster(item.id);
                logger.info("[OnDeckList] Removed on-deck entry (roster delete)", {
                    rosterId: item.id,
                });
                await loadOnDeck();
            } catch (error: any) {
                logger.error("[OnDeckList] Remove from on-deck failed", error);
                Alert.alert(
                    "Error",
                    error?.message || "Could not remove from On Deck. Please try again.",
                );
            } finally {
                setAddingId(null);
            }
        },
        [loadOnDeck],
    );

    useEffect(() => {
        loadOnDeck();
    }, [loadOnDeck]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadOnDeck();
    }, [loadOnDeck]);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={onDeck.length === 0 ? { flexGrow: 1, justifyContent: "center" } : undefined}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
                keyboardShouldPersistTaps="handled"
            >
                {onDeck.length > 0 ? (
                    <>
                        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
                            <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 13, color: "#6B7280" }}>
                                {onDeck.length} {onDeck.length === 1 ? "player" : "players"} on deck
                            </Text>
                            <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                                Tap + to move to main Roster. Long-press to remove from On Deck (off roster) or block.
                            </Text>
                        </View>
                        {onDeck.map((item, index) => (
                            <React.Fragment key={item.id || index}>
                                <OnDeckItem
                                    item={item}
                                    navigation={navigation}
                                    colors={colors}
                                    theme={theme}
                                    onAddToRoster={handleAddToRoster}
                                    onRemoveFromOnDeck={removeFromOnDeckOnly}
                                    onListChanged={loadOnDeck}
                                    adding={addingId === item.id}
                                />
                                {index < onDeck.length - 1 && (
                                    <View style={{ height: 1, backgroundColor: "#F3F4F6", marginLeft: 76 }} />
                                )}
                            </React.Fragment>
                        ))}
                        <View style={{ height: 100 }} />
                    </>
                ) : (
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, minHeight: 280 }}>
                        <Text style={{
                            fontFamily: theme.fontFamily.semiBold,
                            fontSize: 20,
                            color: "#111827",
                            textAlign: "center",
                        }}>
                            Backup players
                        </Text>
                        <Text style={{
                            fontFamily: theme.fontFamily.regular,
                            fontSize: 15,
                            color: "#6B7280",
                            marginTop: 16,
                            textAlign: "center",
                            lineHeight: 22,
                        }}>
                            Golfing buddies who are not part of your core Roster; out-of-town friends, occasional players, or last-minute fills. Promote them to your Roster at anytime or invite them directly via Manual Invite.
                        </Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: colors.primary,
                                paddingHorizontal: 32,
                                paddingVertical: 14,
                                borderRadius: 10,
                                marginTop: 28,
                            }}
                            onPress={() => navigation?.navigate("FindPlayers")}
                        >
                            <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 15, color: "#FFFFFF" }}>
                                Find players
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
