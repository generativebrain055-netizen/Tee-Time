import React, { memo, useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from "react-native";
import { ShieldOff, ChevronRight, UserX, Unlock } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";
import { friendApi } from "../../../services/api";

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
        <View style={styles.userItem}>
            <View style={styles.userAvatar}>
                {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarInitial}>{initial}</Text>
                )}
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{name}</Text>
                {user.username && user.firstName && (
                    <Text style={styles.userUsername}>@{user.username}</Text>
                )}
            </View>
            <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => onUnblock(user.id, name)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Unlock size={16} color={COLORS.primary} />
                <Text style={styles.unblockText}>Unblock</Text>
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
                setBlockedUsers(response.blockedUsers || []);
            }
        } catch (error) {
            console.error("Failed to load blocked users:", error);
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
        <View style={styles.card}>
            <TouchableOpacity style={styles.header} onPress={toggleExpanded}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                        <ShieldOff size={20} color={COLORS.red} />
                    </View>
                    <View>
                        <Text style={styles.title}>Blocked Users</Text>
                        <Text style={styles.subtitle}>
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
                <View style={styles.content}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        </View>
                    ) : blockedUsers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <UserX size={32} color={COLORS.textSub} />
                            <Text style={styles.emptyText}>No blocked users</Text>
                            <Text style={styles.emptySubtext}>
                                Users you block won't be able to send you friend requests or invites
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.usersList}>
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

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        marginHorizontal: 20,
        marginTop: 16,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    content: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    loadingContainer: {
        padding: 24,
        alignItems: "center",
    },
    emptyContainer: {
        padding: 24,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: COLORS.textSub,
        textAlign: "center",
        marginTop: 4,
        paddingHorizontal: 16,
    },
    usersList: {
        paddingVertical: 8,
    },
    userItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    userAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.border,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.text,
    },
    userUsername: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    unblockButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: COLORS.primaryLight || "#E8F5E9",
        borderRadius: 8,
    },
    unblockText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.primary,
    },
});
