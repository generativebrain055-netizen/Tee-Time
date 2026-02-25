/**
 * Profile API Service
 * Handles all profile-related API calls including avatar upload
 * @module services/api/profileApi
 */

import { API_ENDPOINTS, API_URL } from "../../config/api";
import { apiCall, getAuthHeaders } from "./core";
import type {
  UserProfile,
  NotificationPreferences,
  PrivacySettings,
} from "./types";

export interface AvatarUploadResponse {
  success: boolean;
  avatarUrl: string;
  message?: string;
  /** When authenticated, backend persists avatar and returns updated user */
  user?: Partial<UserProfile>;
}

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
   * Upload avatar image to Supabase Storage. When authenticated, backend also saves to profile.
   * Expects base64 data URL (e.g. data:image/jpeg;base64,...) as returned by image picker with base64: true
   */
  uploadAvatar: (profilePhotoBase64: string): Promise<AvatarUploadResponse> =>
    apiCall<AvatarUploadResponse>(`${API_URL}/auth/upload-avatar`, {
      method: "POST",
      body: JSON.stringify({ profilePhotoBase64 }),
    }),

  /**
   * Delete current avatar
   */
  deleteAvatar: () =>
    apiCall<{ success: boolean; message: string }>(
      `${API_URL}/auth/profile/avatar`,
      {
        method: "DELETE",
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
