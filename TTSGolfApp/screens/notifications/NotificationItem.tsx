/**
 * Notification Item Component (NativeWind)
 * Displays a single notification with actions
 */

import React, { useState, useEffect, memo } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
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

interface NotificationItemProps {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
  onDelete: (id: string) => void;
  onAcceptFriend: (item: AppNotification) => void;
  onDeclineFriend: (item: AppNotification) => void;
  onAcceptSpot: (item: AppNotification) => void;
  onSelectOnDeck: (item: AppNotification) => void;
}

/**
 * Get time ago string from date
 */
const getTimeAgo = (dateStr: string): string => {
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

/**
 * Get icon based on notification type
 */
const getNotificationIcon = (notifType?: string) => {
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

/**
 * Deadline countdown hook
 */
const useDeadlineCountdown = (expiresAt?: string) => {
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
  }, [expiresAt]);

  return { deadlineText, isUrgent };
};

export const NotificationItem = memo(
  ({
    item,
    onPress,
    onDelete,
    onAcceptFriend,
    onDeclineFriend,
    onAcceptSpot,
    onSelectOnDeck,
  }: NotificationItemProps) => {
    const { deadlineText, isUrgent } = useDeadlineCountdown(
      item.data?.expiresAt,
    );
    const notifType = item.data?.type;

    // Determine actionable states
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

    // Card base classes
    const cardClasses = `
      bg-white rounded-md p-4 border
      ${!item.isRead ? "border-green-200 border-[1.5px]" : "border-black/[0.03]"}
      ${Platform.OS === "ios" ? "shadow-sm" : "elevation-3"}
    `;

    return (
      <TouchableOpacity
        className={cardClasses}
        onPress={() => onPress(item)}
        activeOpacity={0.9}
      >
        {/* Header */}
        <View className="flex-row items-start">
          <View
            className={`w-10 h-10 rounded-full justify-center items-center ${
              !item.isRead ? "bg-green-100" : "bg-gray-100"
            }`}
          >
            {getNotificationIcon(notifType)}
          </View>

          <View className="flex-1 mx-3">
            <View className="flex-row items-center flex-wrap">
              <Text className="text-[15px] font-semibold text-gray-900 mr-1.5">
                {item.title}
              </Text>
              {!item.isRead && (
                <View className="w-2 h-2 rounded-full bg-green-600 ml-1" />
              )}
            </View>
            <Text className="text-xs text-gray-400 mt-0.5">
              {getTimeAgo(item.createdAt)}
            </Text>
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
          <Text className="text-sm text-gray-600 leading-5">{item.body}</Text>

          {deadlineText && item.data?.type === "tee_time_invite" && (
            <View
              className={`flex-row items-center self-start mt-2 px-2.5 py-1.5 rounded-full border ${
                isUrgent
                  ? "bg-red-50 border-red-200"
                  : "bg-orange-50 border-orange-200"
              }`}
            >
              <Clock size={12} color={isUrgent ? "#DC2626" : "#D97706"} />
              <Text
                className={`text-xs font-semibold ml-1.5 ${
                  isUrgent ? "text-red-600" : "text-orange-700"
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
            {isFriendRequestActionable && (
              <>
                <TouchableOpacity
                  className="flex-row items-center justify-center py-2 px-3.5 rounded-md bg-green-600 shadow-sm"
                  onPress={() => onAcceptFriend(item)}
                >
                  <UserPlus size={14} color="#FFF" />
                  <Text className="text-white font-semibold text-[13px] ml-1.5">
                    Accept
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row items-center justify-center py-2 px-3.5 rounded-md bg-gray-100 border border-gray-200"
                  onPress={() => onDeclineFriend(item)}
                >
                  <X size={14} color={COLORS.textSecondary} />
                  <Text className="text-gray-600 font-semibold text-[13px] ml-1.5">
                    Decline
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {isSpotOpenedActionable && (
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-2 px-3.5 rounded-md bg-green-600 shadow-sm"
                onPress={() => onAcceptSpot(item)}
              >
                <Calendar size={14} color="#FFF" />
                <Text className="text-white font-semibold text-[13px] ml-1.5">
                  Accept Spot
                </Text>
              </TouchableOpacity>
            )}

            {isRosterExhaustedActionable && (
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-2 px-3.5 rounded-md bg-red-500"
                onPress={() => onSelectOnDeck(item)}
              >
                <Users size={14} color="#FFF" />
                <Text className="text-white font-semibold text-[13px] ml-1.5">
                  Select from On-Deck
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  },
);

NotificationItem.displayName = "NotificationItem";
