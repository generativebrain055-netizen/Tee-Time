/**
 * NotificationItem Component
 * Renders a single notification card
 * @module components/notifications/NotificationItem
 */

import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
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
    case "roster_removed":
    case "group_updated":
    case "group_deleted":
    case "on_deck_added":
    case "on_deck_removed":
      return <Users size={20} color={COLORS.primary} />;
    case "tee_time_invite":
    case "tee_time_booked":
    case "tee_time_response":
    case "check_in_reminder":
    case "spot_opened":
      return <Calendar size={20} color={COLORS.primary} />;
    case "roster_exhausted":
    case "tee_time_not_filled":
    case "organizer_fill_warning":
    case "organizer_invite_more":
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
    notifType === "organizer_fill_warning" ||
    notifType === "organizer_invite_more";

  const isFriendRequestActionable =
    isFriendRequest && item.data?.requestId && !item.data?.responded;
  const isSpotOpenedActionable =
    isSpotOpened && item.data?.teeTimeId && !item.data?.responded;
  const isRosterExhaustedActionable =
    isRosterExhausted && item.data?.teeTimeId && !item.data?.responded;

  return (
    <TouchableOpacity
      className="bg-white rounded-md p-4 border border-black/[0.03]"
      style={[
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 3,
        },
        !item.isRead && {
          borderColor: COLORS.primaryLight || "#E8F5E9",
          borderWidth: 1.5,
          shadowOpacity: 0.1,
        },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.9}
    >
      {/* Header */}
      <View className="flex-row items-start">
        <View
          className={`w-10 h-10 rounded-full justify-center items-center ${
            !item.isRead ? "bg-[#E8F5E9]" : "bg-gray-100"
          }`}
        >
          {getNotificationIcon(notifType)}
        </View>

        <View className="flex-1 mx-3">
          <View className="flex-row items-center flex-wrap">
            <Text className={`text-[15px] font-semibold mr-1.5 ${!item.isRead ? "text-[#111827]" : ""}`} style={{ color: COLORS.text }}>
              {item.title}
            </Text>
            {!item.isRead && <View className="w-2 h-2 rounded-full bg-primary ml-1" />}
          </View>
          <Text className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(item.createdAt)}</Text>
        </View>

        <TouchableOpacity
          className="p-1"
          onPress={() => onDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={16} color={COLORS.placeholder} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="mt-3 pl-[52px]">
        <Text className="text-sm leading-5" style={{ color: COLORS.textSecondary || "#4B5563" }}>{item.body}</Text>

        {deadlineText && item.data?.type === "tee_time_invite" && (
          <View
            className={`flex-row items-center px-2.5 py-1.5 rounded-full self-start mt-2 border ${
              isUrgent
                ? "bg-[#FEF2F2] border-[#FECACA]"
                : "bg-[#FFF7ED] border-[#FFEDD5]"
            }`}
          >
            <Clock size={12} color={isUrgent ? "#DC2626" : "#D97706"} />
            <Text
              className={`text-xs font-semibold ml-1.5 ${
                isUrgent ? "text-[#DC2626]" : "text-[#C2410C]"
              }`}
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
        <View className="flex-row justify-end gap-2 mt-4 pl-[52px]">
          {isFriendRequestActionable && onAcceptFriend && onDeclineFriend && (
            <>
              <TouchableOpacity
                className="flex-row items-center justify-center py-2 px-3.5 rounded-md gap-1.5"
                style={{
                  backgroundColor: COLORS.primary,
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 2,
                }}
                onPress={() => onAcceptFriend(item)}
              >
                <UserPlus size={14} color="#FFF" />
                <Text className="text-white font-semibold text-[13px]">Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center justify-center py-2 px-3.5 rounded-md gap-1.5 bg-gray-100 border border-gray-200"
                onPress={() => onDeclineFriend(item)}
              >
                <X size={14} color={COLORS.textSecondary} />
                <Text className="font-semibold text-[13px]" style={{ color: COLORS.textSecondary || "#4B5563" }}>Decline</Text>
              </TouchableOpacity>
            </>
          )}

          {isSpotOpenedActionable && onAcceptSpot && (
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-2 px-3.5 rounded-md gap-1.5"
              style={{
                backgroundColor: COLORS.primary,
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 2,
              }}
              onPress={() => onAcceptSpot(item)}
            >
              <Calendar size={14} color="#FFF" />
              <Text className="text-white font-semibold text-[13px]">Accept Spot</Text>
            </TouchableOpacity>
          )}

          {isRosterExhaustedActionable && onSelectOnDeck && (
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-2 px-3.5 rounded-md gap-1.5"
              style={{
                backgroundColor: COLORS.error || "#EF4444",
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 2,
              }}
              onPress={() => onSelectOnDeck(item)}
            >
              <Users size={14} color="#FFF" />
              <Text className="text-white font-semibold text-[13px]">Select from On-Deck</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

export default NotificationItem;
