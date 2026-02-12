/**
 * Notifications Screen (Figma 1269-*, 1330-*, 1343-*, 1349-*)
 * Activity & Invites tabs with categorized notifications; token-based layout.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Image,
    StyleSheet,
} from "react-native";
import { Bell, Check, X } from "lucide-react-native";
import { notificationApi, friendApi, inviteApi, AppNotification } from "../../services/api";
import { ScreenShell, AppHeader } from "../../ui";
import { spacing, fontSize, radii, palette } from "../../ui/theme/tokens";
import { logger } from "../../utils/logger";

type TabType = 'activity' | 'invites';

interface CategorySection {
    title: string;
    count: number;
    items: AppNotification[];
}

export default function NotificationsScreen({ navigation }: any) {
    const [activeTab, setActiveTab] = useState<TabType>('activity');
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await notificationApi.getNotifications({ limit: 100 });
            if (response.success) {
                setNotifications(response.notifications);
            }
        } catch (error) {
            logger.error('[NotificationsScreen] Error loading notifications', error);
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

    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (e) {
            logger.error("[NotificationsScreen] Mark all read error", e);
        }
    }, []);

    const handleNotificationPress = useCallback(async (item: AppNotification) => {
        if (!item.isRead) {
            try {
                await notificationApi.markAsRead(item.id);
                setNotifications(prev =>
                    prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n)),
                );
            } catch {
                // ignore
            }
        }
        const dataType = (item.data as Record<string, unknown> | undefined)?.type;
        if (dataType === "organizer_fill_warning" || dataType === "tee_time_not_filled") {
            const d = item.data as Record<string, unknown> | undefined;
            if (d?.teeTimeId) {
                navigation?.navigate("SelectOnDeck", {
                    teeTimeId: d.teeTimeId,
                    spotsRemaining: (d.spotsRemaining as number) ?? 1,
                    courseName: d.courseName as string | undefined,
                    teeDate: d.teeDate as string | undefined,
                    teeTime: d.teeTime as string | undefined,
                    unfilledSlotAlert: true,
                });
            }
        } else if ((item.data as Record<string, unknown>)?.teeTimeId) {
            navigation?.navigate("TeeTimeDetail", {
                teeTimeId: (item.data as Record<string, unknown>).teeTimeId,
            });
        }
    }, [navigation]);

    const handleAccept = async (notificationId: string, type: string, data?: any) => {
        try {
            if (type.includes('friend')) {
                const requestId = data?.requestId || notificationId;
                await friendApi.respondToRequest(requestId, "accepted");
            } else if (type.includes('tee_time')) {
                await inviteApi.respondToInvite(notificationId, "accepted");
            }
            // Update local state immediately to reflect change
            setNotifications(prev => prev.map(n => 
                n.id === notificationId 
                    ? { ...n, status: 'accepted', data: { ...n.data, responded: true } }
                    : n
            ));
        } catch (error) {
            logger.error('[NotificationsScreen] Accept error', error);
        }
    };

    const handleDecline = async (notificationId: string, type: string, data?: any) => {
        try {
            if (type.includes('friend')) {
                const requestId = data?.requestId || notificationId;
                await friendApi.respondToRequest(requestId, "declined");
            } else if (type.includes('tee_time')) {
                await inviteApi.respondToInvite(notificationId, "declined");
            }
            // Update local state immediately to reflect change
            setNotifications(prev => prev.map(n => 
                n.id === notificationId 
                    ? { ...n, status: 'declined', data: { ...n.data, responded: true } }
                    : n
            ));
        } catch (error) {
            logger.error('[NotificationsScreen] Decline error', error);
        }
    };

    const getDataType = (n: AppNotification) => (n.data as Record<string, unknown> | undefined)?.type as string | undefined;

    const categorizeNotifications = (notifs: AppNotification[], tab: TabType): CategorySection[] => {
        if (tab === 'activity') {
            return [
                {
                    title: 'Recent activity',
                    count: notifs.filter(n => {
                        const t = getDataType(n) ?? n.type;
                        return t.includes('confirmed') || t.includes('cancelled') || t.includes('completed');
                    }).length,
                    items: notifs.filter(n => {
                        const t = getDataType(n) ?? n.type;
                        return t.includes('confirmed') || t.includes('cancelled') || t.includes('completed');
                    }),
                },
            ].filter(section => section.count > 0);
        } else {
            const unfilledSlot = (n: AppNotification) => {
                const t = getDataType(n);
                return t === 'organizer_fill_warning' || t === 'tee_time_not_filled';
            };
            return [
                {
                    title: 'Unfilled Slot Alert',
                    count: notifs.filter(unfilledSlot).length,
                    items: notifs.filter(unfilledSlot),
                },
                {
                    title: 'Tee time invites',
                    count: notifs.filter(n => getDataType(n) === 'tee_time_invite' || n.type.includes('tee_time_invite')).length,
                    items: notifs.filter(n => getDataType(n) === 'tee_time_invite' || n.type.includes('tee_time_invite')),
                },
                {
                    title: 'Group requests',
                    count: notifs.filter(n => getDataType(n) === 'group_request' || n.type.includes('group_request')).length,
                    items: notifs.filter(n => getDataType(n) === 'group_request' || n.type.includes('group_request')),
                },
                {
                    title: 'Friend requests',
                    count: notifs.filter(n => getDataType(n) === 'friend_request' || n.type.includes('friend_request')).length,
                    items: notifs.filter(n => getDataType(n) === 'friend_request' || n.type.includes('friend_request')),
                },
            ].filter(section => section.count > 0);
        }
    };

    const sections = categorizeNotifications(notifications, activeTab);

    const renderNotificationItem = (item: AppNotification) => {
        const dataType = (item.data as Record<string, unknown> | undefined)?.type as string | undefined;
        const isUnfilledSlotAlert = dataType === 'organizer_fill_warning' || dataType === 'tee_time_not_filled';
        const isFriendRequest = dataType === 'friend_request' || item.type.includes('friend_request');
        const isInvite = (dataType && (dataType.includes('invite') || dataType.includes('request'))) || item.type.includes('invite') || item.type.includes('request');
        const isAccepted = item.type.includes('accepted') || item.status === 'accepted' || (item.data as Record<string, unknown> | undefined)?.responded;
        const isDeclined = item.status === 'declined';
        const timeAgo = getTimeAgo(item.createdAt);

        const handleUnfilledSlotPress = () => {
            const d = item.data as Record<string, unknown> | undefined;
            if (d?.teeTimeId) {
                navigation?.navigate('SelectOnDeck', {
                    teeTimeId: d.teeTimeId,
                    spotsRemaining: (d.spotsRemaining as number) ?? 1,
                    courseName: d.courseName as string | undefined,
                    teeDate: d.teeDate as string | undefined,
                    teeTime: d.teeTime as string | undefined,
                    unfilledSlotAlert: true,
                });
            }
        };

        // Extract user info from different possible data structures
        const d = item.data as Record<string, unknown> | undefined;
        const sender = d?.sender as { name?: string; avatar?: string; location?: string } | undefined;
        const senderName =
            (d?.senderName as string | undefined) ||
            sender?.name ||
            (d?.name as string | undefined) ||
            (d?.firstName != null && d?.lastName != null
                ? `${String(d.firstName)} ${String(d.lastName)}`.trim()
                : null) ||
            "Someone";

        const senderAvatar =
            (d?.senderAvatar as string | undefined) ||
            sender?.avatar ||
            (d?.avatar as string | undefined);

        const location = (d?.location as string | undefined) || sender?.location || "";

        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.card, !item.isRead && styles.cardUnread]}
                activeOpacity={0.7}
                onPress={() => handleNotificationPress(item)}
            >
                <View style={styles.avatarContainer}>
                    {senderAvatar ? (
                        <Image source={{ uri: senderAvatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitials}>
                                {senderName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.content}>
                    {isUnfilledSlotAlert ? (
                        <>
                            <Text style={styles.unfilledLabel}>Unfilled Slot Alert</Text>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardBody}>{item.body}</Text>
                        </>
                    ) : isFriendRequest ? (
                        <>
                            <Text style={styles.cardTitle}>{senderName}</Text>
                            {location ? <Text style={styles.cardSubtext}>{location}</Text> : null}
                        </>
                    ) : (
                        <Text style={styles.cardBody}>
                            <Text style={styles.cardTitleInline}>{senderName}</Text> {item.body}
                        </Text>
                    )}

                    <Text style={styles.timeAgo}>{timeAgo}</Text>

                    {isUnfilledSlotAlert && (item.data as Record<string, unknown>)?.teeTimeId && (
                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleUnfilledSlotPress();
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.ctaButtonText}>Invite from On-Deck</Text>
                        </TouchableOpacity>
                    )}

                    {isInvite && !isAccepted && !isDeclined && !isUnfilledSlotAlert && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonPrimary]}
                                onPress={() => handleAccept(item.id, item.type, item.data)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.actionButtonPrimaryText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonSecondary]}
                                onPress={() => handleDecline(item.id, item.type, item.data)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.actionButtonSecondaryText}>Decline</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isAccepted && (
                        <View style={styles.statusBadgeAccepted}>
                            <Check size={14} color={palette.emerald600} strokeWidth={2.5} style={{ marginRight: 6 }} />
                            <Text style={styles.statusBadgeAcceptedText}>Accepted</Text>
                        </View>
                    )}

                    {isDeclined && (
                        <View style={styles.statusBadgeDeclined}>
                            <X size={14} color={palette.red600} strokeWidth={2.5} style={{ marginRight: 6 }} />
                            <Text style={styles.statusBadgeDeclinedText}>Declined</Text>
                        </View>
                    )}
                </View>

                {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const hasUnread = notifications.some(n => !n.isRead);

    const invitesUnreadCount = notifications.filter(n => {
        const t = getDataType(n);
        return !n.isRead && (
            t === "organizer_fill_warning" || t === "tee_time_not_filled" ||
            t === "tee_time_invite" || t === "group_request" || t === "friend_request"
        );
    }).length;

    if (loading) {
        return (
            <ScreenShell>
                <AppHeader title="Notifications" onBack={() => navigation?.goBack()} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={palette.green500} />
                </View>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell>
            <View style={styles.headerRow}>
                <AppHeader title="Notifications" onBack={() => navigation?.goBack()} />
                {hasUnread && (
                    <TouchableOpacity style={styles.markAllReadButton} onPress={handleMarkAllAsRead} activeOpacity={0.7}>
                        <Text style={styles.markAllReadText}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "activity" && styles.tabActive]}
                    onPress={() => setActiveTab("activity")}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, activeTab === "activity" && styles.tabTextActive]}>Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "invites" && styles.tabActive]}
                    onPress={() => setActiveTab("invites")}
                    activeOpacity={0.7}
                >
                    <View style={styles.tabLabelRow}>
                        <Text style={[styles.tabText, activeTab === "invites" && styles.tabTextActive]}>Invites</Text>
                        {invitesUnreadCount > 0 && (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>
                                    {invitesUnreadCount > 99 ? "99+" : invitesUnreadCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.green500} />
                }
            >
                {sections.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Bell size={32} color={palette.gray400} strokeWidth={1.5} />
                        </View>
                        <Text style={styles.emptyTitle}>All caught up</Text>
                        <Text style={styles.emptySubtitle}>
                            You have no new {activeTab === "activity" ? "activity" : "invites"}. We'll let you know when something happens!
                        </Text>
                    </View>
                ) : (
                    sections.map((section, idx) => (
                        <View key={idx}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    {section.title} ({section.count})
                                </Text>
                            </View>
                            {section.items.map(item => renderNotificationItem(item))}
                        </View>
                    ))
                )}
                <View style={styles.bottomSpacer} />
            </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        position: "relative",
    },
    markAllReadButton: {
        position: "absolute",
        right: spacing.lg,
        top: 12,
        zIndex: 10,
    },
    markAllReadText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.xs,
        color: palette.green600,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },
    tabBar: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: palette.gray200,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md + 2,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: palette.green600,
    },
    tabLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    tabText: {
        fontFamily: "Inter_500Medium",
        fontSize: 15,
        color: palette.gray500,
    },
    tabTextActive: {
        fontFamily: "Inter_600SemiBold",
        color: palette.gray900,
    },
    tabBadge: {
        backgroundColor: palette.green500,
        borderRadius: radii.full,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    tabBadgeText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize["2xs"],
        color: "#FFFFFF",
    },
    scrollView: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    emptyContainer: {
        paddingTop: spacing["7xl"],
        alignItems: "center",
        paddingHorizontal: spacing["3xl"],
    },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: palette.gray100,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.lg,
        color: palette.gray900,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.sm,
        color: palette.gray500,
        textAlign: "center",
    },
    sectionHeader: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        backgroundColor: palette.gray50,
        borderBottomWidth: 1,
        borderBottomColor: palette.gray200,
    },
    sectionTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.xs,
        color: palette.gray500,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    card: {
        flexDirection: "row",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 2,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: palette.gray100,
    },
    cardUnread: {
        backgroundColor: palette.green50,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: palette.gray200,
        marginRight: spacing.md,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    avatar: {
        width: 48,
        height: 48,
    },
    avatarPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitials: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.base,
        color: palette.gray500,
    },
    content: {
        flex: 1,
    },
    unfilledLabel: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.xs,
        color: palette.gray500,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    cardTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 15,
        color: palette.gray900,
        marginTop: spacing.xs,
    },
    cardTitleInline: {
        fontFamily: "Inter_600SemiBold",
    },
    cardBody: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.sm,
        color: palette.gray900,
        lineHeight: 20,
        marginTop: spacing.xs,
    },
    cardSubtext: {
        fontFamily: "Inter_400Regular",
        fontSize: 13,
        color: palette.gray500,
        marginTop: spacing.xs,
    },
    timeAgo: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.xs,
        color: palette.gray500,
        marginTop: spacing.xs,
    },
    ctaButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.green600,
        paddingVertical: spacing.sm + 1,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.sm,
        marginTop: spacing.sm + 2,
        alignSelf: "flex-start",
    },
    ctaButtonText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.sm,
        color: "#FFFFFF",
    },
    actionRow: {
        flexDirection: "row",
        gap: spacing.sm,
        marginTop: spacing.sm + 2,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.sm + 1,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.sm,
    },
    actionButtonPrimary: {
        backgroundColor: palette.green600,
    },
    actionButtonPrimaryText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.sm,
        color: "#FFFFFF",
    },
    actionButtonSecondary: {
        flex: 0.6,
        backgroundColor: palette.gray100,
    },
    actionButtonSecondaryText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.sm,
        color: palette.gray500,
    },
    statusBadgeAccepted: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.sm,
        paddingVertical: 6,
        paddingHorizontal: spacing.md,
        backgroundColor: palette.green100,
        borderRadius: radii.sm,
        alignSelf: "flex-start",
    },
    statusBadgeAcceptedText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 13,
        color: palette.emerald600,
    },
    statusBadgeDeclined: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.sm,
        paddingVertical: 6,
        paddingHorizontal: spacing.md,
        backgroundColor: palette.red100,
        borderRadius: radii.sm,
        alignSelf: "flex-start",
    },
    statusBadgeDeclinedText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 13,
        color: palette.red600,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: palette.green600,
        marginLeft: spacing.sm,
        marginTop: 6,
    },
    bottomSpacer: {
        height: spacing["4xl"],
    },
});
