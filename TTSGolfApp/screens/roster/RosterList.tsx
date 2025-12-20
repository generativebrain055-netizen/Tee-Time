import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Calendar, MessageCircle, Menu } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { friendApi, Friend } from "../../services/api";

interface RosterListProps {
    navigation: any;
}

// Memoized helper - computed once
const formatLastPlayed = (dateStr?: string): string => {
    if (!dateStr) return "Never played";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Last played: today";
    if (diffDays === 1) return "Last played: yesterday";
    if (diffDays < 7) return `Last played: ${diffDays} days ago`;
    if (diffDays < 14) return "Last played: 1 week ago";
    if (diffDays < 30) return `Last played: ${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return "Last played: last month";

    return `Last played: ${date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}`;
};

const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
};

// Memoized row component - prevents re-renders
interface RosterItemProps {
    friend: Friend;
    index: number;
    onInvite: (friend: Friend) => void;
    onMessage: (friend: Friend) => void;
}

const RosterItem = memo(({ friend, index, onInvite, onMessage }: RosterItemProps) => {
    const handleInvite = useCallback(() => onInvite(friend), [friend, onInvite]);
    const handleMessage = useCallback(() => onMessage(friend), [friend, onMessage]);

    return (
        <View style={styles.rosterItem}>
            <View style={styles.dragHandle}>
                <Menu size={20} color={COLORS.textSub} />
            </View>

            <Text style={styles.rankNumber}>{index + 1}</Text>

            <View style={styles.avatarContainer}>
                {friend.avatar ? (
                    <Image source={{ uri: friend.avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>
                            {getInitials(friend.firstName, friend.lastName)}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.name}>
                    {friend.firstName} {friend.lastName}
                </Text>
                <Text style={styles.lastPlayed}>
                    {formatLastPlayed(friend.friendsSince)}
                </Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleInvite}>
                    <Calendar size={18} color={COLORS.primary} strokeWidth={1.5} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
                    <MessageCircle size={18} color={COLORS.primary} strokeWidth={1.5} />
                </TouchableOpacity>
            </View>
        </View>
    );
});

RosterItem.displayName = 'RosterItem';

// Empty state component
const EmptyState = memo(({ onFindPlayers }: { onFindPlayers: () => void }) => (
    <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No friends in roster</Text>
        <Text style={styles.emptySubtext}>
            Add friends from Availability to build your roster
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={onFindPlayers}>
            <Text style={styles.addButtonText}>Find Players</Text>
        </TouchableOpacity>
    </View>
));

EmptyState.displayName = 'EmptyState';

function RosterList({ navigation }: RosterListProps) {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadFriends = useCallback(async () => {
        try {
            const response = await friendApi.getFriends();
            if (response.success) {
                setFriends(response.friends);
            }
        } catch (error) {
            console.error("Failed to load friends:", error);
            setFriends([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadFriends();
    }, [loadFriends]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadFriends();
    }, [loadFriends]);

    // Stable callbacks - won't cause child re-renders
    const handleInvite = useCallback((friend: Friend) => {
        navigation?.navigate("CreateTeeTime", { invitee: friend });
    }, [navigation]);

    const handleMessage = useCallback((friend: Friend) => {
        navigation?.navigate("ChatDetail", {
            chatInfo: {
                id: friend.id,
                name: `${friend.firstName} ${friend.lastName}`,
                avatar: friend.avatar,
            },
        });
    }, [navigation]);

    const handleFindPlayers = useCallback(() => {
        navigation?.navigate("Availability");
    }, [navigation]);

    // Optimized render function
    const renderItem = useCallback(({ item, index }: { item: Friend; index: number }) => (
        <RosterItem
            friend={item}
            index={index}
            onInvite={handleInvite}
            onMessage={handleMessage}
        />
    ), [handleInvite, handleMessage]);

    const keyExtractor = useCallback((item: Friend) => item.id, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (friends.length === 0) {
        return <EmptyState onFindPlayers={handleFindPlayers} />;
    }

    return (
        <FlashList
            data={friends}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            estimatedItemSize={80}
            contentContainerStyle={styles.listContent}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={COLORS.primary}
                />
            }
        />
    );
}

export default memo(RosterList);

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textMain,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        marginBottom: 24,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
    },
    rosterItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    dragHandle: {
        padding: 8,
        marginRight: 4,
    },
    rankNumber: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textMain,
        width: 24,
    },
    avatarContainer: {
        marginLeft: 8,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    lastPlayed: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    actions: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#E8F5E9",
        justifyContent: "center",
        alignItems: "center",
    },
});
