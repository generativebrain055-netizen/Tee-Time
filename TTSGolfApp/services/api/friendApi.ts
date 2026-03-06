/**
 * Friend API Service
 * Handles all friend-related API calls
 * @module services/api/friendApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";
import type { DiscoveredUser, FriendRequest, Friend } from "./types";

export interface DiscoverUsersParams {
  location?: string;
  course?: string;
  limit?: number;
  offset?: number;
}

export const friendApi = {
  /**
   * Send invite via link (SMS to phone with app link; "Invite via Link" flow)
   */
  sendInviteByPhone: (phone: string) =>
    apiCall<{ success: boolean; message: string }>(
      API_ENDPOINTS.FRIENDS_INVITE_BY_PHONE,
      {
        method: "POST",
        body: JSON.stringify({ phone }),
      },
    ),

  /**
   * Send friend request
   */
  sendRequest: (receiverId: string, message?: string) =>
    apiCall<{ success: boolean; request: unknown }>(
      API_ENDPOINTS.FRIENDS_REQUEST,
      {
        method: "POST",
        body: JSON.stringify({ receiverId, message }),
      },
    ),

  /**
   * Get pending requests (received)
   */
  getPendingRequests: () =>
    apiCall<{ success: boolean; requests: FriendRequest[] }>(
      API_ENDPOINTS.FRIENDS_REQUESTS_PENDING,
    ),

  /**
   * Get sent requests
   */
  getSentRequests: () =>
    apiCall<{ success: boolean; requests: unknown[] }>(
      API_ENDPOINTS.FRIENDS_REQUESTS_SENT,
    ),

  /**
   * Respond to friend request
   */
  respondToRequest: (requestId: string, response: "accepted" | "declined") =>
    apiCall<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.FRIENDS}/requests/${requestId}/respond`,
      {
        method: "PUT",
        body: JSON.stringify({ response }),
      },
    ),

  /**
   * Get friends list
   */
  getFriends: () =>
    apiCall<{ success: boolean; friends: Friend[] }>(API_ENDPOINTS.FRIENDS),

  /**
   * Remove friend
   */
  removeFriend: (friendId: string) =>
    apiCall<{ success: boolean }>(`${API_ENDPOINTS.FRIENDS}/${friendId}`, {
      method: "DELETE",
    }),

  /**
   * Discover users by location/course
   */
  discoverUsers: (params?: DiscoverUsersParams) => {
    const query = new URLSearchParams();
    if (params?.location) query.append("location", params.location);
    if (params?.course) query.append("course", params.course);
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.offset) query.append("offset", params.offset.toString());
    const queryStr = query.toString();
    return apiCall<{ success: boolean; users: DiscoveredUser[] }>(
      `${API_ENDPOINTS.FRIENDS_DISCOVER}${queryStr ? `?${queryStr}` : ""}`,
    );
  },

  /**
   * Get user profile
   */
  getUserProfile: (userId: string) =>
    apiCall<{
      success: boolean;
      profile: DiscoveredUser & { bio?: string; averageScore?: number };
    }>(`${API_ENDPOINTS.FRIENDS}/profile/${userId}`),

  /**
   * Block a user
   */
  blockUser: (userId: string) =>
    apiCall<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.FRIENDS}/block/${userId}`,
      { method: "POST" },
    ),

  /**
   * Unblock a user
   */
  unblockUser: (userId: string) =>
    apiCall<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.FRIENDS}/block/${userId}`,
      { method: "DELETE" },
    ),

  /**
   * Get blocked users
   */
  getBlockedUsers: () =>
    apiCall<{ success: boolean; blockedUsers: unknown[] }>(
      `${API_ENDPOINTS.FRIENDS}/blocked`,
    ),
};
