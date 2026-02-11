/**
 * useNotificationActions Hook
 * Handles all notification-related actions and navigation
 */

import { useCallback } from "react";
import { Alert } from "react-native";
import {
  notificationApi,
  friendApi,
  AppNotification,
} from "../../services/api";

interface UseNotificationActionsProps {
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  navigation: any;
}

export function useNotificationActions({
  setNotifications,
  navigation,
}: UseNotificationActionsProps) {
  /**
   * Handle notification press - mark as read and navigate
   */
  const handleNotificationPress = useCallback(
    async (item: AppNotification) => {
      // Mark as read
      if (!item.isRead) {
        try {
          await notificationApi.markAsRead(item.id);
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
          );
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      }

      // Navigate based on type
      const notifType = item.data?.type;
      switch (notifType) {
        case "friend_request":
          if (item.data?.senderId)
            navigation?.navigate("FriendProfile", {
              userId: item.data.senderId,
            });
          break;
        case "friend_accepted":
          if (item.data?.userId)
            navigation?.navigate("FriendProfile", { userId: item.data.userId });
          break;
        case "tee_time_invite":
        case "spot_opened":
          navigation?.navigate("Invites");
          break;
        case "tee_time_response":
        case "check_in_reminder":
          if (item.data?.teeTimeId)
            navigation?.navigate("TeeTimeDetail", {
              teeTimeId: item.data.teeTimeId,
            });
          break;
        case "no_show":
          navigation?.navigate("Profile");
          break;
        case "roster_add":
          if (item.data?.ownerId)
            navigation?.navigate("FriendProfile", {
              userId: item.data.ownerId,
            });
          break;
        case "roster_exhausted":
        case "tee_time_not_filled":
        case "organizer_fill_warning":
          if (item.data?.teeTimeId) {
            navigation?.navigate("SelectOnDeck", {
              teeTimeId: item.data.teeTimeId,
              spotsRemaining: item.data.spotsRemaining || 1,
              courseName: item.data.courseName,
            });
          }
          break;
      }
    },
    [navigation, setNotifications],
  );

  /**
   * Delete notification with confirmation
   */
  const handleDelete = useCallback(
    (notificationId: string) => {
      Alert.alert("Delete", "Remove this notification?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await notificationApi.deleteNotification(notificationId);
              setNotifications((prev) =>
                prev.filter((n) => n.id !== notificationId),
              );
            } catch (error) {
              console.error("Error deleting notification:", error);
            }
          },
        },
      ]);
    },
    [setNotifications],
  );

  /**
   * Accept friend request
   */
  const handleAcceptFriend = useCallback(
    async (item: AppNotification) => {
      const requestId = item.data?.requestId;
      if (!requestId) {
        console.warn("[Notifications] No requestId in notification data:", item.data);
        return;
      }
      try {
        console.log("[Notifications] Accepting friend request:", requestId);
        const response = await friendApi.respondToRequest(
          requestId,
          "accepted",
        );
        console.log("[Notifications] Accept response:", JSON.stringify(response));
        if (response.success) {
          await notificationApi.markAsResponded(item.id);
          
          // Remove notification from list after accepting
          setNotifications((prev) => prev.filter((n) => n.id !== item.id));

          // Navigate to the friend's profile after accepting
          const senderId = item.data?.senderId;
          if (senderId) {
            Alert.alert(
              "Friend Added!",
              `You and ${item.data?.senderName || "your new friend"} are now connected.`,
              [
                { text: "View Profile", onPress: () => navigation?.navigate("FriendProfile", { userId: senderId }) },
                { text: "OK", style: "cancel" },
              ]
            );
          }
        }
      } catch (error: any) {
        console.error("[Notifications] Accept friend error:", error);
        Alert.alert("Error", error.message || "Failed to accept friend request");
      }
    },
    [setNotifications, navigation],
  );

  /**
   * Decline friend request
   */
  const handleDeclineFriend = useCallback(
    async (item: AppNotification) => {
      const requestId = item.data?.requestId;
      if (!requestId) {
        console.warn("[Notifications] No requestId in notification data:", item.data);
        return;
      }
      try {
        console.log("[Notifications] Declining friend request:", requestId);
        const response = await friendApi.respondToRequest(
          requestId,
          "declined",
        );
        console.log("[Notifications] Decline response:", JSON.stringify(response));
        if (response.success) {
          await notificationApi.markAsResponded(item.id);
          
          // Remove notification from list after declining
          setNotifications((prev) => prev.filter((n) => n.id !== item.id));
        }
      } catch (error: any) {
        console.error("[Notifications] Decline friend error:", error);
        Alert.alert("Error", error.message || "Failed to decline friend request");
      }
    },
    [setNotifications],
  );

  /**
   * Accept an opened spot
   */
  const handleAcceptSpot = useCallback(
    async (item: AppNotification) => {
      try {
        await notificationApi.markAsResponded(item.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, data: { ...n.data, responded: true }, isRead: true }
              : n,
          ),
        );
        navigation?.navigate("Invites");
      } catch (error) {
        console.error(error);
      }
    },
    [navigation, setNotifications],
  );

  /**
   * Navigate to select on-deck players
   */
  const handleSelectOnDeck = useCallback(
    async (item: AppNotification) => {
      try {
        await notificationApi.markAsResponded(item.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, data: { ...n.data, responded: true }, isRead: true }
              : n,
          ),
        );
        navigation?.navigate("SelectOnDeck", {
          teeTimeId: item.data?.teeTimeId,
          spotsRemaining: item.data?.spotsRemaining || 1,
          courseName: item.data?.courseName,
        });
      } catch (error) {
        console.error(error);
      }
    },
    [navigation, setNotifications],
  );

  /**
   * Mark all notifications as read
   */
  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  }, [setNotifications]);

  return {
    handleNotificationPress,
    handleDelete,
    handleAcceptFriend,
    handleDeclineFriend,
    handleAcceptSpot,
    handleSelectOnDeck,
    handleMarkAllRead,
  };
}
