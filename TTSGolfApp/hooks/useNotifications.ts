import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { notificationApi, friendApi, AppNotification } from "../services/api";
import { logger } from "../utils/logger";
import { formatRemainingClock } from "../utils/formatting";

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  hasUnread: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteWithConfirm: (id: string) => void;
  acceptFriendRequest: (item: AppNotification) => Promise<void>;
  declineFriendRequest: (item: AppNotification) => Promise<void>;
  markAsResponded: (item: AppNotification) => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifResponse, countResponse] = await Promise.all([
        notificationApi.getNotifications({ limit: 50 }),
        notificationApi.getUnreadCount(),
      ]);

      if (notifResponse.success) {
        setNotifications(notifResponse.notifications);
      }
      if (countResponse.success) {
        setUnreadCount(countResponse.count);
      }
    } catch (error) {
      logger.error("[useNotifications] Error fetching notifications", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error("[useNotifications] Error marking notification as read", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      logger.error("[useNotifications] Error marking all as read", error);
    }
  }, []);

  const deleteNotification = useCallback(
    async (id: string) => {
      try {
        const notification = notifications.find((n) => n.id === id);
        await notificationApi.deleteNotification(id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (notification && !notification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        logger.error("[useNotifications] Error deleting notification", error);
      }
    },
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    hasUnread: unreadCount > 0,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteWithConfirm: useCallback(
      (id: string) => {
        Alert.alert("Delete", "Remove this notification?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteNotification(id),
          },
        ]);
      },
      [deleteNotification],
    ),
    acceptFriendRequest: useCallback(async (item: AppNotification) => {
      const requestId = item.data?.requestId;
      if (!requestId) return;
      try {
        const response = await friendApi.respondToRequest(
          requestId,
          "accepted",
        );
        if (response.success) {
          await notificationApi.markAsResponded(item.id);
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === item.id
                ? { ...n, data: { ...n.data, responded: true }, isRead: true }
                : n,
            ),
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        logger.error("[useNotifications] Error accepting friend request", error);
      }
    }, []),
    declineFriendRequest: useCallback(async (item: AppNotification) => {
      const requestId = item.data?.requestId;
      if (!requestId) return;
      try {
        const response = await friendApi.respondToRequest(
          requestId,
          "declined",
        );
        if (response.success) {
          await notificationApi.markAsResponded(item.id);
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === item.id
                ? { ...n, data: { ...n.data, responded: true }, isRead: true }
                : n,
            ),
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        logger.error("[useNotifications] Error declining friend request", error);
      }
    }, []),
    markAsResponded: useCallback(async (item: AppNotification) => {
      try {
        await notificationApi.markAsResponded(item.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, data: { ...n.data, responded: true }, isRead: true }
              : n,
          ),
        );
        if (!item.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        logger.error("[useNotifications] Error marking as responded", error);
      }
    }, []),
  };
}

// Hook for just the unread count (lightweight)
export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await notificationApi.getUnreadCount();
        if (response.success) {
          setCount(response.count);
        }
      } catch (error) {
        // Silently fail
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return count;
}

/**
 * Hook for deadline countdown timer
 */
export function useDeadlineTimer(expiresAt: string | undefined) {
  const [deadlineText, setDeadlineText] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setDeadlineText(null);
      return;
    }

    const calculateDeadline = () => {
      const deadline = new Date(expiresAt);
      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();

      if (diffMs <= 0) {
        setDeadlineText("Expired");
        setIsUrgent(true);
        return;
      }

      const diffHours = Math.floor(diffMs / 3600000);

      setIsUrgent(diffHours < 1);
      setDeadlineText(formatRemainingClock(diffMs, true));
    };

    calculateDeadline();
    const interval = setInterval(calculateDeadline, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return { deadlineText, isUrgent };
}

/**
 * Get navigation target for a notification
 */
export function getNotificationNavigation(item: AppNotification): {
  screen: string | null;
  params?: Record<string, any>;
} {
  const notifType = item.data?.type;

  switch (notifType) {
    case "friend_request":
      return item.data?.senderId
        ? { screen: "FriendProfile", params: { userId: item.data.senderId } }
        : { screen: null };

    case "friend_accepted":
      return item.data?.userId
        ? { screen: "FriendProfile", params: { userId: item.data.userId } }
        : { screen: null };

    case "tee_time_invite":
    case "spot_opened":
      if (item.data?.teeTimeId) {
        return { screen: "TeeTimeDetail", params: { teeTimeId: item.data.teeTimeId } };
      }
      if (item.data?.inviteId) {
        return { screen: "InviteDetail", params: { inviteId: item.data.inviteId } };
      }
      return { screen: "Invites" };

    case "tee_time_booked":
      if (item.data?.conversationId) {
        return {
          screen: "ChatDetail",
          params: {
            chatInfo: {
              conversationId: item.data.conversationId,
              teeTimeId: item.data.teeTimeId,
              id: item.data.teeTimeId || item.data.conversationId,
              name: item.data.courseName || "Tee time",
              subtitle: "Group chat",
              isGroup: true,
            },
          },
        };
      }
      if (item.data?.teeTimeId) {
        return {
          screen: "ChatDetail",
          params: {
            chatInfo: {
              teeTimeId: item.data.teeTimeId,
              id: item.data.teeTimeId,
              name: item.data.courseName || "Tee time",
              subtitle: "Group chat",
              isGroup: true,
            },
          },
        };
      }
      return { screen: null };

    case "tee_time_response":
      if (item.data?.inviteId) {
        return { screen: "InviteDetail", params: { inviteId: item.data.inviteId } };
      }
      if (item.data?.teeTimeId) {
        return {
          screen: "TeeTimeDetail",
          params: { teeTimeId: item.data.teeTimeId },
        };
      }
      return { screen: null };

    case "check_in_reminder":
      return item.data?.teeTimeId
        ? {
            screen: "TeeTimeDetail",
            params: {
              teeTimeId: item.data.teeTimeId,
              autoOpenCheckIn: true,
            },
          }
        : { screen: null };

    case "player_cancelled":
      return item.data?.teeTimeId
        ? { screen: "TeeTimeDetail", params: { teeTimeId: item.data.teeTimeId } }
        : { screen: null };

    case "no_show":
      return { screen: "Profile" };

    case "roster_add":
    case "roster_removed":
    case "group_updated":
    case "group_deleted":
    case "on_deck_added":
    case "on_deck_removed":
      return item.data?.ownerId
        ? { screen: "FriendProfile", params: { userId: item.data.ownerId } }
        : { screen: null };

    case "roster_exhausted":
    case "tee_time_not_filled":
    case "organizer_fill_warning":
    case "organizer_invite_more":
      return item.data?.teeTimeId
        ? {
            screen: "SelectOnDeck",
            params: {
              teeTimeId: item.data.teeTimeId,
              spotsRemaining: item.data.spotsRemaining || 1,
              courseName: item.data.courseName,
              teeDate: item.data.teeDate,
              teeTime: item.data.teeTime,
              unfilledSlotAlert: true,
            },
          }
        : { screen: null };

    default:
      return { screen: null };
  }
}

/**
 * Format time ago string
 */
export function formatTimeAgo(dateStr: string): string {
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
}
