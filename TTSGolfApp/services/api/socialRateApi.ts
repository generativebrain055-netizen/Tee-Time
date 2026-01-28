/**
 * Social Rate API Service
 * Handles social rate scoring API calls
 * @module services/api/socialRateApi
 */

import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";
import type { SocialRateData, SocialRateLogEntry } from "./types";

export const socialRateApi = {
  /**
   * Get current user's social rate
   */
  getCurrentScore: () =>
    apiCall<{ success: boolean; socialRate: SocialRateData }>(
      API_ENDPOINTS.SOCIAL_RATE,
    ),

  /**
   * Get score history
   */
  getHistory: (limit = 50, offset = 0) =>
    apiCall<{ success: boolean; history: SocialRateLogEntry[] }>(
      `${API_ENDPOINTS.SOCIAL_RATE_HISTORY}?limit=${limit}&offset=${offset}`,
    ),

  /**
   * Get another user's score
   */
  getUserScore: (userId: string) =>
    apiCall<{
      success: boolean;
      socialRate: { userId: string; currentScore: number };
    }>(`${API_ENDPOINTS.SOCIAL_RATE}/user/${userId}`),
};
