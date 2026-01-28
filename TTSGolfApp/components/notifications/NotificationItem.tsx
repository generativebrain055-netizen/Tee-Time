/**
 * NotificationItem Component
 * Renders a single notification card
 * @module components/notifications/NotificationItem
 */

import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  Bell,
  Users,
  Calendar,
  Trash2,
  UserPlus,
  X,
  Clock,
} from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { AppNotification } from "../../services/api";
import { useDeadlineTimer, formatTimeAgo } from "../../hooks/useNotifications";

interface NotificationItemProps {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
  onDelete: (id: string) => void;
  onAcceptFriend?: (item: AppNotification) => void;
  onDeclineFriend?: (item: AppNotification) => void;
  onAcceptSpot?: (item: AppNotification) => void;
  onSelectOnDeck?: (item: AppNotification) => void;
}

/**
 * Get icon based on notification type
 */
function getNotificationIcon(type: string | undefined) {
  switch (type) {
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
}

export const NotificationItem = memo(function NotificationItem({
  item,
  onPress,
  onDelete,
  onAcceptFriend,
  onDeclineFriend,
  onAcceptSpot,
  onSelectOnDeck,
}: NotificationItemProps) {
  const { deadlineText, isUrgent } = useDeadlineTimer(item.data?.expiresAt);

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
      {/* Header */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconContainer,
            !item.isRead && styles.unreadIconContainer,
          ]}
        >
          {getNotificationIcon(notifType)}
        </View>

        <View style={styles.headerTextContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={16} color={COLORS.placeholder} />
        </TouchableOpacity>
      </View>

      {/* Content */}
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

      {/* Action Buttons */}
      {(isFriendRequestActionable ||
        isSpotOpenedActionable ||
        isRosterExhaustedActionable) && (
        <View style={styles.actionContainer}>
          {isFriendRequestActionable && onAcceptFriend && onDeclineFriend && (
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

          {isSpotOpenedActionable && onAcceptSpot && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { flex: 1 }]}
              onPress={() => onAcceptSpot(item)}
            >
              <Calendar size={14} color="#FFF" />
              <Text style={styles.primaryButtonText}>Accept Spot</Text>
            </TouchableOpacity>
          )}

          {isRosterExhaustedActionable && onSelectOnDeck && (
            <TouchableOpacity
              style={[styles.button, styles.warningButton, { flex: 1 }]}
              onPress={() => onSelectOnDeck(item)}
            >
              <Users size={14} color="#FFF" />
              <Text style={styles.primaryButtonText}>Select from On-Deck</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
    color: COLORS.text,
    marginRight: 6,
  },
  unreadTitle: {
    color: COLORS.text,
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
    color: COLORS.placeholder,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  cardContent: {
    marginTop: 12,
    paddingLeft: 52,
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary || "#4B5563",
    lineHeight: 20,
  },
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
});

export default NotificationItem;
