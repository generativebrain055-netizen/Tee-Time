/**
 * Profile API Service
 * Handles all profile-related API calls
 * @module services/api/profileApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";
import type {
  UserProfile,
  NotificationPreferences,
  PrivacySettings,
} from "./types";

export const profileApi = {
  /**
   * Get current user with profile
   */
  getCurrentUser: () =>
    apiCall<{ success: boolean; user: UserProfile }>(
      API_ENDPOINTS.GET_CURRENT_USER,
    ),

  /**
   * Update profile (handles both user and profile data)
   */
  updateProfile: (data: Partial<UserProfile>) =>
    apiCall<{ success: boolean; user: UserProfile }>(
      API_ENDPOINTS.UPDATE_PROFILE,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: (
    preferences: Partial<NotificationPreferences>,
  ) =>
    apiCall<{ success: boolean }>(API_ENDPOINTS.UPDATE_PROFILE, {
      method: "PUT",
      body: JSON.stringify({ notificationPreferences: preferences }),
    }),

  /**
   * Update privacy settings
   */
  updatePrivacySettings: (settings: Partial<PrivacySettings>) =>
    apiCall<{ success: boolean }>(API_ENDPOINTS.UPDATE_PROFILE, {
      method: "PUT",
      body: JSON.stringify({ privacySettings: settings }),
    }),
};
