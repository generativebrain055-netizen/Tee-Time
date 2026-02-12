import React, { memo, useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from "react-native";
import { ShieldOff, ChevronRight, UserX, Unlock } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";
import { friendApi } from "../../../services/api";
import { logger } from "../../../utils/logger";

interface BlockedUser {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
    blockedAt: string;
}

interface BlockedUsersCardProps {
    onRefresh?: () => void;
}

const BlockedUserItem = memo(({
    user,
    onUnblock
}: {
    user: BlockedUser;
    onUnblock: (userId: string, name: string) => void;
}) => {
    const name = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username || "Unknown User";
    const initial = name.charAt(0).toUpperCase();

    return (
        <View className="flex-row items-center px-4 py-3">
            <View className="w-11 h-11 rounded-full bg-gray-200 justify-center items-center overflow-hidden">
                {user.avatar ? (
                    <Image source={{ uri: user.avatar }} className="w-11 h-11 rounded-full" />
                ) : (
                    <Text className="text-lg font-semibold text-gray-500">{initial}</Text>
                )}
            </View>
            <View className="flex-1 ml-3">
                <Text className="text-[15px] font-medium text-gray-900">{name}</Text>
                {user.username && user.firstName && (
                    <Text className="text-[13px] text-gray-500 mt-0.5">@{user.username}</Text>
                )}
            </View>
            <TouchableOpacity
                className="flex-row items-center gap-1 px-3 py-2 bg-blue-50 rounded-md"
                onPress={() => onUnblock(user.id, name)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Unlock size={16} color={COLORS.primary} />
                <Text className="text-[13px] font-semibold text-blue-600">Unblock</Text>
            </TouchableOpacity>
        </View>
    );
});

export const BlockedUsersCard = memo(({ onRefresh }: BlockedUsersCardProps) => {
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [unblocking, setUnblocking] = useState<string | null>(null);

    const loadBlockedUsers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await friendApi.getBlockedUsers();
            if (response.success) {
                setBlockedUsers((response.blockedUsers || []) as BlockedUser[]);
            }
        } catch (error) {
            logger.error("[BlockedUsersCard] Failed to load blocked users", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (expanded && blockedUsers.length === 0) {
            loadBlockedUsers();
        }
    }, [expanded, loadBlockedUsers]);

    const handleUnblock = useCallback((userId: string, name: string) => {
        Alert.alert(
            "Unblock User",
            `Are you sure you want to unblock ${name}? They will be able to send you friend requests and invites again.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Unblock",
                    onPress: async () => {
                        setUnblocking(userId);
                        try {
                            const response = await friendApi.unblockUser(userId);
                            if (response.success) {
                                setBlockedUsers(prev => prev.filter(u => u.id !== userId));
                                Alert.alert("Unblocked", `${name} has been unblocked.`);
                                onRefresh?.();
                            }
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to unblock user");
                        } finally {
                            setUnblocking(null);
                        }
                    },
                },
            ]
        );
    }, [onRefresh]);

    const toggleExpanded = useCallback(() => {
        setExpanded(prev => !prev);
    }, []);

    return (
        <View className="bg-white rounded-md mx-5 mt-4 overflow-hidden">
            <TouchableOpacity className="flex-row items-center justify-between p-4" onPress={toggleExpanded}>
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-red-100 justify-center items-center">
                        <ShieldOff size={20} color={COLORS.red} />
                    </View>
                    <View>
                        <Text className="text-[15px] font-semibold text-gray-900">Blocked Users</Text>
                        <Text className="text-[13px] text-gray-500 mt-0.5">
                            {blockedUsers.length > 0
                                ? `${blockedUsers.length} blocked`
                                : "Manage blocked users"}
                        </Text>
                    </View>
                </View>
                <ChevronRight
                    size={20}
                    color={COLORS.textSub}
                    style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
                />
            </TouchableOpacity>

            {expanded && (
                <View className="border-t border-gray-200">
                    {loading ? (
                        <View className="p-6 items-center">
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        </View>
                    ) : blockedUsers.length === 0 ? (
                        <View className="p-6 items-center">
                            <UserX size={32} color={COLORS.textSub} />
                            <Text className="text-[15px] font-semibold text-gray-900 mt-3">No blocked users</Text>
                            <Text className="text-[13px] text-gray-500 text-center mt-1 px-4">
                                Users you block won't be able to send you friend requests or invites
                            </Text>
                        </View>
                    ) : (
                        <View className="py-2">
                            {blockedUsers.map((user) => (
                                <BlockedUserItem
                                    key={user.id}
                                    user={user}
                                    onUnblock={handleUnblock}
                                />
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
});
