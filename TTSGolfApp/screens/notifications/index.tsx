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
import { Bell, Users, Calendar, CheckCircle, Trash2 } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { Header } from "../../components/common";
import { notificationApi, AppNotification } from "../../services/api";

interface NotificationsScreenProps {
    navigation: any;
}

// Notification item component
const NotificationItem = memo(({
    item,
    onPress,
    onDelete
}: {
    item: AppNotification;
    onPress: (item: AppNotification) => void;
    onDelete: (id: string) => void;
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
                return <Calendar size={20} color={COLORS.primary} />;
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

            case 'roster_add':
                // Navigate to the person who added you
                if (item.data?.ownerId) {
                    navigation?.navigate("FriendProfile", { userId: item.data.ownerId });
                }
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
        />
    ), [handleNotificationPress, handleDelete]);

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
});
