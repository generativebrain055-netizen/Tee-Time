/**
 * OAuth Service
 * Handles all OAuth-related API calls with proper error handling
 */

import { API_URL } from "../config/api";
import type {
  OAuthResponse,
  ProfileCompletionPayload,
  ProfileCompletionResponse,
  AppleSignInRequest,
} from "../types/oauth";

// ============================================================================
// Error Classes
// ============================================================================

export class OAuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

export class NetworkError extends OAuthError {
  constructor(message = "Network request failed") {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

// ============================================================================
// API Client
// ============================================================================

const apiClient = {
  async post<T>(endpoint: string, body: object, token?: string): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      // Handle non-JSON responses
      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        throw new OAuthError(
          "Invalid response from server",
          undefined,
          response.status,
        );
      }

      if (!response.ok) {
        throw new OAuthError(
          data.error || data.message || "Request failed",
          data.code,
          response.status,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new NetworkError();
      }
      throw new OAuthError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  },
};

// ============================================================================
// OAuth Service Methods
// ============================================================================

/**
 * Sign in with Google OAuth (ID Token flow)
 */
export async function signInWithGoogle(
  idToken: string,
): Promise<OAuthResponse> {
  return apiClient.post<OAuthResponse>("/auth/google", { idToken });
}


/**
 * Sign in with Apple OAuth
 */
export async function signInWithApple(
  request: AppleSignInRequest,
): Promise<OAuthResponse> {
  return apiClient.post<OAuthResponse>("/auth/apple", request);
}

/**
 * Complete OAuth profile with additional information
 */
export async function completeOAuthProfile(
  payload: ProfileCompletionPayload,
  accessToken: string,
): Promise<ProfileCompletionResponse> {
  return apiClient.post<ProfileCompletionResponse>(
    "/auth/complete-profile",
    payload,
    accessToken,
  );
}

/**
 * Verify phone number and complete OAuth signup (new users)
 */
export async function verifyPhoneAndCompleteSignup(params: {
  pendingToken: string;
  phoneNumber: string;
  verificationCode: string;
  countryCode: string;
  firstName: string;
  lastName: string;
}): Promise<OAuthResponse> {
  return apiClient.post<OAuthResponse>("/auth/oauth/verify-phone", params);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an error is a user cancellation
 */
export function isUserCancellation(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code: string }).code === "ERR_REQUEST_CANCELED";
  }
  return false;
}

/**
 * Format OAuth error for user display
 */
export function formatOAuthError(error: unknown): string {
  if (error instanceof OAuthError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
}

// ============================================================================
// Default Export
// ============================================================================

export const oauthService = {
  signInWithGoogle,
  signInWithApple,
  completeOAuthProfile,
  verifyPhoneAndCompleteSignup,
  isUserCancellation,
  formatOAuthError,
};

export default oauthService;
