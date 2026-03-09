import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Modal,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Calendar, MessageCircle, Menu, X, UserMinus, ArrowDown } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { friendApi, Friend } from "../../services/api";
import { logger } from "../../utils/logger";

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
    onRemove: (friend: Friend) => void;
}

const RosterItem = memo(({ friend, index, onInvite, onMessage, onRemove }: RosterItemProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const handleInvite = useCallback(() => onInvite(friend), [friend, onInvite]);
    const handleMessage = useCallback(() => onMessage(friend), [friend, onMessage]);
    const handleMenuPress = useCallback(() => setShowMenu(true), []);
    const handleCloseMenu = useCallback(() => setShowMenu(false), []);
    const handleRemove = useCallback(() => {
        setShowMenu(false);
        onRemove(friend);
    }, [friend, onRemove]);

    return (
        <>
            <View className="flex-row items-center py-4 px-3 bg-white border-b border-gray-100">
                <TouchableOpacity className="p-2 mr-1" onPress={handleMenuPress}>
                    <Menu size={20} color={COLORS.textSub} />
                </TouchableOpacity>

                <Text className="text-base font-semibold text-gray-900 w-6">{index + 1}</Text>

                <View className="ml-2">
                    {friend.avatar ? (
                        <Image source={{ uri: friend.avatar }} className="w-12 h-12 rounded-full" />
                    ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-200 justify-center items-center">
                            <Text className="text-base font-semibold text-gray-500">
                                {getInitials(friend.firstName, friend.lastName)}
                            </Text>
                        </View>
                    )}
                </View>

                <View className="flex-1 ml-3">
                    <Text className="text-[15px] font-semibold text-gray-900">
                        {friend.firstName} {friend.lastName}
                    </Text>
                    <Text className="text-[13px] text-gray-500 mt-0.5">
                        {formatLastPlayed(friend.friendsSince)}
                    </Text>
                </View>

                <View className="flex-row gap-2">
                    <TouchableOpacity className="w-10 h-10 rounded-md bg-green-50 justify-center items-center" onPress={handleInvite}>
                        <Calendar size={18} color={COLORS.primary} strokeWidth={1.5} />
                    </TouchableOpacity>
                    <TouchableOpacity className="w-10 h-10 rounded-md bg-green-50 justify-center items-center" onPress={handleMessage}>
                        <MessageCircle size={18} color={COLORS.primary} strokeWidth={1.5} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Action Menu Modal */}
            <Modal
                visible={showMenu}
                transparent
                animationType="fade"
                onRequestClose={handleCloseMenu}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
                    activeOpacity={1}
                    onPress={handleCloseMenu}
                >
                    <TouchableOpacity
                        style={{
                            width: '80%', maxWidth: 320, backgroundColor: 'white',
                            borderRadius: 16, overflow: 'hidden',
                        }}
                        activeOpacity={1}
                    >
                        {/* Header */}
                        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                                    {friend.firstName} {friend.lastName}
                                </Text>
                                <TouchableOpacity onPress={handleCloseMenu}>
                                    <X size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={{ padding: 8 }}>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 12,
                                    padding: 14, borderRadius: 10,
                                }}
                                onPress={handleRemove}
                            >
                                <UserMinus size={20} color="#EF4444" />
                                <Text style={{ fontSize: 15, fontWeight: '600', color: '#EF4444', flex: 1 }}>
                                    Remove Friend
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );
});

RosterItem.displayName = 'RosterItem';

// Empty state component
const EmptyState = memo(({ onFindPlayers }: { onFindPlayers: () => void }) => (
    <View className="flex-1 justify-center items-center px-8">
        <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
            marginBottom: 20,
        }}>
            <Menu size={36} color="#9CA3AF" strokeWidth={1.5} />
        </View>
        <Text style={{
            fontSize: 22, fontWeight: '700', color: '#111827',
            marginBottom: 8, textAlign: 'center',
        }}>
            Build your roster
        </Text>
        <Text style={{
            fontSize: 15, color: '#6B7280', textAlign: 'center',
            lineHeight: 22, marginBottom: 24, paddingHorizontal: 16,
        }}>
            Your go-to golf buddies. Prioritize, Manage your players in one place, set their invite order, and quickly fill tee times without combing through each time.
        </Text>
        <TouchableOpacity
            style={{
                backgroundColor: COLORS.primary, paddingHorizontal: 32,
                paddingVertical: 14, borderRadius: 10,
            }}
            onPress={onFindPlayers}
        >
            <Text style={{ fontSize: 15, fontWeight: '600', color: 'white' }}>
                Find players
            </Text>
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
            logger.error("[RosterList] Failed to load friends", error);
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
                recipientId: friend.id,
                name: `${friend.firstName} ${friend.lastName}`,
                subtitle: "Direct message",
                img: friend.avatar,
                isGroup: false,
            },
        });
    }, [navigation]);

    const handleFindPlayers = useCallback(() => {
        navigation?.navigate("Availability");
    }, [navigation]);

    const handleRemoveFriend = useCallback(async (friend: Friend) => {
        Alert.alert(
            "Remove Friend",
            `Are you sure you want to remove ${friend.firstName} ${friend.lastName} from your roster?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await friendApi.removeFriend(friend.id);
                            setFriends(prev => prev.filter(f => f.id !== friend.id));
                        } catch (error: any) {
                            logger.error("[RosterList] Remove friend error", error);
                            Alert.alert("Error", error.message || "Failed to remove friend");
                        }
                    },
                },
            ]
        );
    }, []);

    // Optimized render function
    const renderItem = useCallback(({ item, index }: { item: Friend; index: number }) => (
        <RosterItem
            friend={item}
            index={index}
            onInvite={handleInvite}
            onMessage={handleMessage}
            onRemove={handleRemoveFriend}
        />
    ), [handleInvite, handleMessage, handleRemoveFriend]);

    const keyExtractor = useCallback((item: Friend) => item.id, []);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
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
            // @ts-expect-error - FlashList types mismatch
            estimatedItemSize={80}
            contentContainerStyle={{ paddingBottom: 100 }}
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
