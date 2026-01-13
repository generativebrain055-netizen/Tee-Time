import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import {
  Bell,
  Users,
  Calendar,
  CheckCircle,
  Trash2,
  UserPlus,
  X,
  Clock,
  ChevronLeft,
} from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import {
  notificationApi,
  friendApi,
  AppNotification,
} from "../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NotificationsScreenProps {
  navigation: any;
}

// --- styled notification item ---
const NotificationItem = memo(
  ({
    item,
    onPress,
    onDelete,
    onAcceptFriend,
    onDeclineFriend,
    onAcceptSpot,
    onSelectOnDeck,
  }: {
    item: AppNotification;
    onPress: (item: AppNotification) => void;
    onDelete: (id: string) => void;
    onAcceptFriend: (item: AppNotification) => void;
    onDeclineFriend: (item: AppNotification) => void;
    onAcceptSpot: (item: AppNotification) => void;
    onSelectOnDeck: (item: AppNotification) => void;
  }) => {
    const [deadlineText, setDeadlineText] = useState<string | null>(null);
    const [isUrgent, setIsUrgent] = useState(false);

    // Live countdown for deadline
    useEffect(() => {
      const expiresAt = item.data?.expiresAt;
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

        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        setIsUrgent(diffHours < 1);

        if (diffHours >= 24) {
          const days = Math.floor(diffHours / 24);
          setDeadlineText(`${days}d left`);
        } else if (diffHours >= 1) {
          setDeadlineText(`${diffHours}h left`);
        } else {
          setDeadlineText(`${diffMins}m left`);
        }
      };

      calculateDeadline();
      const interval = setInterval(calculateDeadline, 60000);

      return () => clearInterval(interval);
    }, [item.data?.expiresAt]);

    const getIcon = () => {
      const notifType = item.data?.type;
      switch (notifType) {
        case "friend_request":
        case "friend_accepted":
        case "roster_add":
          return <Users size={20} color={COLORS.primary} />;
        case "tee_time_invite":
        case "tee_time_response":
        case "check_in_reminder":
        case "spot_opened":
          return <Calendar size={20} color={COLORS.primary} />;
        case "roster_exhausted":
        case "tee_time_not_filled":
        case "organizer_fill_warning":
          return <Calendar size={20} color={COLORS.error || "#EF4444"} />;
        case "no_show":
          return <Bell size={20} color={COLORS.error || "#EF4444"} />;
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
    const isFriendRequest = notifType === "friend_request";
    const isSpotOpened = notifType === "spot_opened";
    const isRosterExhausted =
      notifType === "roster_exhausted" ||
      notifType === "tee_time_not_filled" ||
      notifType === "organizer_fill_warning";
    const isFriendRequestActionable =
      isFriendRequest && item.data?.requestId && !item.data?.responded;
    const isSpotOpenedActionable =
      isSpotOpened && item.data?.teeTimeId && !item.data?.responded;
    const isRosterExhaustedActionable =
      isRosterExhausted && item.data?.teeTimeId && !item.data?.responded;

    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.unreadCard]}
        onPress={() => onPress(item)}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconContainer,
              !item.isRead && styles.unreadIconContainer,
            ]}
          >
            {getIcon()}
          </View>
          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={16} color={COLORS.textTertiary || "#9CA3AF"} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.body}>{item.body}</Text>

          {deadlineText && item.data?.type === "tee_time_invite" && (
            <View
              style={[
                styles.deadlineBadge,
                isUrgent && styles.deadlineBadgeUrgent,
              ]}
            >
              <Clock size={12} color={isUrgent ? "#DC2626" : "#D97706"} />
              <Text
                style={[
                  styles.deadlineText,
                  isUrgent && styles.deadlineTextUrgent,
                ]}
              >
                {deadlineText}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons Area */}
        {(isFriendRequestActionable ||
          isSpotOpenedActionable ||
          isRosterExhaustedActionable) && (
          <View style={styles.actionContainer}>
            {isFriendRequestActionable && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => onAcceptFriend(item)}
                >
                  <UserPlus size={14} color="#FFF" />
                  <Text style={styles.primaryButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => onDeclineFriend(item)}
                >
                  <X size={14} color={COLORS.textSecondary} />
                  <Text style={styles.secondaryButtonText}>Decline</Text>
                </TouchableOpacity>
              </>
            )}

            {isSpotOpenedActionable && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { flex: 1 }]}
                onPress={() => onAcceptSpot(item)}
              >
                <Calendar size={14} color="#FFF" />
                <Text style={styles.primaryButtonText}>Accept Spot</Text>
              </TouchableOpacity>
            )}

            {isRosterExhaustedActionable && (
              <TouchableOpacity
                style={[styles.button, styles.warningButton, { flex: 1 }]}
                onPress={() => onSelectOnDeck(item)}
              >
                <Users size={14} color="#FFF" />
                <Text style={styles.primaryButtonText}>
                  Select from On-Deck
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

export default function NotificationsScreen({
  navigation,
}: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
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

  const handleNotificationPress = useCallback(
    async (item: AppNotification) => {
      if (!item.isRead) {
        try {
          await notificationApi.markAsRead(item.id);
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
          );
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      }

      // Navigation Logic
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
    [navigation]
  );

  const handleDelete = useCallback((notificationId: string) => {
    Alert.alert("Delete", "Remove this notification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await notificationApi.deleteNotification(notificationId);
            setNotifications((prev) =>
              prev.filter((n) => n.id !== notificationId)
            );
          } catch (error) {
            console.error("Error deleting notification:", error);
          }
        },
      },
    ]);
  }, []);

  const handleAcceptFriend = useCallback(async (item: AppNotification) => {
    const requestId = item.data?.requestId;
    if (!requestId) return;
    try {
      const response = await friendApi.respondToRequest(requestId, "accepted");
      if (response.success) {
        await notificationApi.markAsResponded(item.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, data: { ...n.data, responded: true }, isRead: true }
              : n
          )
        );
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleDeclineFriend = useCallback(async (item: AppNotification) => {
    const requestId = item.data?.requestId;
    if (!requestId) return;
    try {
      const response = await friendApi.respondToRequest(requestId, "declined");
      if (response.success) {
        await notificationApi.markAsResponded(item.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, data: { ...n.data, responded: true }, isRead: true }
              : n
          )
        );
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleAcceptSpot = useCallback(
    async (item: AppNotification) => {
      try {
        await notificationApi.markAsResponded(item.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, data: { ...n.data, responded: true }, isRead: true }
              : n
          )
        );
        navigation?.navigate("Invites");
      } catch (error) {
        console.error(error);
      }
    },
    [navigation]
  );

  const handleSelectOnDeck = useCallback(
    async (item: AppNotification) => {
      try {
        await notificationApi.markAsResponded(item.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, data: { ...n.data, responded: true }, isRead: true }
              : n
          )
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
    [navigation]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <NotificationItem
          item={item}
          onPress={handleNotificationPress}
          onDelete={handleDelete}
          onAcceptFriend={handleAcceptFriend}
          onDeclineFriend={handleDeclineFriend}
          onAcceptSpot={handleAcceptSpot}
          onSelectOnDeck={handleSelectOnDeck}
        />
      </View>
    ),
    [
      handleNotificationPress,
      handleDelete,
      handleAcceptFriend,
      handleDeclineFriend,
      handleAcceptSpot,
      handleSelectOnDeck,
    ]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Bell
          size={32}
          color={COLORS.textTertiary || "#9CA3AF"}
          strokeWidth={1.5}
        />
      </View>
      <Text style={styles.emptyTitle}>All Caught Up</Text>
      <Text style={styles.emptyText}>
        You have no new notifications. We'll let you know when something
        happens!
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Custom Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbox</Text>
        <View style={{ width: 40, alignItems: "center" }}>
          {notifications.some((n) => !n.isRead) ? (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <CheckCircle size={22} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlashList
          data={notifications}
          renderItem={renderItem}
          estimatedItemSize={120}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB", // Light grey background for modern feel
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: "#F9FAFB",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 24, // Large Apple-style header
    fontWeight: "700",
    color: COLORS.black,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 40,
  },
  // Card Styles
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3, // Android shadow
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  unreadCard: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primaryLight || "#E8F5E9",
    borderWidth: 1.5,
    shadowOpacity: 0.1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  headerTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  unreadIconContainer: {
    backgroundColor: COLORS.primaryLight || "#E8F5E9",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.black,
    marginRight: 6,
  },
  unreadTitle: {
    color: COLORS.black,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 4,
  },
  time: {
    fontSize: 12,
    color: COLORS.textTertiary || "#9CA3AF",
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  cardContent: {
    marginTop: 12,
    paddingLeft: 52, // Align with text
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary || "#4B5563",
    lineHeight: 20,
  },
  // Badges
  deadlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  deadlineBadgeUrgent: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#C2410C",
    marginLeft: 5,
  },
  deadlineTextUrgent: {
    color: "#DC2626",
  },
  // Actions
  actionContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
    paddingLeft: 52,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  warningButton: {
    backgroundColor: COLORS.error || "#EF4444",
  },
  primaryButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary || "#4B5563",
    fontWeight: "600",
    fontSize: 13,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textTertiary || "#9ca3af",
    textAlign: "center",
    lineHeight: 22,
  },
});
