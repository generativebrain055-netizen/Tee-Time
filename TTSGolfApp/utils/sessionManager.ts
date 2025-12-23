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

  // Check if user is logged in
  async isLoggedIn(): Promise<boolean> {
    const token = await AsyncStorage.getItem("accessToken");
    return !!token;
  }

  // Clear session
  async clearSession() {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
  }
}

export const sessionManager = SessionManager.getInstance();
