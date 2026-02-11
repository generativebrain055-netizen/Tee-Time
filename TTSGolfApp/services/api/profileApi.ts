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
   * Upload avatar image to Supabase Storage
   * Supports both file URI (from camera/gallery) and base64 data
   */
  uploadAvatar: async (imageUri: string): Promise<AvatarUploadResponse> => {
    const headers = await getAuthHeaders();
    
    // Create form data for file upload
    const formData = new FormData();
    
    // Get file extension and mime type
    const uriParts = imageUri.split(".");
    const fileExtension = uriParts[uriParts.length - 1].toLowerCase();
    const mimeType = fileExtension === "png" ? "image/png" : "image/jpeg";
    
    // Append file to form data
    formData.append("avatar", {
      uri: imageUri,
      type: mimeType,
      name: `avatar.${fileExtension}`,
    } as unknown as Blob);
    
    const response = await fetch(`${API_URL}/auth/profile/avatar`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Failed to upload avatar");
    }
    
    return data;
  },

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
