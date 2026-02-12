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
import { rosterApi } from "../../services/api";
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

const RosterItem = memo(({ item, index, navigation, colors, theme, onRemove, isEditMode }: { 
    item: any; 
    index: number; 
    navigation: any;
    colors: any;
    theme: any;
    onRemove?: (rosterId: string) => void;
    isEditMode?: boolean;
}) => {
    const [showMenu, setShowMenu] = useState(false);
    
    const handlePress = () => {
        if (isEditMode) return;
        const userId = item.contact?.userId || item.id;
        navigation?.navigate("FriendProfile", { userId });
    };
    
    const handleLongPress = () => {
        setShowMenu(true);
    };
    
    const handleRemove = () => {
        setShowMenu(false);
        const contact = item.contact || item;
        const name = contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
        
        Alert.alert(
            "Remove from Roster",
            `Remove ${name} from your roster? They will no longer be auto-invited to your tee times.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        onRemove?.(item.id);
                    },
                },
            ]
        );
    };
    
    // Extract contact data (handle both roster API format and flat format)
    const contact = item.contact || item;
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
                    onPress={(e) => {
                        e.stopPropagation();
                        // Handle message action
                    }}
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
                            onPress={handleRemove}
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

export default function SimpleRosterList({ navigation }: RosterListProps) {
    const colors = useColors();
    const theme = useTheme();
    const [roster, setRoster] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

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

    const handleRemove = useCallback(async (rosterId: string) => {
        setRemovingId(rosterId);
        try {
            await rosterApi.removeFromRoster(rosterId);
            logger.info("[SimpleRosterList] Removed from roster", { rosterId });
            // Reload roster to reflect changes
            await loadRoster();
        } catch (error) {
            logger.error("[SimpleRosterList] Failed to remove from roster", error);
            Alert.alert("Error", "Failed to remove from roster. Please try again.");
        } finally {
            setRemovingId(null);
        }
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
        <ScrollView
            style={{ flex: 1, backgroundColor: "#FFFFFF" }}
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
                    />
                    {index < roster.length - 1 && (
                        <View style={{ height: 1, backgroundColor: "#F3F4F6", marginLeft: 88 }} />
                    )}
                </React.Fragment>
            ))}
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}
