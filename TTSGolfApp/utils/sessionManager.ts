import AsyncStorage from "@react-native-async-storage/async-storage";
import { base64DecodeJSON } from "./base64";

type SessionExpiredCallback = () => void;

class SessionManager {
  private static instance: SessionManager;
  private onSessionExpiredCallback: SessionExpiredCallback | null = null;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Set callback to be called when session expires
  setOnSessionExpired(callback: SessionExpiredCallback) {
    this.onSessionExpiredCallback = callback;
  }

  // Call this when session expires
  async handleSessionExpired() {
    // Clear all auth data
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);

    // Trigger the callback to navigate to login
    if (this.onSessionExpiredCallback) {
      this.onSessionExpiredCallback();
    }
  }

  // Check if user is logged in with valid token
  async isLoggedIn(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) return false;

      // Decode JWT to check expiration
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) return false;

      const payload = base64DecodeJSON(tokenParts[1]);
      const currentTime = Math.floor(Date.now() / 1000);

      // Check if token is expired
      if (payload.exp && payload.exp < currentTime) {
        // Token expired, clear session
        await this.clearSession();
        return false;
      }

      return true;
    } catch (error) {
      console.error("Token validation error:", error);
      await this.clearSession();
      return false;
    }
  }

  // Validate token without clearing session
  async isTokenValid(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) return false;

      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) return false;

      const payload = base64DecodeJSON(tokenParts[1]);
      const currentTime = Math.floor(Date.now() / 1000);

      return !payload.exp || payload.exp >= currentTime;
    } catch (error) {
      return false;
    }
  }

  // Clear session
  async clearSession() {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
  }

  // Save session data
  async saveSession(data: {
    accessToken: string;
    refreshToken: string;
    user: any;
  }) {
    try {
      // Validate required fields
      if (!data.accessToken) {
        throw new Error("accessToken is required to save session");
      }
      if (!data.refreshToken) {
        throw new Error("refreshToken is required to save session");
      }
      if (!data.user) {
        throw new Error("user data is required to save session");
      }

      await AsyncStorage.setItem("accessToken", data.accessToken);
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
    } catch (error) {
      console.error("Error saving session:", error);
      throw error;
    }
  }

  // Get current user
  async getUser() {
    try {
      const userStr = await AsyncStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  }

  // Get access token
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem("accessToken");
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  }

  // Get refresh token
  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem("refreshToken");
    } catch (error) {
      console.error("Error getting refresh token:", error);
      return null;
    }
  }
}

export const sessionManager = SessionManager.getInstance();
