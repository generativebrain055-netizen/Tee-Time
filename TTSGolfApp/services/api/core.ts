/**
 * API Core - Shared HTTP utilities
 * @module services/api/core
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ENDPOINTS } from "../../config/api";
import { sessionManager } from "../../utils/sessionManager";
import { logger } from "../../utils/logger";

/**
 * Get authentication headers for API requests
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await AsyncStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) return null;

    const response = await fetch(API_ENDPOINTS.REFRESH_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      await AsyncStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) {
        await AsyncStorage.setItem("refreshToken", data.refreshToken);
      }
      return data.accessToken;
    }

    // Refresh failed - clear tokens and trigger session expired
    await sessionManager.handleSessionExpired();
    return null;
  } catch (error) {
    logger.error("[api/core] Token refresh failed", error);
    return null;
  }
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Generic API call wrapper with automatic token refresh
 */
export const apiCall = async <T>(
  url: string,
  options: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<T> => {
  const headers = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && retryOnUnauthorized) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry the request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
        },
      });
      const retryData = await retryResponse.json();
      if (!retryResponse.ok) {
        throw new ApiError(
          retryData.message || "API request failed",
          retryResponse.status,
          retryData.code,
        );
      }
      return retryData;
    }
    // Token refresh failed - session manager already handled redirect
    throw new ApiError("Session expired", 401, "SESSION_EXPIRED");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.message || "API request failed",
      response.status,
      data.code,
    );
  }

  return data;
};

/**
 * Build query string from params object
 */
export const buildQueryString = (params: Record<string, unknown>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  });
  const queryStr = query.toString();
  return queryStr ? `?${queryStr}` : "";
};
