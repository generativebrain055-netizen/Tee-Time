/**
 * Notifications Screen (Figma 1269-817, 1269-900, 1269-1025, 1269-1140)
 * Activity & Invites tabs: Activity = user activities; Invites = invitations (accept/decline).
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    RefreshControl,
    ActivityIndicator,
    Image,
    StyleSheet,
    Alert,
} from "react-native";
import { Bell, Check, X, Inbox, Filter, ChevronDown, ChevronUp, Clock, Users } from "lucide-react-native";
import { notificationApi, friendApi, inviteApi, rosterApi, AppNotification } from "../../services/api";
import { ScreenShell, AppHeader } from "../../ui";
import { spacing, fontSize, radii, palette } from "../../ui/theme/tokens";
import { logger } from "../../utils/logger";

type TabType = 'activity' | 'invites';
type NotificationTypeFilter = 'all' | 'tee_time_invite' | 'tee_time_response' | 'friend_request' | 'roster_add' | 'spot_opened' | 'organizer_fill_warning' | 'waiver_wire';

interface CategorySection {
    title: string;
    count: number;
    items: AppNotification[];
}

export default function NotificationsScreen({ navigation }: any) {
    const [activeTab, setActiveTab] = useState<TabType>('activity');
    const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>('all');
    const [showTypeFilter, setShowTypeFilter] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Reset filter when switching tabs
    const handleTabChange = useCallback((tab: TabType) => {
        setActiveTab(tab);
        setTypeFilter('all'); // Reset filter when switching tabs
        setShowTypeFilter(false); // Close filter dropdown
    }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await notificationApi.getNotifications({ limit: 100 });
            if (response.success) {
                // Filter out notifications that have been responded to
                const filteredNotifications = response.notifications.filter(n => {
                    const notifData = n.data || {};
                    if (notifData.type === "tee_time_invite" && notifData.responded === true) return false;
                    return true;
                });
                setNotifications(filteredNotifications);
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
        } else if (dataType === "roster_add") {
            const d = item.data as Record<string, unknown> | undefined;
            if (d?.ownerId) {
                navigation?.navigate("FriendProfile", {
                    userId: d.ownerId as string,
                });
            }
        } else if (dataType === "waiver_wire") {
            navigation?.navigate("WaiverWire");
        } else if ((item.data as Record<string, unknown>)?.teeTimeId) {
            navigation?.navigate("TeeTimeDetail", {
                teeTimeId: (item.data as Record<string, unknown>).teeTimeId,
            });
        }
    }, [navigation]);

    const handleAccept = async (notificationId: string, type: string, data?: any) => {
        console.log("🔵 [NotificationsScreen] handleAccept CALLED", { notificationId, type, data });
        // Remove notification from UI immediately for better UX
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        try {
            // Check data.type instead of type (type is channel like "in_app", data.type is notification type)
            const dataType = data?.type || '';
            console.log("🔵 [NotificationsScreen] Checking notification type", { dataType, type, hasInviteId: !!data?.inviteId });
            
            if (dataType.includes('friend') || type.includes('friend')) {
                const requestId = data?.requestId || notificationId;
                console.log("🔵 [NotificationsScreen] Calling friendApi.respondToRequest", { requestId });
                await friendApi.respondToRequest(requestId, "accepted");
            } else if (dataType.includes('tee_time') || dataType.includes('invite')) {
                const inviteId = data?.inviteId;
                if (!inviteId) {
                    console.warn("🟡 [NotificationsScreen] No inviteId in notification data, cannot respond", { notificationId, data });
                    logger.warn('[NotificationsScreen] No inviteId in notification data', { notificationId, data });
                    Alert.alert(
                        "Can't respond here",
                        "Open the Invites tab to accept or decline this invitation.",
                        [{ text: "OK" }]
                    );
                    await fetchNotifications();
                    return;
                }
                await inviteApi.respondToInvite(inviteId, "accepted");
                console.log("🟢 [NotificationsScreen] inviteApi.respondToInvite completed");
                
                // Mark notification as responded in backend
                try {
                    await notificationApi.markAsResponded(notificationId);
                    console.log("🟢 [NotificationsScreen] Notification marked as responded", { notificationId });
                } catch (markError) {
                    console.warn("🟡 [NotificationsScreen] Failed to mark notification as responded", { notificationId, error: markError });
                }
            } else {
                console.warn("🟡 [NotificationsScreen] Unknown notification type, cannot handle", { notificationId, type, dataType, data });
            }
            
            // Refresh notifications list to ensure UI is in sync
            await fetchNotifications();
        } catch (error: any) {
            console.error("🔴 [NotificationsScreen] Accept error", { notificationId, type, dataType: data?.type, error: error.message, stack: error.stack });
            logger.error('[NotificationsScreen] Accept error', error);
            // Refresh notifications on error to restore state
            await fetchNotifications();
        }
    };

    const handleDecline = async (notificationId: string, type: string, data?: any) => {
        console.log("🔵 [NotificationsScreen] handleDecline CALLED", { notificationId, type, data });
        // Remove notification from UI immediately for better UX
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        try {
            // Check data.type instead of type (type is channel like "in_app", data.type is notification type)
            const dataType = data?.type || '';
            console.log("🔵 [NotificationsScreen] Checking notification type", { dataType, type, hasInviteId: !!data?.inviteId });
            
            if (dataType.includes('friend') || type.includes('friend')) {
                const requestId = data?.requestId || notificationId;
                console.log("🔵 [NotificationsScreen] Calling friendApi.respondToRequest", { requestId });
                await friendApi.respondToRequest(requestId, "declined");
            } else if (dataType.includes('tee_time') || dataType.includes('invite')) {
                const inviteId = data?.inviteId;
                if (!inviteId) {
                    console.warn("🟡 [NotificationsScreen] No inviteId in notification data, cannot respond", { notificationId, data });
                    logger.warn('[NotificationsScreen] No inviteId in notification data', { notificationId, data });
                    Alert.alert(
                        "Can't respond here",
                        "Open the Invites tab to decline this invitation.",
                        [{ text: "OK" }]
                    );
                    await fetchNotifications();
                    return;
                }
                await inviteApi.respondToInvite(inviteId, "declined");
                console.log("🟢 [NotificationsScreen] inviteApi.respondToInvite completed");
                
                // Mark notification as responded in backend
                try {
                    await notificationApi.markAsResponded(notificationId);
                    console.log("🟢 [NotificationsScreen] Notification marked as responded", { notificationId });
                } catch (markError) {
                    console.warn("🟡 [NotificationsScreen] Failed to mark notification as responded", { notificationId, error: markError });
                }
            } else {
                console.warn("🟡 [NotificationsScreen] Unknown notification type, cannot handle", { notificationId, type, dataType, data });
            }
            
            // Refresh notifications list to ensure UI is in sync
            await fetchNotifications();
        } catch (error: any) {
            console.error("🔴 [NotificationsScreen] Decline error", { notificationId, type, dataType: data?.type, error: error.message, stack: error.stack });
            logger.error('[NotificationsScreen] Decline error', error);
            // Refresh notifications on error to restore state
            await fetchNotifications();
        }
    };

    const getDataType = (n: AppNotification) => (n.data as Record<string, unknown> | undefined)?.type as string | undefined;

    // Get filter options based on current tab
    const getTypeFilterOptions = (tab: TabType): { key: NotificationTypeFilter; label: string }[] => {
        const baseOptions: { key: NotificationTypeFilter; label: string }[] = [
            { key: 'all', label: 'All Types' },
        ];

        if (tab === 'invites') {
            return [
                ...baseOptions,
                { key: 'tee_time_invite', label: 'Tee Time Invites' },
                { key: 'friend_request', label: 'Friend Requests' },
                { key: 'spot_opened', label: 'Spot Opened' },
            ];
        }
        // activity tab
        return [
            ...baseOptions,
            { key: 'tee_time_response', label: 'Invite Responses' },
            { key: 'roster_add', label: 'Roster Adds' },
            { key: 'organizer_fill_warning', label: 'Unfilled Alerts' },
            { key: 'waiver_wire', label: 'Waiver Wire' },
        ];
    };

    // Filter notifications by type
    const filterByType = (notifs: AppNotification[], filter: NotificationTypeFilter): AppNotification[] => {
        if (filter === 'all') return notifs;
        return notifs.filter(n => {
            const t = getDataType(n);
            return t === filter;
        });
    };

    // Categorize notifications by tab (Figma 1269-817: Activity vs Invites)
    const categorizeNotifications = (notifs: AppNotification[], tab: TabType): CategorySection[] => {
        let filtered: AppNotification[] = [];

        if (tab === 'invites') {
            // Invites tab (1269-900, 1269-1025, 1269-1140, 1269-977): actionable invitations
            filtered = notifs.filter(n => {
                const t = getDataType(n);
                return t === 'tee_time_invite' ||
                       t === 'friend_request' ||
                       t === 'group_invite' ||
                       t === 'spot_opened' ||
                       t === 'roster_add' ||
                       t === 'organizer_fill_warning' ||
                       t === 'tee_time_not_filled';
            });
        } else {
            // Activity tab (Figma 1269-817): user's activities (responses, group invite accepted, waiver wire)
            filtered = notifs.filter(n => {
                const t = getDataType(n);
                return t === 'tee_time_response' || t === 'group_invite_accepted' || t === 'waiver_wire';
            });
        }

        // Apply type filter if not 'all' and filter is valid for current tab
        if (typeFilter !== 'all') {
            // Validate that the filter is applicable to the current tab
            const validFilters = getTypeFilterOptions(tab).map(opt => opt.key);
            if (validFilters.includes(typeFilter)) {
                filtered = filterByType(filtered, typeFilter);
            }
            // If filter is invalid for current tab, keep filtered as is (already filtered by tab)
        }

        // Group by notification type for display
        const grouped: Record<string, AppNotification[]> = {};
        filtered.forEach(n => {
            const t = getDataType(n) || 'other';
            if (!grouped[t]) grouped[t] = [];
            grouped[t].push(n);
        });

        // Convert to sections
        const sections: CategorySection[] = Object.entries(grouped).map(([type, items]) => {
            let title = type;
            if (type === 'tee_time_invite') title = 'Tee Time Invites';
            else if (type === 'friend_request') title = 'Friend Requests';
            else if (type === 'spot_opened') title = 'Spot Opened';
            else if (type === 'roster_add') title = 'Roster Adds';
            else if (type === 'organizer_fill_warning' || type === 'tee_time_not_filled') title = 'Unfilled Slot Alerts';
            else if (type === 'tee_time_response') title = 'Invite Responses';
            else if (type === 'group_invite_accepted') title = 'Group Invitations';
            else if (type === 'waiver_wire') title = 'Waiver Wire Posts';
            else title = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return {
                title,
                count: items.length,
                items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            };
        });

        return sections.sort((a, b) => b.count - a.count);
    };

    const sections = categorizeNotifications(notifications, activeTab);

    const handleDelete = useCallback(async (item: AppNotification) => {
        try {
            await notificationApi.deleteNotification(item.id);
            setNotifications(prev => prev.filter(n => n.id !== item.id));
        } catch (error) {
            logger.error('[NotificationsScreen] Delete error', error);
            Alert.alert("Error", "Failed to delete notification");
        }
    }, []);

    const handleMarkAsUnread = useCallback(async (item: AppNotification) => {
        try {
            await notificationApi.markAsUnread(item.id);
            setNotifications(prev =>
                prev.map(n => (n.id === item.id ? { ...n, isRead: false } : n))
            );
        } catch (error) {
            logger.error('[NotificationsScreen] Mark as unread error', error);
            Alert.alert("Error", "Failed to mark notification as unread");
        }
    }, []);

    const handleMarkAsRead = useCallback(async (item: AppNotification) => {
        try {
            await notificationApi.markAsRead(item.id);
            setNotifications(prev =>
                prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n))
            );
        } catch (error) {
            logger.error('[NotificationsScreen] Mark as read error', error);
            Alert.alert("Error", "Failed to mark notification as read");
        }
    }, []);

    const handleAddBack = useCallback(async (item: AppNotification) => {
        const d = item.data as Record<string, unknown> | undefined;
        const ownerId = d?.ownerId as string | undefined;
        
        if (!ownerId) {
            Alert.alert("Error", "Unable to add this user to your roster");
            return;
        }

        try {
            const response = await rosterApi.addToRoster({ contactUserId: ownerId });
            
            if (response.success) {
                await notificationApi.markAsResponded(item.id);
                setNotifications(prev => prev.filter(n => n.id !== item.id));
                
                const ownerName = (d?.ownerName as string | undefined) || "User";
                Alert.alert(
                    "Added to Roster!",
                    `${ownerName} has been added to your roster.`,
                    [
                        { text: "View Roster", onPress: () => navigation?.navigate("Roster") },
                        { text: "OK", style: "cancel" },
                    ]
                );
            }
        } catch (error: any) {
            logger.error("[NotificationsScreen] Add back error", error);
            if (error?.message?.includes("already in roster")) {
                Alert.alert("Already Added", "This user is already in your roster.");
                await notificationApi.markAsResponded(item.id);
                setNotifications(prev => prev.filter(n => n.id !== item.id));
            } else {
                Alert.alert("Error", error.message || "Failed to add user to roster");
            }
        }
    }, [navigation]);

    const handleAcceptGroupInvite = useCallback(async (item: AppNotification) => {
        try {
            const res = await rosterApi.acceptGroupInvite(item.id);
            if (res?.success) {
                await notificationApi.markAsResponded(item.id);
                setNotifications(prev => prev.filter(n => n.id !== item.id));
                const groupName = (item.data as Record<string, unknown>)?.groupName as string | undefined;
                Alert.alert("Joined!", `You've been added to ${groupName || "the group"}.`, [{ text: "OK" }]);
            }
        } catch (error: any) {
            logger.error("[NotificationsScreen] Accept group invite error", error);
            Alert.alert("Error", error?.message || "Failed to accept group invitation");
        }
    }, []);

    const handleDeclineGroupInvite = useCallback(async (item: AppNotification) => {
        try {
            await rosterApi.declineGroupInvite(item.id);
            await notificationApi.markAsResponded(item.id);
            setNotifications(prev => prev.filter(n => n.id !== item.id));
        } catch (error: any) {
            logger.error("[NotificationsScreen] Decline group invite error", error);
            Alert.alert("Error", error?.message || "Failed to decline");
        }
    }, []);

    const getDeadlineText = (expiresAt?: string): string | null => {
        if (!expiresAt) return null;
        const deadline = new Date(expiresAt);
        const now = new Date();
        const diffMs = deadline.getTime() - now.getTime();
        if (diffMs <= 0) return "Expired";
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffHours >= 24) return `${Math.floor(diffHours / 24)}d left`;
        if (diffHours >= 1) return `${diffHours}h left`;
        return `${diffMins}m left`;
    };

    const renderCardActions = (item: AppNotification) => (
        <View style={styles.cardActions}>
            {!item.isRead && <View style={styles.unreadDot} />}
            <TouchableOpacity
                style={styles.actionIconButton}
                onPress={(e) => {
                    e.stopPropagation();
                    if (item.isRead) handleMarkAsUnread(item);
                    else handleMarkAsRead(item);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Text style={styles.actionIconText}>{item.isRead ? "Mark unread" : "Mark read"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.actionIconButton}
                onPress={(e) => {
                    e.stopPropagation();
                    Alert.alert(
                        "Delete Notification",
                        "Are you sure you want to delete this notification?",
                        [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => handleDelete(item) },
                        ]
                    );
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <X size={16} color={palette.gray500} />
            </TouchableOpacity>
        </View>
    );

    const renderNotificationItem = (item: AppNotification) => {
        const dataType = (item.data as Record<string, unknown> | undefined)?.type as string | undefined;
        const d = item.data as Record<string, unknown> | undefined;
        const isUnfilledSlotAlert = dataType === "organizer_fill_warning" || dataType === "tee_time_not_filled";
        const isFriendRequest = dataType === "friend_request" || item.type.includes("friend_request");
        const isGroupInvite = dataType === "group_invite";
        const isRosterAdd = dataType === "roster_add";
        const isTeeTimeInvite = dataType === "tee_time_invite" || dataType === "spot_opened";
        const isInvite = (dataType && (dataType.includes("invite") || dataType.includes("request"))) || item.type.includes("invite") || item.type.includes("request");
        const isAccepted = item.type.includes("accepted") || item.status === "accepted" || (d?.responded as boolean);
        const isDeclined = item.status === "declined";
        const isRosterAddActionable = isRosterAdd && d?.ownerId && !(d?.responded as boolean);
        const timeAgo = getTimeAgo(item.createdAt);

        const sender = d?.sender as { name?: string; avatar?: string; location?: string } | undefined;
        const senderName =
            (d?.senderName as string | undefined) ||
            (d?.inviterName as string | undefined) ||
            sender?.name ||
            (d?.ownerName as string | undefined) ||
            (d?.name as string | undefined) ||
            (d?.firstName != null && d?.lastName != null ? `${String(d.firstName)} ${String(d.lastName)}`.trim() : null) ||
            "Someone";
        const senderAvatar =
            (d?.senderAvatar as string | undefined) ||
            (d?.inviterAvatar as string | undefined) ||
            sender?.avatar ||
            (d?.avatar as string | undefined);
        const location = (d?.location as string | undefined) || sender?.location || "";
        const initials = senderName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

        const handleUnfilledSlotPress = () => {
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
        };

        // —— Tee time invitation card (Figma 1269-936) ——
        if (isTeeTimeInvite) {
            const courseName = (d?.courseName as string) || "Golf course";
            const teeDate = (d?.teeDate as string) || d?.date as string || "";
            const teeTime = (d?.teeTime as string) || d?.time as string || "";
            const dateTimeStr = [teeDate, teeTime].filter(Boolean).join(teeTime ? " at " : "");
            const maxPlayers = d?.maxPlayers as number | undefined;
            const deadlineText = getDeadlineText(d?.expiresAt as string | undefined);
            const isUrgent = deadlineText !== null && deadlineText !== "Expired" && deadlineText.startsWith("m");

            return (
                <TouchableOpacity
                    key={item.id}
                    style={[styles.card, styles.inviteCard, !item.isRead && styles.cardUnread]}
                    activeOpacity={0.7}
                    onPress={() => handleNotificationPress(item)}
                >
                    <View style={styles.avatarContainer}>
                        {senderAvatar ? (
                            <Image source={{ uri: senderAvatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.inviteCardCourse}>{courseName}</Text>
                        {dateTimeStr ? (
                            <View style={styles.inviteCardRow}>
                                <Clock size={14} color={palette.gray500} />
                                <Text style={styles.inviteCardMeta}>{dateTimeStr}</Text>
                            </View>
                        ) : null}
                        {maxPlayers != null && (
                            <View style={styles.inviteCardRow}>
                                <Users size={14} color={palette.gray500} />
                                <Text style={styles.inviteCardMeta}>{maxPlayers} players</Text>
                            </View>
                        )}
                        {deadlineText && (
                            <View style={[styles.deadlinePill, isUrgent && styles.deadlinePillUrgent]}>
                                <Clock size={12} color={isUrgent ? palette.red600 : palette.amber600} />
                                <Text style={[styles.deadlinePillText, isUrgent && styles.deadlinePillTextUrgent]}>{deadlineText}</Text>
                            </View>
                        )}
                        <Text style={styles.timeAgo}>{timeAgo}</Text>
                        {!isAccepted && !isDeclined && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => handleAccept(item.id, item.type, item.data)} activeOpacity={0.8}>
                                    <Text style={styles.actionButtonPrimaryText}>Accept</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => handleDecline(item.id, item.type, item.data)} activeOpacity={0.8}>
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
                    {renderCardActions(item)}
                </TouchableOpacity>
            );
        }

        // —— Group invitation card (Figma 1269-977) ——
        if (isGroupInvite) {
            const groupInviteResponded = (d?.responded as boolean) === true;
            const groupInviteDeclined = (d?.declined as boolean) === true;
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
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.groupRequestLabel}>Group request</Text>
                        <Text style={styles.cardTitle}>{senderName}</Text>
                        <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
                        <Text style={styles.timeAgo}>{timeAgo}</Text>
                        {!groupInviteResponded && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={(e) => { e.stopPropagation(); handleAcceptGroupInvite(item); }} activeOpacity={0.8}>
                                    <Text style={styles.actionButtonPrimaryText}>Accept</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={(e) => { e.stopPropagation(); handleDeclineGroupInvite(item); }} activeOpacity={0.8}>
                                    <Text style={styles.actionButtonSecondaryText}>Decline</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {groupInviteResponded && !groupInviteDeclined && (
                            <View style={styles.statusBadgeAccepted}>
                                <Check size={14} color={palette.emerald600} strokeWidth={2.5} style={{ marginRight: 6 }} />
                                <Text style={styles.statusBadgeAcceptedText}>Accepted</Text>
                            </View>
                        )}
                        {groupInviteDeclined && (
                            <View style={styles.statusBadgeDeclined}>
                                <X size={14} color={palette.red600} strokeWidth={2.5} style={{ marginRight: 6 }} />
                                <Text style={styles.statusBadgeDeclinedText}>Declined</Text>
                            </View>
                        )}
                    </View>
                    {renderCardActions(item)}
                </TouchableOpacity>
            );
        }

        // —— Group request card (roster_add: Add Back) (Figma 1269-977) ——
        if (isRosterAdd) {
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
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.groupRequestLabel}>Group request</Text>
                        <Text style={styles.cardTitle}>{senderName}</Text>
                        <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
                        <Text style={styles.timeAgo}>{timeAgo}</Text>
                        {isRosterAddActionable && (
                            <TouchableOpacity
                                style={styles.ctaButton}
                                onPress={(e) => { e.stopPropagation(); handleAddBack(item); }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.ctaButtonText}>Add Back</Text>
                            </TouchableOpacity>
                        )}
                        {d?.responded && (
                            <View style={styles.statusBadgeAccepted}>
                                <Check size={14} color={palette.emerald600} strokeWidth={2.5} style={{ marginRight: 6 }} />
                                <Text style={styles.statusBadgeAcceptedText}>Added back</Text>
                            </View>
                        )}
                    </View>
                    {renderCardActions(item)}
                </TouchableOpacity>
            );
        }

        // —— Friend request card (Figma 1269-903) ——
        if (isFriendRequest) {
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
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.cardTitle}>{senderName}</Text>
                        {location ? <Text style={styles.cardSubtext}>{location}</Text> : null}
                        <Text style={styles.timeAgo}>{timeAgo}</Text>
                        {!isAccepted && !isDeclined && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => handleAccept(item.id, item.type, item.data)} activeOpacity={0.8}>
                                    <Text style={styles.actionButtonPrimaryText}>Accept</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => handleDecline(item.id, item.type, item.data)} activeOpacity={0.8}>
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
                    {renderCardActions(item)}
                </TouchableOpacity>
            );
        }

        // —— Default card (unfilled slot, spot_opened fallback, etc.) ——
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
                            <Text style={styles.avatarInitials}>{initials}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.content}>
                    {isUnfilledSlotAlert && (
                        <>
                            <Text style={styles.unfilledLabel}>Unfilled Slot Alert</Text>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardBody}>{item.body}</Text>
                        </>
                    )}
                    {!isUnfilledSlotAlert && (
                        <Text style={styles.cardBody}>
                            <Text style={styles.cardTitleInline}>{senderName}</Text> {item.body}
                        </Text>
                    )}
                    <Text style={styles.timeAgo}>{timeAgo}</Text>
                    {isUnfilledSlotAlert && d?.teeTimeId && (
                        <TouchableOpacity style={styles.ctaButton} onPress={(e) => { e.stopPropagation(); handleUnfilledSlotPress(); }} activeOpacity={0.8}>
                            <Text style={styles.ctaButtonText}>Invite from On-Deck</Text>
                        </TouchableOpacity>
                    )}
                    {isInvite && !isAccepted && !isDeclined && !isUnfilledSlotAlert && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => handleAccept(item.id, item.type, item.data)} activeOpacity={0.8}>
                                <Text style={styles.actionButtonPrimaryText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => handleDecline(item.id, item.type, item.data)} activeOpacity={0.8}>
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
                {renderCardActions(item)}
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
            t === "tee_time_invite" || t === "friend_request" || t === "spot_opened" ||
            t === "roster_add" || t === "organizer_fill_warning" || t === "tee_time_not_filled"
        );
    }).length;

    const activityCount = notifications.filter(n => {
        const t = getDataType(n);
        return t === "tee_time_response" || t === "waiver_wire";
    }).length;

    const typeFilterOptions = getTypeFilterOptions(activeTab);

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

            {/* Activity & Invites tabs (Figma 1269-817) */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "activity" && styles.tabActive]}
                    onPress={() => handleTabChange("activity")}
                    activeOpacity={0.7}
                >
                    <View style={styles.tabLabelRow}>
                        <Bell size={16} color={activeTab === "activity" ? palette.green600 : palette.gray500} style={{ marginRight: 4 }} />
                        <Text style={[styles.tabText, activeTab === "activity" && styles.tabTextActive]}>Activity</Text>
                        {activityCount > 0 && (
                            <View style={[styles.tabBadge, { backgroundColor: palette.gray400 }]}>
                                <Text style={styles.tabBadgeText}>
                                    {activityCount > 99 ? "99+" : activityCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "invites" && styles.tabActive]}
                    onPress={() => handleTabChange("invites")}
                    activeOpacity={0.7}
                >
                    <View style={styles.tabLabelRow}>
                        <Inbox size={16} color={activeTab === "invites" ? palette.green600 : palette.gray500} style={{ marginRight: 4 }} />
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

            {/* Filter by Type */}
            {showTypeFilter && (
                <TouchableWithoutFeedback onPress={() => setShowTypeFilter(false)}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
            )}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowTypeFilter(!showTypeFilter)}
                    activeOpacity={0.7}
                >
                    <Filter size={16} color={palette.gray600} />
                    <Text style={styles.filterButtonText}>
                        {typeFilterOptions.find(opt => opt.key === typeFilter)?.label || 'All Types'}
                    </Text>
                    {showTypeFilter ? (
                        <ChevronUp size={16} color={palette.gray600} />
                    ) : (
                        <ChevronDown size={16} color={palette.gray600} />
                    )}
                </TouchableOpacity>
                {showTypeFilter && (
                    <View style={styles.filterDropdown}>
                        {typeFilterOptions.map(option => (
                            <TouchableOpacity
                                key={option.key}
                                style={[
                                    styles.filterOption,
                                    typeFilter === option.key && styles.filterOptionActive
                                ]}
                                onPress={() => {
                                    setTypeFilter(option.key);
                                    setShowTypeFilter(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.filterOptionText,
                                    typeFilter === option.key && styles.filterOptionTextActive
                                ]}>
                                    {option.label}
                                </Text>
                                {typeFilter === option.key && (
                                    <Check size={16} color={palette.green600} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
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
                            {activeTab === "activity" && "No activity yet."}
                            {activeTab === "invites" && "You have no invites."}
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
    inviteCard: {
        alignItems: "flex-start",
    },
    cardUnread: {
        backgroundColor: palette.green50,
    },
    inviteCardCourse: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 15,
        color: palette.gray900,
        marginTop: spacing.xs,
    },
    inviteCardRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.xs,
        gap: spacing.xs,
    },
    inviteCardMeta: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.sm,
        color: palette.gray600,
    },
    deadlinePill: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        marginTop: spacing.sm,
        paddingVertical: 6,
        paddingHorizontal: spacing.sm + 2,
        borderRadius: radii.full,
        backgroundColor: palette.amber50,
        borderWidth: 1,
        borderColor: palette.amber100,
        gap: 6,
    },
    deadlinePillUrgent: {
        backgroundColor: palette.red50,
        borderColor: palette.red100,
    },
    deadlinePillText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.xs,
        color: palette.amber700,
    },
    deadlinePillTextUrgent: {
        color: palette.red600,
    },
    groupRequestLabel: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.xs,
        color: palette.gray500,
        textTransform: "uppercase",
        letterSpacing: 0.5,
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
    filterContainer: {
        position: "relative",
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: palette.gray200,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        zIndex: 999,
    },
    filterButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        backgroundColor: palette.gray50,
        borderRadius: radii.sm,
        alignSelf: "flex-start",
    },
    filterButtonText: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.sm,
        color: palette.gray700,
    },
    filterDropdown: {
        position: "absolute",
        top: "100%",
        left: spacing.lg,
        right: spacing.lg,
        marginTop: spacing.xs,
        backgroundColor: "#FFFFFF",
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: palette.gray200,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1000,
        maxHeight: 300,
    },
    filterOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: palette.gray100,
    },
    filterOptionActive: {
        backgroundColor: palette.green50,
    },
    filterOptionText: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.sm,
        color: palette.gray700,
    },
    filterOptionTextActive: {
        fontFamily: "Inter_600SemiBold",
        color: palette.green600,
    },
    cardActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginLeft: spacing.sm,
    },
    actionIconButton: {
        padding: spacing.xs,
    },
    actionIconText: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.xs,
        color: palette.gray500,
    },
});
