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
    // Expected when logged out or refresh token invalid; avoid alarming logs
    logger.debug("[api/core] Token refresh failed (session may be cleared)", error);
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
  
  // Log request details for debugging
  logger.info("[api/core] Making API request", {
    url,
    method: options.method || "GET",
    hasBody: !!options.body,
    hasAuth: !!headers.Authorization,
  });
  
  try {
    // Add timeout to detect connection issues faster
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        logger.error("[api/core] Request timeout - backend not responding", {
          url,
          timeout: "10s",
        });
        throw new ApiError(
          "Request timed out. The backend is not responding. Please check:\n" +
          "1. Backend is running (cd backend && npm run dev)\n" +
          "2. API_URL is correct in .env\n" +
          "3. Backend is accessible from your device/simulator",
          0,
          "TIMEOUT_ERROR",
        );
      }
      throw fetchError;
    }
    
    logger.info("[api/core] API response received", {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    // Handle 401 Unauthorized - try to refresh token (unless caller opted out, e.g. /auth/me)
    if (response.status === 401 && retryOnUnauthorized) {
      logger.debug("[api/core] Received 401, attempting token refresh", { url });
      const newToken = await refreshAccessToken();
      if (newToken) {
        logger.info("[api/core] Token refreshed, retrying request", { url });
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
          logger.error("[api/core] Retry request failed", {
            url,
            status: retryResponse.status,
            data: retryData,
          });
          throw new ApiError(
            retryData.message || "API request failed",
            retryResponse.status,
            retryData.code,
          );
        }
        logger.info("[api/core] Retry request succeeded", { url });
        return retryData;
      }
      // Token refresh failed (e.g. logged out or session invalid) - expected, not an error
      logger.info("[api/core] Session invalid or logged out, not retrying", { url });
      throw new ApiError("Session expired", 401, "SESSION_EXPIRED");
    }

    // Check if response is actually JSON before parsing
    const contentType = response.headers.get("content-type");
    let data;
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      logger.error("[api/core] Non-JSON response received", {
        url,
        status: response.status,
        contentType,
        text: text.substring(0, 200),
      });
      throw new ApiError(
        `Server returned non-JSON response (${response.status}). Check if backend is running.`,
        response.status,
        "INVALID_RESPONSE",
      );
    }

    if (!response.ok) {
      logger.error("[api/core] API request failed", {
        url,
        status: response.status,
        data,
      });
      throw new ApiError(
        data.message || "API request failed",
        response.status,
        data.code,
      );
    }

    logger.info("[api/core] API request succeeded", { url, success: data.success });
    return data;
  } catch (error: any) {
    // Handle network errors
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const isLocalhost = apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1");
      
      logger.error("[api/core] Network error - request may not have reached server", {
        url,
        apiUrl,
        isLocalhost,
        error: error.message,
        message: "Check if backend is running and API_URL is correct",
      });
      
      let errorMessage = "Network error: Could not reach server.\n\n";
      if (isLocalhost) {
        errorMessage += "⚠️ iOS Simulator cannot reach 'localhost'.\n";
        errorMessage += "Please set EXPO_PUBLIC_API_URL in .env to your computer's IP address.\n";
        errorMessage += "Example: EXPO_PUBLIC_API_URL=http://192.168.1.5:3000\n";
        errorMessage += "Then restart Expo with: npx expo start -c";
      } else {
        errorMessage += "Please check:\n";
        errorMessage += "1. Backend is running (cd backend && npm run dev)\n";
        errorMessage += "2. API_URL is correct in .env\n";
        errorMessage += "3. Your device/simulator can reach the backend";
      }
      
      throw new ApiError(
        errorMessage,
        0,
        "NETWORK_ERROR",
      );
    }
    // Re-throw ApiError instances
    if (error instanceof ApiError) {
      throw error;
    }
    // Wrap other errors
    logger.error("[api/core] Unexpected error in API call", {
      url,
      error: error.message,
      stack: error.stack,
    });
    throw new ApiError(
      error.message || "An unexpected error occurred",
      undefined,
      "UNKNOWN_ERROR",
    );
  }
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
