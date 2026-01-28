/**
 * Notification API Service
 * Handles all notification-related API calls
 * @module services/api/notificationApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";
import type { AppNotification } from "./types";

export interface GetNotificationsParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export const notificationApi = {
  /**
   * Get notifications
   */
  getNotifications: (params?: GetNotificationsParams) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.offset) query.append("offset", params.offset.toString());
    if (params?.unreadOnly) query.append("unreadOnly", "true");
    const queryStr = query.toString();
    return apiCall<{ success: boolean; notifications: AppNotification[] }>(
      `${API_ENDPOINTS.NOTIFICATIONS}${queryStr ? `?${queryStr}` : ""}`,
    );
  },

  /**
   * Get unread count
   */
  getUnreadCount: () =>
    apiCall<{ success: boolean; count: number }>(
      API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT,
    ),

  /**
   * Mark notification as read
   */
  markAsRead: (notificationId: string) =>
    apiCall<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`,
      { method: "PUT" },
    ),

  /**
   * Mark notification as responded (for actionable notifications)
   */
  markAsResponded: (notificationId: string) =>
    apiCall<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/responded`,
      { method: "PUT" },
    ),

  /**
   * Mark all as read
   */
  markAllAsRead: () =>
    apiCall<{ success: boolean; count: number; message: string }>(
      API_ENDPOINTS.NOTIFICATIONS_READ_ALL,
      { method: "PUT" },
    ),

  /**
   * Delete notification
   */
  deleteNotification: (notificationId: string) =>
    apiCall<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}`,
      { method: "DELETE" },
    ),
};
