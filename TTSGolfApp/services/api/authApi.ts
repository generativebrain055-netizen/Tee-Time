/**
 * Auth API - username/password sign in and sign up
 */
import { API_ENDPOINTS } from "../../config/api";
import { sessionManager } from "../../utils/sessionManager";
import { logger } from "../../utils/logger";

export interface AuthUser {
  id: string;
  phoneNumber?: string | null;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  handicap?: number | null;
  socialRate?: number | null;
  avatarUrl?: string | null;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterUsernameResponse {
  success: boolean;
  message?: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Sign in with username and password
 */
export async function loginWithUsernamePassword(
  username: string,
  password: string,
  rememberMe?: boolean
): Promise<{ success: true; user: AuthUser } | { success: false; error: string }> {
  try {
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password, rememberMe: rememberMe ?? false }),
    });
    const data = await response.json();

    if (!response.ok) {
      const message = data.message || "Sign in failed.";
      logger.warn("[authApi] Login failed", { status: response.status, message });
      return { success: false, error: message };
    }

    if (!data.success || !data.accessToken || !data.refreshToken || !data.user) {
      return { success: false, error: "Invalid response from server." };
    }

    await sessionManager.saveSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    return { success: true, user: data.user };
  } catch (err: any) {
    const message = err.message || "Cannot connect to server.";
    logger.error("[authApi] Login error", err);
    return { success: false, error: message };
  }
}

/**
 * Sign up with username and password (optional first name, last name, email)
 */
export async function registerWithUsernamePassword(params: {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}): Promise<{ success: true; user: AuthUser } | { success: false; error: string }> {
  try {
    const body: Record<string, string> = {
      username: params.username.trim(),
      password: params.password,
    };
    if (params.firstName?.trim()) body.firstName = params.firstName.trim();
    if (params.lastName?.trim()) body.lastName = params.lastName.trim();
    if (params.email?.trim()) body.email = params.email.trim();

    const response = await fetch(API_ENDPOINTS.REGISTER_USERNAME, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (!response.ok) {
      const message = data.message || "Sign up failed.";
      logger.warn("[authApi] Register failed", { status: response.status, message });
      return { success: false, error: message };
    }

    if (!data.success || !data.accessToken || !data.refreshToken || !data.user) {
      return { success: false, error: "Invalid response from server." };
    }

    await sessionManager.saveSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    return { success: true, user: data.user };
  } catch (err: any) {
    const message = err.message || "Cannot connect to server.";
    logger.error("[authApi] Register error", err);
    return { success: false, error: message };
  }
}
