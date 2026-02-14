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
    Modal,
} from "react-native";
import { MessageCircle, MoreVertical, Trash2 } from "lucide-react-native";
import { useColors, useTheme } from "../../ui/theme";
import { rosterApi, messagesApi } from "../../services/api";
import { logger } from "../../utils/logger";

interface RosterListProps {
    navigation: any;
    removeMode?: boolean;
    onEnterRemoveMode?: () => void;
    onExitRemoveMode?: () => void;
    /** When this value changes (e.g. after Done), scroll list to top to show normal roster screen. */
    scrollToTopTrigger?: number;
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

const RosterItem = memo(({ item, index, navigation, colors, theme, onRemove, isEditMode, onLongPressItem }: { 
    item: any; 
    index: number; 
    navigation: any;
    colors: any;
    theme: any;
    onRemove?: (rosterId: string) => void;
    isEditMode?: boolean;
    onLongPressItem?: () => void;
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const contact = item.contact || item;
    const userId = contact.userId;
    
    const handlePress = () => {
        if (isEditMode) return;
        navigation?.navigate("FriendProfile", { userId: userId || item.id });
    };
    
    const handleLongPress = () => {
        if (isEditMode) return;
        onLongPressItem?.();
    };
    
    const handleMessage = useCallback(async (e: any) => {
        e?.stopPropagation();
        if (isEditMode) return;
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
    }, [userId, contact, isEditMode, navigation]);
    
    const handleRemoveFromList = () => {
        setShowMenu(false);
        if (isEditMode) {
            onRemove?.(item.id);
            return;
        }
        const name = contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
        Alert.alert(
            "Remove from Roster",
            `Remove ${name} from your roster? They will no longer be auto-invited to your tee times.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => onRemove?.(item.id),
                },
            ]
        );
    };
    
    // Use contact from top of component (item.contact || item)
    const firstName = contact.name?.split(" ")[0] || contact.firstName || "";
    const lastName = contact.name?.split(" ").slice(1).join(" ") || contact.lastName || "";
    const avatar = contact.avatar || item.avatar;
    const lastPlayed = item.stats?.lastPlayedTogether || item.lastPlayed;

    return (
        <>
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
            {/* Green Badge */}
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
                    backgroundColor: "#E5E7EB",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#6B7280" }}>
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

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {isEditMode ? (
                    <TouchableOpacity 
                        onPress={(e) => {
                            e.stopPropagation();
                            onRemove?.(item.id);
                        }}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: "#FEE2E2",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        activeOpacity={0.7}
                    >
                        <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity 
                            onPress={(e) => {
                                e.stopPropagation();
                                setShowMenu(true);
                            }}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: "#F3F4F6",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            activeOpacity={0.7}
                        >
                            <MoreVertical size={18} color="#6B7280" strokeWidth={2} />
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
                    </>
                )}
            </View>
        </TouchableOpacity>
        
        {/* Action Menu Modal */}
        <Modal
            visible={showMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowMenu(false)}
        >
            <TouchableOpacity 
                style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "center",
                    alignItems: "center",
                }}
                activeOpacity={1}
                onPress={() => setShowMenu(false)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 16,
                        padding: 8,
                        minWidth: 200,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 8,
                    }}>
                        <TouchableOpacity
                            onPress={handleRemoveFromList}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                padding: 12,
                                borderRadius: 8,
                            }}
                            activeOpacity={0.7}
                        >
                            <Trash2 size={20} color="#EF4444" strokeWidth={2} />
                            <Text style={{
                                fontFamily: theme.fontFamily.semiBold,
                                fontSize: 15,
                                color: "#EF4444",
                                marginLeft: 12,
                            }}>
                                Remove from Roster
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
        </>
    );
});

RosterItem.displayName = "RosterItem";

type UndoState = { userId: string; name: string } | null;

export default function SimpleRosterList({ navigation, removeMode = false, onEnterRemoveMode, onExitRemoveMode, scrollToTopTrigger = 0 }: RosterListProps) {
    const colors = useColors();
    const theme = useTheme();
    const scrollRef = React.useRef<ScrollView | null>(null);
    const [roster, setRoster] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [undoState, setUndoState] = useState<UndoState>(null);
    const undoTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

    useEffect(() => {
        return () => {
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (scrollToTopTrigger > 0 && scrollRef.current) {
            scrollRef.current.scrollTo({ y: 0, animated: true });
        }
    }, [scrollToTopTrigger]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadRoster();
    }, [loadRoster]);

    const showUndoSnackbar = useCallback((userId: string, name: string) => {
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        setUndoState({ userId, name });
        undoTimeoutRef.current = setTimeout(() => {
            setUndoState(null);
            undoTimeoutRef.current = null;
        }, 5000);
    }, []);

    const handleUndo = useCallback(async () => {
        if (!undoState) return;
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = null;
        }
        try {
            await rosterApi.addToRoster({ contactUserId: undoState.userId });
            setUndoState(null);
            await loadRoster();
        } catch (err) {
            logger.error("[SimpleRosterList] Undo add to roster failed", err);
            Alert.alert("Error", "Could not add back to roster.");
        }
    }, [undoState, loadRoster]);

    const handleRemove = useCallback(async (rosterId: string) => {
        const item = roster.find((r) => r.id === rosterId);
        const contact = item?.contact || item;
        const userId = contact?.userId;
        const name = contact?.name || [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim() || "Contact";

        setRemovingId(rosterId);
        try {
            await rosterApi.removeFromRoster(rosterId);
            logger.info("[SimpleRosterList] Removed from roster", { rosterId });
            await loadRoster();
            if (removeMode && userId) {
                showUndoSnackbar(userId, name);
            }
        } catch (error) {
            logger.error("[SimpleRosterList] Failed to remove from roster", error);
            Alert.alert("Error", "Failed to remove from roster. Please try again.");
        } finally {
            setRemovingId(null);
        }
    }, [loadRoster, roster, removeMode, showUndoSnackbar]);

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
                            onRemove={handleRemove}
                            isEditMode={removeMode}
                            onLongPressItem={onEnterRemoveMode}
                        />
                        {index < roster.length - 1 && (
                            <View style={{ height: 1, backgroundColor: "#F3F4F6", marginLeft: 88 }} />
                        )}
                    </React.Fragment>
                ))}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Removed from roster - Undo snackbar (Figma 795-2173, 795-2326) */}
            {undoState && (
                <View
                    style={{
                        position: "absolute",
                        left: 16,
                        right: 16,
                        bottom: 24,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "#111827",
                        borderRadius: 12,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                        elevation: 8,
                    }}
                >
                    <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 15, color: "#FFFFFF", flex: 1 }}>
                        Removed from roster
                    </Text>
                    <TouchableOpacity
                        onPress={handleUndo}
                        style={{ paddingVertical: 4, paddingHorizontal: 12 }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 15, color: "#60A5FA" }}>
                            Undo
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
