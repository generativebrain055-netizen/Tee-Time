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
import { Bell, Check, X, Inbox, Filter, ChevronDown, ChevronUp, Clock, Users, CheckCircle, Mail, MapPin, MessageCircle } from "lucide-react-native";
import {
    notificationApi,
    friendApi,
    inviteApi,
    rosterApi,
    AppNotification,
    isDuplicateRosterContactApiError,
} from "../../services/api";
import { ScreenShell, AppHeader } from "../../ui";
import { useToast } from "../../ui/feedback";
import { useUnreadConversations } from "../../components/MessageToastListener";
import { useUser } from "../../contexts/UserContext";
import { spacing, fontSize, radii, palette } from "../../ui/theme/tokens";
import { logger } from "../../utils/logger";
import { formatRemainingClock, formatDateMMDDYYYY } from "../../utils/formatting";
import { navigateFromNotificationData } from "../../utils/navigateFromNotificationData";

/** e.g. "04/12/2026 • 1:30 PM" for tee / spot-opened invites */
function formatTeeInviteWhen(dateVal: unknown, timeVal: unknown): string {
    const dateStr = dateVal != null ? String(dateVal) : "";
    const timeStr = timeVal != null ? String(timeVal) : "";
    let datePart = "";
    if (dateStr) {
        datePart = formatDateMMDDYYYY(dateStr);
    }
    let timePart = "";
    if (timeStr) {
        if (/am|pm/i.test(timeStr)) {
            timePart = timeStr.trim();
        } else {
            const parts = timeStr.split(":");
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1] || "0", 10);
            if (!Number.isNaN(h)) {
                const period = h >= 12 ? "PM" : "AM";
                const h12 = h % 12 || 12;
                timePart = `${h12}:${String(m).padStart(2, "0")} ${period}`;
            } else {
                timePart = timeStr;
            }
        }
    }
    if (datePart && timePart) return `${datePart} • ${timePart}`;
    if (datePart) return datePart;
    if (timePart) return timePart;
    return "";
}

function isExpiredTeeTimeInviteNotification(notification: AppNotification, nowMs: number): boolean {
    const data = (notification.data || {}) as Record<string, unknown>;
    const type = String(data.type || "");
    if (type !== "tee_time_invite") return false;
    const expiresRaw = data.expiresAt ?? data.expires_at;
    if (!expiresRaw) return false;
    const expiresMs = new Date(String(expiresRaw)).getTime();
    if (Number.isNaN(expiresMs)) return false;
    return expiresMs <= nowMs;
}

function initialsFromGroupName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function isRemoteImageUrl(url: string): boolean {
    return /^https?:\/\//i.test(String(url).trim());
}

/** Use at most one image URL for group badge; reject JSON arrays / multiple URLs (member avatar collages). */
function pickSingleGroupIconUrl(raw: string): string {
    const s = raw.trim();
    if (!s) return "";
    if (s.startsWith("[") || s.startsWith("{")) {
        try {
            const parsed = JSON.parse(s) as unknown;
            if (Array.isArray(parsed)) {
                if (parsed.length === 1 && typeof parsed[0] === "string") {
                    const one = String(parsed[0]).trim();
                    return isRemoteImageUrl(one) ? one : "";
                }
                return "";
            }
        } catch {
            return "";
        }
    }
    const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
    const urlParts = parts.filter((p) => isRemoteImageUrl(p));
    if (urlParts.length > 1) return "";
    if (urlParts.length === 1) return urlParts[0];
    return s;
}

function safeGroupColor(hex: unknown, fallback: string): string {
    if (typeof hex === "string" && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim())) {
        return hex.trim();
    }
    return fallback;
}

type TabType = 'activity' | 'invites';
type NotificationTypeFilter =
    | 'all'
    | 'tee_time_invite'
    | 'tee_time_response'
    | 'friend_request'
    | 'friend_accepted'
    | 'spot_opened'
    | 'organizer_fill_warning'
    | 'waiver_wire'
    | 'group_invite'
    | 'player_cancelled'
    | 'group_updated'
    | 'group_deleted';

interface CategorySection {
    title: string;
    count: number;
    items: AppNotification[];
    /** Invites tab: fixed section layout (tee / group / friend bundle) */
    inviteKind?: "tee" | "group" | "friend";
}

