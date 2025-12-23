import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import { Bell, Users, Calendar, CheckCircle, Trash2, UserPlus, X } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { Header } from "../../components/common";
import { notificationApi, friendApi, AppNotification } from "../../services/api";

interface NotificationsScreenProps {
    navigation: any;
}

// Notification item component
const NotificationItem = memo(({
    item,
    onPress,
    onDelete,
    onAcceptFriend,
    onDeclineFriend,
    onAcceptSpot
}: {
    item: AppNotification;
    onPress: (item: AppNotification) => void;
    onDelete: (id: string) => void;
    onAcceptFriend: (item: AppNotification) => void;
    onDeclineFriend: (item: AppNotification) => void;
    onAcceptSpot: (item: AppNotification) => void;
}) => {
    const getIcon = () => {
        const notifType = item.data?.type;
        switch (notifType) {
            case 'friend_request':
            case 'friend_accepted':
            case 'roster_add':
                return <Users size={20} color={COLORS.primary} />;
            case 'tee_time_invite':
            case 'tee_time_response':
            case 'check_in_reminder':
            case 'spot_opened':
                return <Calendar size={20} color={COLORS.primary} />;
            case 'no_show':
                return <Bell size={20} color="#EF4444" />;
            default:
                return <Bell size={20} color={COLORS.primary} />;
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const notifType = item.data?.type;
    const isFriendRequest = notifType === 'friend_request';
    const isSpotOpened = notifType === 'spot_opened';
    const isFriendRequestActionable = isFriendRequest && item.data?.requestId && !item.data?.responded;
    const isSpotOpenedActionable = isSpotOpened && item.data?.teeTimeId && !item.data?.responded;

    return (
        <TouchableOpacity
            style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                {getIcon()}
            </View>
            <View style={styles.contentContainer}>
                <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                </Text>

                {/* Friend Request Action Buttons */}
                {isFriendRequestActionable && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={() => onAcceptFriend(item)}
                        >
                            <UserPlus size={14} color={COLORS.white} />
                            <Text style={styles.acceptButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.declineButton}
                            onPress={() => onDeclineFriend(item)}
                        >
                            <X size={14} color={COLORS.textSub} />
                            <Text style={styles.declineButtonText}>Decline</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Spot Opened Action Button */}
                {isSpotOpenedActionable && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={() => onAcceptSpot(item)}
                        >
                            <Calendar size={14} color={COLORS.white} />
                            <Text style={styles.acceptButtonText}>Accept Spot</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>
            </View>
            <View style={styles.actions}>
                {!item.isRead && <View style={styles.unreadDot} />}
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => onDelete(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Trash2 size={16} color={COLORS.textSub} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
});

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await notificationApi.getNotifications({ limit: 50 });
            if (response.success) {
                setNotifications(response.notifications);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, [fetchNotifications]);

    const handleNotificationPress = useCallback(async (item: AppNotification) => {
        // Mark as read
        if (!item.isRead) {
            try {
                await notificationApi.markAsRead(item.id);
                setNotifications(prev =>
                    prev.map(n => n.id === item.id ? { ...n, isRead: true } : n)
                );
            } catch (error) {
                console.error("Error marking notification as read:", error);
            }
        }

        // Navigate based on notification type
        const notifType = item.data?.type;

        switch (notifType) {
            case 'friend_request':
                // Navigate to sender's profile to accept/reject
                if (item.data?.senderId) {
                    navigation?.navigate("FriendProfile", { userId: item.data.senderId });
                }
                break;

            case 'friend_accepted':
                // Navigate to the user who accepted
                if (item.data?.userId) {
                    navigation?.navigate("FriendProfile", { userId: item.data.userId });
                }
                break;

            case 'tee_time_invite':
                // Navigate to Invites screen to accept/reject
                navigation?.navigate("Invites");
                break;

            case 'tee_time_response':
                // Navigate to the tee time details
                if (item.data?.teeTimeId) {
                    navigation?.navigate("TeeTimeDetail", { teeTimeId: item.data.teeTimeId });
                }
                break;

            case 'check_in_reminder':
                // Navigate to the check-in screen
                if (item.data?.teeTimeId) {
                    navigation?.navigate("CheckIn", {
                        teeTimeId: item.data.teeTimeId,
                        courseName: item.data.courseName
                    });
                }
                break;

            case 'no_show':
                // Navigate to social rate history
                navigation?.navigate("Profile");
                break;

            case 'roster_add':
                // Navigate to the person who added you
                if (item.data?.ownerId) {
                    navigation?.navigate("FriendProfile", { userId: item.data.ownerId });
                }
                break;

            case 'spot_opened':
                // Navigate to invites to accept the spot
                navigation?.navigate("Invites");
                break;

            default:
                // No specific navigation
                break;
        }
    }, [navigation]);

    const handleDelete = useCallback((notificationId: string) => {
        Alert.alert(
            "Delete Notification",
            "Are you sure you want to delete this notification?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await notificationApi.deleteNotification(notificationId);
                            setNotifications(prev => prev.filter(n => n.id !== notificationId));
                        } catch (error) {
                            console.error("Error deleting notification:", error);
                        }
                    },
                },
            ]
        );
    }, []);

    const handleAcceptFriend = useCallback(async (item: AppNotification) => {
        const requestId = item.data?.requestId;
        if (!requestId) return;

        try {
            const response = await friendApi.respondToRequest(requestId, 'accepted');
            if (response.success) {
                Alert.alert("Friend Added!", "You are now friends!");
                // Update the notification to show it's been responded to
                setNotifications(prev =>
                    prev.map(n => n.id === item.id
                        ? { ...n, data: { ...n.data, responded: true }, isRead: true }
                        : n
                    )
                );
            }
        } catch (error) {
            console.error("Error accepting friend request:", error);
            Alert.alert("Error", "Failed to accept friend request");
        }
    }, []);

    const handleDeclineFriend = useCallback(async (item: AppNotification) => {
        const requestId = item.data?.requestId;
        if (!requestId) return;

        Alert.alert(
            "Decline Request",
            "Are you sure you want to decline this friend request?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Decline",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await friendApi.respondToRequest(requestId, 'declined');
                            if (response.success) {
                                // Update the notification to show it's been responded to
                                setNotifications(prev =>
                                    prev.map(n => n.id === item.id
                                        ? { ...n, data: { ...n.data, responded: true }, isRead: true }
                                        : n
                                    )
                                );
                            }
                        } catch (error) {
                            console.error("Error declining friend request:", error);
                            Alert.alert("Error", "Failed to decline friend request");
                        }
                    },
                },
            ]
        );
    }, []);

    const handleAcceptSpot = useCallback(async (item: AppNotification) => {
        const teeTimeId = item.data?.teeTimeId;
        if (!teeTimeId) return;

        // Navigate to invites screen where they can accept
        // Mark notification as responded
        setNotifications(prev =>
            prev.map(n => n.id === item.id
                ? { ...n, data: { ...n.data, responded: true }, isRead: true }
                : n
            )
        );
        navigation?.navigate("Invites");
    }, [navigation]);

    const handleMarkAllRead = useCallback(async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const renderItem = useCallback(({ item }: { item: AppNotification }) => (
        <NotificationItem
            item={item}
            onPress={handleNotificationPress}
            onDelete={handleDelete}
            onAcceptFriend={handleAcceptFriend}
            onDeclineFriend={handleDeclineFriend}
            onAcceptSpot={handleAcceptSpot}
        />
    ), [handleNotificationPress, handleDelete, handleAcceptFriend, handleDeclineFriend, handleAcceptSpot]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Bell size={48} color={COLORS.textSub} strokeWidth={1} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
                You'll see notifications here when someone adds you to their roster or invites you to a tee time.
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <Header
                title="Notifications"
                onBack={() => navigation?.goBack()}
                rightComponent={
                    unreadCount > 0 ? (
                        <TouchableOpacity onPress={handleMarkAllRead}>
                            <CheckCircle size={22} color={COLORS.primary} strokeWidth={1.5} />
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            {/* Unread count badge */}
            {unreadCount > 0 && (
                <View style={styles.unreadBanner}>
                    <Text style={styles.unreadBannerText}>
                        {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </Text>
                </View>
            )}

            {/* Notifications List */}
            <FlashList
                data={notifications}
                renderItem={renderItem}
                estimatedItemSize={90}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={COLORS.primary}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    unreadBanner: {
        backgroundColor: COLORS.primaryLight || "#E8F5E9",
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    unreadBannerText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: "500",
    },
    listContent: {
        paddingBottom: 20,
    },
    notificationItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        backgroundColor: COLORS.white,
    },
    unreadItem: {
        backgroundColor: "#FAFFFE",
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F0FDF4",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textMain,
        marginBottom: 2,
    },
    unreadTitle: {
        fontWeight: "600",
    },
    body: {
        fontSize: 14,
        color: COLORS.textSub,
        lineHeight: 20,
        marginBottom: 4,
    },
    time: {
        fontSize: 12,
        color: COLORS.textSub,
    },
    actions: {
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: 50,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    deleteButton: {
        padding: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
        paddingTop: 100,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textMain,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        lineHeight: 20,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 8,
        marginTop: 8,
        marginBottom: 4,
    },
    acceptButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    acceptButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.white,
    },
    declineButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    declineButtonText: {
        fontSize: 13,
        fontWeight: "500",
        color: COLORS.textSub,
    },
});
