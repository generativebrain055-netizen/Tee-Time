import AsyncStorage from "@react-native-async-storage/async-storage";

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
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return false;

      const payload = JSON.parse(atob(tokenParts[1]));
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

      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return false;

      const payload = JSON.parse(atob(tokenParts[1]));
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
}

export const sessionManager = SessionManager.getInstance();