export default function NotificationsScreen({ navigation }: any) {
    const { fetchProfile } = useUser();
    const toast = useToast();
    const { unreadConversations } = useUnreadConversations();
    const [activeTab, setActiveTab] = useState<TabType>('activity');
    const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>('all');
    const [showTypeFilter, setShowTypeFilter] = useState(false);
    const [nowTick, setNowTick] = useState(Date.now());
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
                const nowMs = Date.now();
                // Filter out notifications that have been responded to
                const filteredNotifications = response.notifications.filter(n => {
                    const notifData = n.data || {};
                    if (notifData.type === "tee_time_invite" && notifData.responded === true) return false;
                    if (notifData.type === "friend_request" && notifData.responded === true) return false;
                    if (isExpiredTeeTimeInviteNotification(n, nowMs)) return false;
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
        const d = item.data as Record<string, unknown> | undefined;
        if (navigation?.navigate) {
            navigateFromNotificationData(navigation.navigate.bind(navigation), d);
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
                const requestId = data?.requestId;
                if (!requestId) {
                    logger.warn("[NotificationsScreen] Accept: missing requestId in friend notification", { notificationId, data });
                    Alert.alert("Can't respond", "This friend request is missing data. Try again from your pending requests.", [{ text: "OK" }]);
                    await fetchNotifications();
                    return;
                }
                await friendApi.respondToRequest(String(requestId), "accepted");
                try {
                    await notificationApi.markAsResponded(notificationId);
                } catch (markError) {
                    console.warn("🟡 [NotificationsScreen] Failed to mark friend request notification as responded", { notificationId, error: markError });
                }
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
                const result = await inviteApi.respondToInvite(inviteId, "accepted");
                console.log("🟢 [NotificationsScreen] inviteApi.respondToInvite completed");
                if (!result.success) {
                    const r = result as { message?: string; code?: string };
                    Alert.alert(
                        r.code === "TEE_TIME_FULL" ? "Tee time full" : "Could not accept",
                        r.message || "Something went wrong. Try again from the Invites tab.",
                        [{ text: "OK" }],
                    );
                    await fetchNotifications();
                    return;
                }
                const delta = result.socialRateDelta;
                const newScore = result.newSocialRate;
                if (delta != null && delta !== 0 && typeof fetchProfile === "function") {
                    await fetchProfile(true);
                    const sign = delta > 0 ? "+" : "";
                    const msg = newScore != null ? `${sign}${delta} Social Rate (${newScore})` : `${sign}${delta} Social Rate`;
                    toast?.show({ message: msg, type: delta > 0 ? "success" : "info" });
                }
                const resOk = result as { message?: string; status?: string };
                if (resOk.status === "waitlist" && resOk.message) {
                    Alert.alert("Waitlist", resOk.message, [{ text: "OK" }]);
                }
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
                const requestId = data?.requestId;
                if (!requestId) {
                    logger.warn("[NotificationsScreen] Decline: missing requestId in friend notification", { notificationId, data });
                    Alert.alert("Can't respond", "This friend request is missing data. Try again from your pending requests.", [{ text: "OK" }]);
                    await fetchNotifications();
                    return;
                }
                await friendApi.respondToRequest(String(requestId), "declined");
                try {
                    await notificationApi.markAsResponded(notificationId);
                } catch (markError) {
                    console.warn("🟡 [NotificationsScreen] Failed to mark friend request notification as responded", { notificationId, error: markError });
                }
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
                const result = await inviteApi.respondToInvite(inviteId, "declined");
                console.log("🟢 [NotificationsScreen] inviteApi.respondToInvite completed");
                const delta = result.socialRateDelta;
                const newScore = result.newSocialRate;
                if (delta != null && delta !== 0 && typeof fetchProfile === "function") {
                    await fetchProfile(true);
                    const sign = delta > 0 ? "+" : "";
                    const msg = newScore != null ? `${sign}${delta} Social Rate (${newScore})` : `${sign}${delta} Social Rate`;
                    toast?.show({ message: msg, type: delta > 0 ? "success" : "info" });
                }
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
                { key: 'spot_opened', label: 'Spot Opened' },
                { key: 'group_invite', label: 'Group Invites' },
                { key: 'friend_request', label: 'Friend Requests' },
            ];
        }
        // activity tab
        return [
            ...baseOptions,
            { key: 'tee_time_response', label: 'Invite Responses' },
            { key: 'player_cancelled', label: 'Player Cancelled' },
            { key: 'group_updated', label: 'Group Updated' },
            { key: 'group_deleted', label: 'Group Deleted' },
            { key: 'organizer_fill_warning', label: 'Unfilled Alerts' },
            { key: 'waiver_wire', label: 'Waiver Wire' },
            { key: 'friend_accepted', label: 'Friend Accepted' },
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
        const sortByCreated = (arr: AppNotification[]) =>
            [...arr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (tab === "invites") {
            let tee = notifs.filter(n => {
                const t = getDataType(n);
                return t === "tee_time_invite" || t === "spot_opened";
            });
            let group = notifs.filter(n => getDataType(n) === "group_invite");
            let friend = notifs.filter(n => getDataType(n) === "friend_request");

            if (typeFilter !== "all") {
                const validFilters = getTypeFilterOptions(tab).map(opt => opt.key);
                if (validFilters.includes(typeFilter)) {
                    if (typeFilter === "tee_time_invite") {
                        tee = tee.filter(n => getDataType(n) === "tee_time_invite");
                        group = [];
                        friend = [];
                    } else if (typeFilter === "spot_opened") {
                        tee = tee.filter(n => getDataType(n) === "spot_opened");
                        group = [];
                        friend = [];
                    } else if (typeFilter === "group_invite") {
                        tee = [];
                        friend = [];
                    } else if (typeFilter === "friend_request") {
                        tee = [];
                        group = [];
                    }
                }
            }

            const sections: CategorySection[] = [];
            if (tee.length > 0) {
                sections.push({
                    title: "Tee time invites",
                    count: tee.length,
                    items: sortByCreated(tee),
                    inviteKind: "tee",
                });
            }
            if (group.length > 0) {
                sections.push({
                    title: "Group requests",
                    count: group.length,
                    items: sortByCreated(group),
                    inviteKind: "group",
                });
            }
            if (friend.length > 0) {
                sections.push({
                    title: "Friend requests",
                    count: friend.length,
                    items: sortByCreated(friend),
                    inviteKind: "friend",
                });
            }
            return sections;
        }

        // Activity tab
        let filtered = notifs.filter(n => {
            const t = getDataType(n);
            return (
                t === "tee_time_response" ||
                t === "group_invite_accepted" ||
                t === "waiver_wire" ||
                t === "player_cancelled" ||
                t === "group_updated" ||
                t === "group_deleted" ||
                t === "roster_removed" ||
                t === "on_deck_added" ||
                t === "on_deck_removed" ||
                t === "friend_accepted" ||
                t === "check_in_reminder" ||
                t === "no_show" ||
                t === "roster_exhausted" ||
                t === "fcfs_deadline" ||
                t === "roster_add" ||
                t === "organizer_fill_warning" ||
                t === "tee_time_not_filled" ||
                t === "organizer_invite_more"
            );
        });

        if (typeFilter !== "all") {
            const validFilters = getTypeFilterOptions(tab).map(opt => opt.key);
            if (validFilters.includes(typeFilter)) {
                filtered = filterByType(filtered, typeFilter);
            }
        }

        const grouped: Record<string, AppNotification[]> = {};
        filtered.forEach(n => {
            const t = getDataType(n) || "other";
            if (!grouped[t]) grouped[t] = [];
            grouped[t].push(n);
        });

        const sections: CategorySection[] = Object.entries(grouped).map(([type, items]) => {
            let title = type;
            if (type === "tee_time_invite") title = "Tee Time Invites";
            else if (type === "friend_request") title = "Friend Requests";
            else if (type === "spot_opened") title = "Spot Opened";
            else if (type === "roster_add") title = "Roster Adds";
            else if (type === "organizer_fill_warning" || type === "tee_time_not_filled" || type === "organizer_invite_more")
                title = "Unfilled Slot Alerts";
            else if (type === "tee_time_response") title = "Invite Responses";
            else if (type === "group_invite_accepted") title = "Group Invitations";
            else if (type === "waiver_wire") title = "Waiver Wire Posts";
            else if (type === "player_cancelled") title = "Player Cancelled";
            else if (type === "group_updated") title = "Group Updated";
            else if (type === "group_deleted") title = "Group Deleted";
            else if (type === "roster_removed") title = "Removed from Roster";
            else if (type === "on_deck_added") title = "On-Deck availability";
            else if (type === "on_deck_removed") title = "On-Deck removed";
            else if (type === "friend_accepted") title = "Friend Requests Accepted";
            else if (type === "check_in_reminder") title = "Check-In Reminders";
            else if (type === "no_show") title = "No-Show";
            else if (type === "roster_exhausted") title = "Roster Exhausted";
            else if (type === "fcfs_deadline") title = "FCFS Deadlines";
            else title = type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

            return {
                title,
                count: items.length,
                items: sortByCreated(items),
            };
        });

        return sections.sort((a, b) => b.count - a.count);
    };

    const sections = categorizeNotifications(notifications, activeTab);
    const visibleNotifications = sections.flatMap((s) => s.items);
    const hasUnreadInView = visibleNotifications.some((n) => !n.isRead);
    const hasReadInView = visibleNotifications.some((n) => n.isRead);

    const handleDelete = useCallback(async (item: AppNotification) => {
        try {
            await notificationApi.deleteNotification(item.id);
            setNotifications(prev => prev.filter(n => n.id !== item.id));
        } catch (error) {
            logger.error('[NotificationsScreen] Delete error', error);
            Alert.alert("Error", "Failed to delete notification");
        }
    }, []);

    const handleDeleteAllRead = useCallback(() => {
        const readCount = notifications.filter(n => n.isRead).length;
        if (readCount === 0) return;
        Alert.alert(
            "Delete read notifications",
            `Delete ${readCount} read notification${readCount === 1 ? "" : "s"}? This can't be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await notificationApi.deleteAllRead();
                            if (res.success) {
                                setNotifications(prev => prev.filter(n => !n.isRead));
                            }
                        } catch (error) {
                            logger.error("[NotificationsScreen] Delete all read error", error);
                            Alert.alert("Error", "Failed to delete read notifications");
                        }
                    },
                },
            ]
        );
    }, [notifications]);

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
        } catch (error: unknown) {
            if (isDuplicateRosterContactApiError(error)) {
                logger.debug("[NotificationsScreen] Add back: already on roster, clearing notification");
                try {
                    await notificationApi.markAsResponded(item.id);
                    setNotifications(prev => prev.filter(n => n.id !== item.id));
                } catch (e) {
                    logger.warn("[NotificationsScreen] Mark responded after duplicate roster", e);
                }
                return;
            }
            logger.error("[NotificationsScreen] Add back error", error);
            const msg =
                error instanceof Error ? error.message : "Failed to add user to roster";
            Alert.alert("Error", msg);
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

    useEffect(() => {
        const interval = setInterval(() => setNowTick(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Keep invite cards clean while the screen is open by dropping newly-expired tee time invites.
    useEffect(() => {
        setNotifications((prev) => prev.filter((n) => !isExpiredTeeTimeInviteNotification(n, nowTick)));
    }, [nowTick]);

    const getDeadlineText = (expiresAt?: string): string | null => {
        if (!expiresAt) return null;
        const deadline = new Date(expiresAt);
        const diffMs = deadline.getTime() - nowTick;
        if (diffMs <= 0) return "Expired";
        return formatRemainingClock(diffMs, true);
    };

    const showReadUnreadMenu = useCallback((item: AppNotification) => {
        const readUnreadButton = item.isRead
            ? { text: "Mark as unread", onPress: () => handleMarkAsUnread(item) }
            : { text: "Mark as read", onPress: () => handleMarkAsRead(item) };
        Alert.alert(
            "Notification",
            undefined,
            [
                { text: "Cancel", style: "cancel" },
                readUnreadButton,
                { text: "Delete", style: "destructive", onPress: () => handleDelete(item) },
            ],
            { cancelable: true }
        );
    }, [handleMarkAsRead, handleMarkAsUnread, handleDelete]);

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
                accessibilityLabel={item.isRead ? "Mark as unread" : "Mark as read"}
            >
                <View style={styles.actionIconRow}>
                    {item.isRead ? (
                        <Mail size={18} color={palette.gray600} strokeWidth={2} />
                    ) : (
                        <CheckCircle size={18} color={palette.green600} strokeWidth={2} />
                    )}
                    <Text style={styles.actionIconText}>{item.isRead ? "Unread" : "Read"}</Text>
                </View>
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

    const resolveFriendRowDisplay = (item: AppNotification) => {
        const d = item.data as Record<string, unknown> | undefined;
        const sender = d?.sender as { name?: string; avatar?: string; location?: string } | undefined;
        const senderName =
            (d?.senderName as string | undefined) ||
            sender?.name ||
            (d?.name as string | undefined) ||
            "Someone";
        const senderAvatar =
            (d?.senderAvatar as string | undefined) ||
            (d?.sender_avatar as string | undefined) ||
            sender?.avatar ||
            (d?.avatar as string | undefined);
        const locationStr = (d?.location as string | undefined) || sender?.location || "";
        const initials = senderName
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        return { d, senderName, senderAvatar, locationStr, initials };
    };

    const renderFriendRequestsBundle = (items: AppNotification[]) => (
        <View style={styles.friendBundleCard}>
            {items.map((item, index) => {
                const { d, senderName, senderAvatar, locationStr, initials } = resolveFriendRowDisplay(item);
                const isAccepted =
                    item.type.includes("accepted") ||
                    item.status === "accepted" ||
                    (d?.responded as boolean);
                const isDeclined = item.status === "declined";
                return (
                    <View
                        key={item.id}
                        style={[
                            styles.friendBundleRow,
                            index < items.length - 1 && styles.friendBundleRowDivider,
                            !item.isRead && styles.friendBundleRowUnread,
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.friendBundleRowMain}
                            activeOpacity={0.7}
                            onPress={() => handleNotificationPress(item)}
                            onLongPress={() => showReadUnreadMenu(item)}
                        >
                            <View style={styles.avatarContainer}>
                                {senderAvatar ? (
                                    <Image
                                        source={{ uri: senderAvatar }}
                                        style={styles.avatar}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                        <Text style={styles.avatarInitials}>{initials}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.friendBundleTextCol}>
                                <Text style={styles.friendBundleName}>{senderName}</Text>
                                {locationStr ? (
                                    <Text style={styles.friendBundleLocation}>{locationStr}</Text>
                                ) : null}
                            </View>
                        </TouchableOpacity>
                        <View style={styles.friendBundleActions}>
                            {!isAccepted && !isDeclined ? (
                                <>
                                    <TouchableOpacity
                                        style={styles.friendDeclineCircle}
                                        onPress={() => handleDecline(item.id, item.type, item.data)}
                                        accessibilityLabel="Decline friend request"
                                    >
                                        <X size={18} color={palette.gray500} strokeWidth={2} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.friendAcceptPill}
                                        onPress={() => handleAccept(item.id, item.type, item.data)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.friendAcceptPillText}>Accept</Text>
                                    </TouchableOpacity>
                                </>
                            ) : isAccepted ? (
                                <View style={styles.friendBundleStatus}>
                                    <Check size={14} color={palette.emerald600} strokeWidth={2.5} />
                                    <Text style={styles.friendBundleStatusText}>Accepted</Text>
                                </View>
                            ) : (
                                <View style={styles.friendBundleStatusDeclined}>
                                    <X size={14} color={palette.red600} strokeWidth={2.5} />
                                    <Text style={styles.friendBundleStatusDeclinedText}>Declined</Text>
                                </View>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );

    const renderNotificationItem = (item: AppNotification) => {
        const dataType = (item.data as Record<string, unknown> | undefined)?.type as string | undefined;
        const d = item.data as Record<string, unknown> | undefined;
        const isUnfilledSlotAlert = dataType === "organizer_fill_warning" || dataType === "tee_time_not_filled" || dataType === "organizer_invite_more";
        const isFriendRequest = dataType === "friend_request" || item.type.includes("friend_request");
        const isGroupInvite = dataType === "group_invite";
        const isRosterAdd = dataType === "roster_add";
        const isTeeTimeInvite = dataType === "tee_time_invite" || dataType === "spot_opened";
        const isSpotOpened = dataType === "spot_opened";
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
            (d?.organizerName as string | undefined) ||
            (d?.name as string | undefined) ||
            (d?.firstName != null && d?.lastName != null ? `${String(d.firstName)} ${String(d.lastName)}`.trim() : null) ||
            "Someone";
        const hostName = isSpotOpened
            ? String(d?.organizerName || senderName)
            : String(d?.inviterName || senderName);
        const senderAvatar =
            (d?.senderAvatar as string | undefined) ||
            (d?.sender_avatar as string | undefined) ||
            (d?.inviterAvatar as string | undefined) ||
            (d?.organizerAvatar as string | undefined) ||
            sender?.avatar ||
            (d?.avatar as string | undefined);
        const location = (d?.location as string | undefined) || sender?.location || "";
        const initials = hostName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

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

        // —— Tee time invitation card (Invites tab matches Figma: host, course, when, Decline | Accept) ——
        if (isTeeTimeInvite) {
            const courseName = (d?.courseName as string) || "Golf course";
            const teeDate = (d?.teeDate as string) || (d?.date as string) || "";
            const teeTimeVal = (d?.teeTime as string) || (d?.time as string) || "";
            const whenStr = formatTeeInviteWhen(teeDate, teeTimeVal);
            const onInvitesTab = activeTab === "invites";

            if (onInvitesTab) {
                return (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.inviteShellCard, !item.isRead && styles.inviteShellCardUnread]}
                        activeOpacity={0.7}
                        onPress={() => handleNotificationPress(item)}
                        onLongPress={() => showReadUnreadMenu(item)}
                    >
                        <View style={styles.inviteShellRow}>
                            <View style={styles.avatarContainer}>
                                {senderAvatar ? (
                                    <Image
                                        source={{ uri: senderAvatar }}
                                        style={styles.avatar}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                        <Text style={styles.avatarInitials}>{initials}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.inviteShellBody}>
                                <Text style={styles.inviteHostLine}>
                                    {hostName}
                                    <Text style={styles.inviteHostSuffix}> (host)</Text>
                                </Text>
                                <View style={styles.inviteMetaRow}>
                                    <MapPin size={15} color={palette.gray500} strokeWidth={2} />
                                    <Text style={styles.inviteMetaText}>{courseName}</Text>
                                </View>
                                {whenStr ? (
                                    <View style={styles.inviteMetaRow}>
                                        <Clock size={15} color={palette.gray500} strokeWidth={2} />
                                        <Text style={styles.inviteMetaText}>{whenStr}</Text>
                                    </View>
                                ) : null}
                                {!isAccepted && !isDeclined && (
                                    <View style={styles.inviteActionRow}>
                                        <TouchableOpacity
                                            style={styles.inviteDeclineBtn}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleDecline(item.id, item.type, item.data);
                                            }}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.inviteDeclineBtnText}>Decline</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.inviteAcceptBtn}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleAccept(item.id, item.type, item.data);
                                            }}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.inviteAcceptBtnText}>Accept</Text>
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
                        </View>
                    </TouchableOpacity>
                );
            }

            const dateTimeStr = [
                teeDate ? formatDateMMDDYYYY(teeDate) : "",
                teeTimeVal,
            ]
                .filter(Boolean)
                .join(teeTimeVal ? " at " : "");
            const maxPlayers = d?.maxPlayers as number | undefined;
            const deadlineText = getDeadlineText(d?.expiresAt as string | undefined);
            const expiresAtMs = d?.expiresAt ? new Date(d.expiresAt as string).getTime() : 0;
            const isUrgent = expiresAtMs > Date.now() && expiresAtMs - Date.now() < 3600000;

            return (
                <TouchableOpacity
                    key={item.id}
                    style={[styles.card, styles.inviteCard, !item.isRead && styles.cardUnread]}
                    activeOpacity={0.7}
                    onPress={() => handleNotificationPress(item)}
                    onLongPress={() => showReadUnreadMenu(item)}
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
                        {deadlineText ? (
                            <View style={[styles.deadlinePill, isUrgent && styles.deadlinePillUrgent]}>
                                <Clock size={12} color={isUrgent ? palette.red600 : palette.amber600} />
                                <Text style={[styles.deadlinePillText, isUrgent && styles.deadlinePillTextUrgent]}>{deadlineText}</Text>
                            </View>
                        ) : null}
                        <Text style={styles.timeAgo}>{timeAgo}</Text>
                        {!isAccepted && !isDeclined && (
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
                    {renderCardActions(item)}
                </TouchableOpacity>
            );
        }

        // —— Group invitation (Invites: initials avatar, group name, inviter line, Decline | Accept) ——
        if (isGroupInvite) {
            const groupInviteResponded = (d?.responded as boolean) === true;
            const groupInviteDeclined = (d?.declined as boolean) === true;
            const groupName = String(d?.groupName || "Group");
            const groupInitials = initialsFromGroupName(groupName);
            const inviterLabel = String(d?.inviterName || "Someone");
            const memberCount =
                (d?.memberCount as number | undefined) ?? (d?.maxMembers as number | undefined);
            const rawGroupIcon = String((d?.groupIcon as string | undefined) || "").trim();
            const groupColorResolved = safeGroupColor(d?.groupColor, palette.blue500);
            const singleIconUrl = pickSingleGroupIconUrl(rawGroupIcon);
            const groupIconIsRemote = singleIconUrl.length > 0 && isRemoteImageUrl(singleIconUrl);
            const groupIconTextDisplay =
                !groupIconIsRemote &&
                rawGroupIcon.length > 0 &&
                rawGroupIcon.length <= 4 &&
                !rawGroupIcon.includes(",") &&
                !rawGroupIcon.startsWith("[")
                    ? rawGroupIcon
                    : groupInitials;
            const groupAvatarEl = (
                <View
                    style={[
                        styles.avatarContainer,
                        styles.groupBadgeCircle,
                        { backgroundColor: groupColorResolved },
                    ]}
                >
                    {groupIconIsRemote ? (
                        <Image
                            source={{ uri: singleIconUrl }}
                            style={styles.groupIconFill}
                            resizeMode="cover"
                        />
                    ) : (
                        <Text style={styles.groupInviteInitialsWhite} numberOfLines={1}>
                            {groupIconTextDisplay}
                        </Text>
                    )}
                </View>
            );

            if (activeTab === "invites") {
                return (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.inviteShellCard, !item.isRead && styles.inviteShellCardUnread]}
                        activeOpacity={0.7}
                        onPress={() => handleNotificationPress(item)}
                        onLongPress={() => showReadUnreadMenu(item)}
                    >
                        <View style={styles.inviteShellRow}>
                            {groupAvatarEl}
                            <View style={styles.inviteShellBody}>
                                <Text style={styles.inviteHostLine}>{groupName}</Text>
                                {memberCount != null && Number.isFinite(memberCount) ? (
                                    <Text style={styles.groupMemberCount}>{memberCount} members</Text>
                                ) : null}
                                <Text style={styles.groupInviteSubline}>
                                    {inviterLabel} invited you to this group
                                </Text>
                                {!groupInviteResponded && (
                                    <View style={styles.inviteActionRow}>
                                        <TouchableOpacity
                                            style={styles.inviteDeclineBtn}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleDeclineGroupInvite(item);
                                            }}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.inviteDeclineBtnText}>Decline</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.inviteAcceptBtn}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleAcceptGroupInvite(item);
                                            }}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.inviteAcceptBtnText}>Accept</Text>
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
                        </View>
                    </TouchableOpacity>
                );
            }

            return (
                <TouchableOpacity
                    key={item.id}
                    style={[styles.card, !item.isRead && styles.cardUnread]}
                    activeOpacity={0.7}
                    onPress={() => handleNotificationPress(item)}
                    onLongPress={() => showReadUnreadMenu(item)}
                >
                    {groupAvatarEl}
                    <View style={styles.content}>
                        <Text style={styles.groupRequestLabel}>Group request</Text>
                        <Text style={styles.cardTitle}>{senderName}</Text>
                        <Text style={styles.cardBody} numberOfLines={2}>
                            {item.body}
                        </Text>
                        <Text style={styles.timeAgo}>{timeAgo}</Text>
                        {!groupInviteResponded && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.actionButtonPrimary]}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleAcceptGroupInvite(item);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.actionButtonPrimaryText}>Accept</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.actionButtonSecondary]}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleDeclineGroupInvite(item);
                                    }}
                                    activeOpacity={0.8}
                                >
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
                    onLongPress={() => showReadUnreadMenu(item)}
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

        // —— Friend request (Invites tab uses bundled card; Activity fallback only) ——
        if (isFriendRequest && activeTab === "activity") {
            return (
                <TouchableOpacity
                    key={item.id}
                    style={[styles.card, !item.isRead && styles.cardUnread]}
                    activeOpacity={0.7}
                    onPress={() => handleNotificationPress(item)}
                    onLongPress={() => showReadUnreadMenu(item)}
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
                    {renderCardActions(item)}
                </TouchableOpacity>
            );
        }

        if (isFriendRequest && activeTab === "invites") {
            return null;
        }

        // —— Default card (unfilled slot, spot_opened fallback, etc.) ——
        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.card, !item.isRead && styles.cardUnread]}
                activeOpacity={0.7}
                onPress={() => handleNotificationPress(item)}
                onLongPress={() => showReadUnreadMenu(item)}
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
                    {activeTab === "invites" && isInvite && !isAccepted && !isDeclined && !isUnfilledSlotAlert && (
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
        
        return formatDateMMDDYYYY(date);
    };

    const invitesUnreadCount = notifications.filter(n => {
        const t = getDataType(n);
        return !n.isRead && (
            t === "tee_time_invite" ||
            t === "friend_request" ||
            t === "group_invite" ||
            t === "spot_opened"
        );
    }).length;

    const activityCount = notifications.filter(n => {
        const t = getDataType(n);
        return (
            t === "tee_time_response" ||
            t === "waiver_wire" ||
            t === "group_invite_accepted" ||
            t === "player_cancelled" ||
            t === "group_updated" ||
            t === "group_deleted" ||
            t === "roster_removed" ||
            t === "on_deck_added" ||
            t === "on_deck_removed" ||
            t === "friend_accepted" ||
            t === "check_in_reminder" ||
            t === "no_show" ||
            t === "roster_exhausted" ||
            t === "fcfs_deadline" ||
            t === "roster_add" ||
            t === "organizer_fill_warning" ||
            t === "tee_time_not_filled" ||
            t === "organizer_invite_more"
        );
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
            <AppHeader title="Notifications" onBack={() => navigation?.goBack()} />
            {(hasReadInView || hasUnreadInView) && (
                <View style={styles.headerActionsRow}>
                    <View style={styles.headerActions}>
                        {hasReadInView && (
                            <TouchableOpacity style={styles.headerActionButton} onPress={handleDeleteAllRead} activeOpacity={0.7}>
                                <Text style={styles.headerActionDestructiveText}>Delete read</Text>
                            </TouchableOpacity>
                        )}
                        {hasUnreadInView && (
                            <TouchableOpacity style={styles.headerActionButton} onPress={handleMarkAllAsRead} activeOpacity={0.7}>
                                <Text style={styles.markAllReadText}>Mark all read</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

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

            {/* Filter by type — Activity tab only (Invites uses fixed sections) */}
            {activeTab === "activity" && showTypeFilter && (
                <TouchableWithoutFeedback onPress={() => setShowTypeFilter(false)}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
            )}
            {activeTab === "activity" && (
                <View style={styles.filterContainer}>
                    <Text style={styles.filterLabel}>Filter by type</Text>
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setShowTypeFilter(!showTypeFilter)}
                            activeOpacity={0.7}
                            accessibilityLabel="Filter notifications by type"
                            accessibilityHint={showTypeFilter ? "Closes filter menu" : "Opens filter menu"}
                        >
                            <Filter size={16} color={palette.gray600} />
                            <Text style={styles.filterButtonText}>
                                {typeFilterOptions.find(opt => opt.key === typeFilter)?.label || "All Types"}
                            </Text>
                            {showTypeFilter ? (
                                <ChevronUp size={16} color={palette.gray600} />
                            ) : (
                                <ChevronDown size={16} color={palette.gray600} />
                            )}
                        </TouchableOpacity>
                        {typeFilter !== "all" && (
                            <TouchableOpacity
                                style={styles.clearFilterButton}
                                onPress={() => setTypeFilter("all")}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.clearFilterText}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {showTypeFilter && (
                        <View style={styles.filterDropdown}>
                            {typeFilterOptions.map(option => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.filterOption,
                                        typeFilter === option.key && styles.filterOptionActive,
                                    ]}
                                    onPress={() => {
                                        setTypeFilter(option.key);
                                        setShowTypeFilter(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.filterOptionText,
                                            typeFilter === option.key && styles.filterOptionTextActive,
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                    {typeFilter === option.key && <Check size={16} color={palette.green600} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}

            <ScrollView
                style={[styles.scrollView, activeTab === "invites" && styles.scrollViewInvites]}
                contentContainerStyle={activeTab === "invites" ? styles.scrollContentInvites : undefined}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.green500} />
                }
            >
                {/* Unread messages section — shown on Activity tab when there are unread conversations */}
                {activeTab === "activity" && unreadConversations.length > 0 && (
                    <View style={styles.msgSection}>
                        <View style={styles.msgSectionHeader}>
                            <MessageCircle size={15} color={palette.green600} />
                            <Text style={styles.msgSectionTitle}>New Messages</Text>
                            <View style={styles.msgBadge}>
                                <Text style={styles.msgBadgeText}>
                                    {unreadConversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0)}
                                </Text>
                            </View>
                        </View>
                        {unreadConversations.slice(0, 5).map((conv) => (
                            <TouchableOpacity
                                key={conv.id}
                                style={styles.msgRow}
                                activeOpacity={0.8}
                                onPress={() =>
                                    navigation?.navigate("ChatDetail", {
                                        chatInfo: {
                                            conversationId: conv.id,
                                            recipientId: conv.otherUserId ?? undefined,
                                            id: conv.id,
                                            name: conv.title,
                                            subtitle: conv.subtitle,
                                            img: conv.avatarUrl ?? undefined,
                                            isGroup: conv.type !== "direct",
                                        },
                                    })
                                }
                            >
                                <View style={styles.msgAvatar}>
                                    {conv.avatarUrl ? (
                                        <Image
                                            source={{ uri: conv.avatarUrl }}
                                            style={styles.msgAvatarImg}
                                        />
                                    ) : (
                                        <View style={[styles.msgAvatarImg, styles.msgAvatarPlaceholder]}>
                                            <Text style={styles.msgAvatarInitials}>
                                                {conv.title ? conv.title.slice(0, 2).toUpperCase() : "?"}
                                            </Text>
                                        </View>
                                    )}
                                    {(conv.unreadCount ?? 0) > 0 && (
                                        <View style={styles.msgUnreadDot}>
                                            <Text style={styles.msgUnreadDotText}>
                                                {(conv.unreadCount ?? 0) > 9 ? "9+" : conv.unreadCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.msgContent}>
                                    <Text style={styles.msgName} numberOfLines={1}>{conv.title}</Text>
                                    {conv.lastMessage?.body ? (
                                        <Text style={styles.msgPreview} numberOfLines={1}>
                                            {conv.lastMessage.body}
                                        </Text>
                                    ) : null}
                                </View>
                                <MessageCircle size={16} color={palette.green500} />
                            </TouchableOpacity>
                        ))}
                        {unreadConversations.length > 5 && (
                            <TouchableOpacity
                                style={styles.msgViewAll}
                                onPress={() => navigation?.navigate("Messages")}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.msgViewAllText}>
                                    View all {unreadConversations.length} conversations →
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {sections.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Bell size={32} color={palette.gray400} strokeWidth={1.5} />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {typeFilter !== 'all'
                                ? `No ${typeFilterOptions.find(o => o.key === typeFilter)?.label ?? 'matching'} right now`
                                : 'All caught up'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {typeFilter !== 'all'
                                ? 'Try another filter or show all notifications.'
                                : activeTab === "activity"
                                    ? "No activity yet."
                                    : "You have no invites."}
                        </Text>
                        {typeFilter !== 'all' && (
                            <TouchableOpacity
                                style={styles.emptyClearFilterButton}
                                onPress={() => setTypeFilter('all')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.emptyClearFilterText}>Show all</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    sections.map((section, idx) => (
                        <View key={`${section.inviteKind ?? "act"}-${section.title}-${idx}`}>
                            <View
                                style={[
                                    styles.sectionHeader,
                                    activeTab === "invites" && styles.sectionHeaderInvites,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.sectionTitle,
                                        activeTab === "invites" && styles.sectionTitleInvites,
                                    ]}
                                >
                                    {section.title} ({section.count})
                                </Text>
                            </View>
                            {activeTab === "invites" && section.inviteKind === "friend" ? (
                                renderFriendRequestsBundle(section.items)
                            ) : (
                                section.items.map(item => (
                                    <View key={item.id}>{renderNotificationItem(item)}</View>
                                ))
                            )}
                        </View>
                    ))
                )}
                <View style={styles.bottomSpacer} />
            </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    headerActionsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        paddingBottom: spacing.sm,
        backgroundColor: palette.white,
        borderBottomWidth: 1,
        borderBottomColor: palette.gray200,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    headerActionButton: {
        paddingVertical: 6,
        paddingHorizontal: spacing.sm,
    },
    headerActionDestructiveText: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.sm,
        color: palette.red600,
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
    scrollViewInvites: {
        backgroundColor: "#F3F4F6",
    },
    scrollContentInvites: {
        flexGrow: 1,
        paddingBottom: spacing.lg,
    },
    sectionHeaderInvites: {
        backgroundColor: "transparent",
        borderBottomWidth: 0,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xs,
    },
    sectionTitleInvites: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.base,
        color: palette.gray900,
        textTransform: "none",
        letterSpacing: 0,
    },
    inviteShellCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: radii.lg,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        padding: spacing.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    inviteShellCardUnread: {
        backgroundColor: palette.green50,
    },
    inviteShellRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    inviteShellBody: {
        flex: 1,
        minWidth: 0,
    },
    inviteHostLine: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.base,
        color: palette.gray900,
    },
    inviteHostSuffix: {
        fontFamily: "Inter_400Regular",
        fontWeight: "400",
        color: palette.gray600,
    },
    inviteMetaRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginTop: spacing.xs + 2,
        gap: 6,
    },
    inviteMetaText: {
        flex: 1,
        minWidth: 0,
        flexShrink: 1,
        fontFamily: "Inter_400Regular",
        fontSize: 13,
        color: palette.gray600,
    },
    inviteActionRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: spacing.md,
    },
    inviteDeclineBtn: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: palette.red500,
        backgroundColor: "#FFFFFF",
    },
    inviteDeclineBtnText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.sm,
        color: palette.red600,
    },
    inviteAcceptBtn: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: radii.sm,
        backgroundColor: palette.green600,
    },
    inviteAcceptBtnText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.sm,
        color: "#FFFFFF",
    },
    groupBadgeCircle: {
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    groupIconFill: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    groupInviteInitialsWhite: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.base,
        color: "#FFFFFF",
    },
    groupMemberCount: {
        fontFamily: "Inter_400Regular",
        fontSize: 13,
        color: palette.gray500,
        marginTop: 2,
    },
    groupInviteSubline: {
        fontFamily: "Inter_400Regular",
        fontSize: 13,
        color: palette.gray600,
        marginTop: spacing.sm,
        lineHeight: 18,
    },
    friendBundleCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        borderRadius: radii.lg,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    friendBundleRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    friendBundleRowDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: palette.gray200,
    },
    friendBundleRowUnread: {
        backgroundColor: palette.green50,
    },
    friendBundleRowMain: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        minWidth: 0,
    },
    friendBundleTextCol: {
        flex: 1,
        marginLeft: spacing.md,
        minWidth: 0,
    },
    friendBundleName: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 15,
        color: palette.gray900,
    },
    friendBundleLocation: {
        fontFamily: "Inter_400Regular",
        fontSize: 13,
        color: palette.gray500,
        marginTop: 2,
    },
    friendBundleActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginLeft: spacing.sm,
    },
    friendDeclineCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.gray200,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },
    friendAcceptPill: {
        backgroundColor: palette.green600,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: radii.sm,
    },
    friendAcceptPillText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 13,
        color: "#FFFFFF",
    },
    friendBundleStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    friendBundleStatusText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.xs,
        color: palette.emerald600,
    },
    friendBundleStatusDeclined: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    friendBundleStatusDeclinedText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.xs,
        color: palette.red600,
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
    emptyClearFilterButton: {
        marginTop: spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: palette.green500,
        borderRadius: radii.md,
    },
    emptyClearFilterText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.sm,
        color: palette.white,
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
        flexShrink: 1,
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
        minWidth: 0,
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
    filterLabel: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.xs,
        color: palette.gray500,
        marginBottom: spacing.xs,
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
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
    clearFilterButton: {
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        backgroundColor: palette.gray100,
        borderRadius: radii.sm,
    },
    clearFilterText: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.sm,
        color: palette.gray600,
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
    actionIconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    actionIconText: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.xs,
        color: palette.gray500,
    },
    // ── New Messages section ──────────────────────────────────────────────────
    msgSection: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        backgroundColor: "#ECFDF3",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#B7EBCB",
        overflow: "hidden",
    },
    msgSectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: "#B7EBCB",
    },
    msgSectionTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 13,
        color: "#065F46",
        flex: 1,
    },
    msgBadge: {
        backgroundColor: palette.green600,
        borderRadius: 999,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 6,
    },
    msgBadgeText: {
        fontFamily: "Inter_700Bold",
        fontSize: 11,
        color: "#FFFFFF",
    },
    msgRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: "#D1FAE5",
        gap: spacing.sm,
    },
    msgAvatar: {
        position: "relative",
    },
    msgAvatarImg: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    msgAvatarPlaceholder: {
        backgroundColor: palette.green600,
        justifyContent: "center",
        alignItems: "center",
    },
    msgAvatarInitials: {
        fontFamily: "Inter_700Bold",
        fontSize: 14,
        color: "#FFFFFF",
    },
    msgUnreadDot: {
        position: "absolute",
        bottom: -2,
        right: -2,
        backgroundColor: palette.green600,
        borderRadius: 999,
        minWidth: 18,
        height: 18,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#ECFDF3",
        paddingHorizontal: 3,
    },
    msgUnreadDotText: {
        fontFamily: "Inter_700Bold",
        fontSize: 10,
        color: "#FFFFFF",
    },
    msgContent: {
        flex: 1,
    },
    msgName: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 13,
        color: "#065F46",
    },
    msgPreview: {
        fontFamily: "Inter_400Regular",
        fontSize: 12,
        color: "#047857",
        marginTop: 1,
    },
    msgViewAll: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    msgViewAllText: {
        fontFamily: "Inter_500Medium",
        fontSize: 12,
        color: palette.green600,
    },
});
