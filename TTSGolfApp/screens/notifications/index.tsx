/**
 * Notifications Screen (NativeWind)
 * Displays user notifications with actions
 *
 * Components extracted for maintainability:
 * - NotificationItem: Individual notification card
 * - useNotificationActions: Action handlers hook
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import { Bell, CheckCircle, ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { notificationApi, AppNotification } from "../../services/api";
import { NotificationItem } from "./NotificationItem";
import { useNotificationActions } from "./useNotificationActions";

interface NotificationsScreenProps {
  navigation: any;
}

export default function NotificationsScreen({
  navigation,
}: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Extract action handlers to custom hook
  const {
    handleNotificationPress,
    handleDelete,
    handleAcceptFriend,
    handleDeclineFriend,
    handleAcceptSpot,
    handleSelectOnDeck,
    handleMarkAllRead,
  } = useNotificationActions({ setNotifications, navigation });

  /**
   * Fetch notifications from API
   */
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

  /**
   * Render individual notification item
   */
  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <View className="px-4 py-1.5">
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
    ],
  );

  /**
   * Empty state component
   */
  const renderEmpty = () => (
    <View className="flex-1 pt-20 items-center px-8">
      <View className="w-[72px] h-[72px] rounded-full bg-gray-100 justify-center items-center mb-4">
        <Bell size={32} color={COLORS.placeholder} strokeWidth={1.5} />
      </View>
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        All Caught Up
      </Text>
      <Text className="text-sm text-gray-400 text-center">
        You have no new notifications. We'll let you know when something
        happens!
      </Text>
    </View>
  );

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 pt-2 bg-gray-50">
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          className="w-10 h-10 justify-center items-start"
        >
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900">Inbox</Text>
        <View className="w-10 items-center">
          {hasUnread && (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <CheckCircle size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlashList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
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
