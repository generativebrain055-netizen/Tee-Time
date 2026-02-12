/**
 * Auth hook: session, credentials login, and registration.
 * Phone verification for sign-up/sign-in must be performed via magic link (SMS link),
 * not OTP/code. Use requestSmsMagicLink/requestSmsMagicLinkForLogin and verifySmsMagicLink
 * from utils/smsMagicLink (or the login/onboarding flows that use them).
 */
import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ENDPOINTS } from "../config/api";
import { getDeviceInfoForApi } from "../utils/deviceInfo";
import { logger } from "../utils/logger";

type DeviceApiInfo = {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  os: string;
  osVersion: string;
  appVersion: string;
};

type ScreenName =
  | "Splash"
  | "Welcome"
  | "Login"
  | "Signup"
  | "Onboarding"
  | "HomePage"
  | "Home";

interface Navigation {
  navigate: (screen: ScreenName, params?: any) => void;
  replace: (screen: ScreenName, params?: any) => void;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username?: string;
  phoneNumber: string;
  handicap?: number | null;
  socialRate?: number;
}

interface UserRegistrationData {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  username: string;
  handicap?: string;
  password: string;
}

interface OtpRequestResult {
  success: boolean;
  resendAfterSeconds?: number;
  error?: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

interface UseAuthReturn {
  loading: boolean;
  error: string;
  status: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
  clearMessages: () => void;
  /** @deprecated Phone verification must use magic link (SMS link). Use utils/smsMagicLink instead. */
  requestOtp: (
    phoneNumber: string,
    purpose?: string
  ) => Promise<OtpRequestResult>;
  /** @deprecated Phone verification must use magic link (SMS link). Use utils/smsMagicLink instead. */
  verifyOtp: (phoneNumber: string, otpCode: string) => Promise<AuthResult>;
  loginWithCredentials: (
    username: string,
    password: string
  ) => Promise<AuthResult>;
  registerUser: (
    userData: UserRegistrationData,
    otpCode: string
  ) => Promise<AuthResult>;
}

/**
 * Custom hook for handling authentication logic
 * Separates business logic from UI components
 */
export const useAuth = (navigation?: Navigation): UseAuthReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const deviceInfoRef = useRef<DeviceApiInfo | null>(null);

  // Load device info once on mount
  useEffect(() => {
    const loadDeviceInfo = async (): Promise<void> => {
      try {
        const info = await getDeviceInfoForApi();
        deviceInfoRef.current = info;
        logger.debug("[useAuth] Device info loaded", { deviceName: info.deviceName });
      } catch (err) {
        logger.error("[useAuth] Failed to load device info", err);
      }
    };
    loadDeviceInfo();
  }, []);

  const clearMessages = useCallback((): void => {
    setError("");
    setStatus("");
  }, []);

  /**
   * Request OTP for phone verification.
   * @deprecated Phone verification must use magic link (SMS link). Use requestSmsMagicLink/requestSmsMagicLinkForLogin from utils/smsMagicLink.
   */
  const requestOtp = useCallback(
    async (
      phoneNumber: string,
      purpose = "signup"
    ): Promise<OtpRequestResult> => {
      setLoading(true);
      clearMessages();

      try {
        const deviceInfo = deviceInfoRef.current;
        logger.debug("[useAuth] Requesting OTP with device", { deviceName: deviceInfo?.deviceName });

        const response = await fetch(API_ENDPOINTS.REQUEST_OTP, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(deviceInfo && {
              "X-Device-Id": deviceInfo.deviceId,
              "X-Device-Name": deviceInfo.deviceName,
              "X-Device-Type": deviceInfo.deviceType,
              "X-Device-OS": `${deviceInfo.os} ${deviceInfo.osVersion}`,
              "X-App-Version": deviceInfo.appVersion,
            }),
          },
          body: JSON.stringify({
            phoneNumber,
            purpose,
            deviceInfo: deviceInfo || undefined,
          }),
        });

        // Handle non-JSON responses
        let data;
        try {
          const responseText = await response.text();
          data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          throw new Error("Invalid response from server. Please try again.");
        }

        if (!response.ok) {
          const errorMsg = data.message || "Unable to send OTP.";
          throw new Error(errorMsg);
        }

        setStatus(data.message || "OTP sent successfully.");
        return {
          success: true,
          resendAfterSeconds: data.resendAfterSeconds || 30,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unable to send OTP.";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [clearMessages]
  );

  /**
   * Verify OTP code (for login - existing users only).
   * @deprecated Phone verification must use magic link. Use verifySmsMagicLink from utils/smsMagicLink.
   */
  const verifyOtp = useCallback(
    async (phoneNumber: string, otpCode: string): Promise<AuthResult> => {
      setLoading(true);
      clearMessages();

      try {
        // Ensure OTP is numeric and 6 digits
        const cleanOtp = otpCode.trim().replace(/\D/g, "");
        if (cleanOtp.length !== 6) {
          throw new Error("OTP must be exactly 6 digits");
        }

        const deviceInfo = deviceInfoRef.current;
        logger.debug("[useAuth] Verifying OTP for LOGIN", {
          phoneNumber,
          originalOtp: otpCode,
          cleanOtp,
          otpLength: cleanOtp.length,
          device: deviceInfo?.deviceName,
        });

        const requestBody = {
          phoneNumber,
          otp: cleanOtp,
          purpose: "login",
          deviceInfo: deviceInfo || undefined,
        };
        logger.debug("[useAuth] Sending request", requestBody);

        const response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(deviceInfo && {
              "X-Device-Id": deviceInfo.deviceId,
              "X-Device-Name": deviceInfo.deviceName,
              "X-Device-Type": deviceInfo.deviceType,
              "X-Device-OS": `${deviceInfo.os} ${deviceInfo.osVersion}`,
              "X-App-Version": deviceInfo.appVersion,
            }),
          },
          body: JSON.stringify(requestBody),
        });

        // Handle non-JSON responses
        let data;
        try {
          const responseText = await response.text();
          data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          throw new Error("Invalid response from server. Please try again.");
        }
        logger.debug("[useAuth] Response received", {
          status: response.status,
          ok: response.ok,
          data,
        });

        if (!response.ok) {
          throw new Error(data.message || "Unable to verify OTP.");
        }

        setStatus("OTP verified. Logging you in...");

        // Store tokens
        if (data.accessToken) {
          await AsyncStorage.setItem("accessToken", data.accessToken);
        }
        if (data.refreshToken) {
          await AsyncStorage.setItem("refreshToken", data.refreshToken);
        }
        if (data.user) {
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
        }

        // Navigate after brief delay
        setTimeout(() => {
          navigation?.navigate("Home", { user: data.user });
        }, 500);

        return { success: true, user: data.user };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unable to verify OTP.";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [navigation, clearMessages]
  );

  /**
   * Login with username and password
   */
  const loginWithCredentials = useCallback(
    async (username: string, password: string): Promise<AuthResult> => {
      setLoading(true);
      clearMessages();

      try {
        const deviceInfo = deviceInfoRef.current;
        logger.debug("[useAuth] Logging in with device", { deviceName: deviceInfo?.deviceName });

        const response = await fetch(API_ENDPOINTS.LOGIN, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(deviceInfo && {
              "X-Device-Id": deviceInfo.deviceId,
              "X-Device-Name": deviceInfo.deviceName,
              "X-Device-Type": deviceInfo.deviceType,
              "X-Device-OS": `${deviceInfo.os} ${deviceInfo.osVersion}`,
              "X-App-Version": deviceInfo.appVersion,
            }),
          },
          body: JSON.stringify({
            username: username.trim().toLowerCase(),
            password,
            deviceInfo: deviceInfo || undefined,
          }),
        });

        // Handle non-JSON responses
        let data;
        try {
          const responseText = await response.text();
          data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          throw new Error("Invalid response from server. Please try again.");
        }

        if (!response.ok) {
          throw new Error(data.message || "Login failed.");
        }

        setStatus("Login successful!");

        // Store tokens
        if (data.accessToken) {
          await AsyncStorage.setItem("accessToken", data.accessToken);
        }
        if (data.refreshToken) {
          await AsyncStorage.setItem("refreshToken", data.refreshToken);
        }
        if (data.user) {
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
        }

        // Navigate after brief delay
        setTimeout(() => {
          navigation?.navigate("Home", { user: data.user });
        }, 500);

        return { success: true, user: data.user };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Login failed.";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [navigation, clearMessages]
  );

  /**
   * Register new user with OTP verification
   */
  const registerUser = useCallback(
    async (
      userData: UserRegistrationData,
      otpCode: string
    ): Promise<AuthResult> => {
      setLoading(true);
      clearMessages();

      try {
        // Ensure OTP is numeric and 6 digits
        const cleanOtp = otpCode.trim().replace(/\D/g, "");
        if (cleanOtp.length !== 6) {
          throw new Error("OTP must be exactly 6 digits");
        }

        const deviceInfo = deviceInfoRef.current;
        logger.debug("[useAuth] Registering user with device", { deviceName: deviceInfo?.deviceName });

        const response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(deviceInfo && {
              "X-Device-Id": deviceInfo.deviceId,
              "X-Device-Name": deviceInfo.deviceName,
              "X-Device-Type": deviceInfo.deviceType,
              "X-Device-OS": `${deviceInfo.os} ${deviceInfo.osVersion}`,
              "X-App-Version": deviceInfo.appVersion,
            }),
          },
          body: JSON.stringify({
            phoneNumber: userData.phoneNumber,
            otp: cleanOtp,
            firstName: userData.firstName,
            lastName: userData.lastName,
            username: userData.username,
            handicap: userData.handicap,
            password: userData.password,
            deviceInfo: deviceInfo || undefined,
          }),
        });

        // Handle non-JSON responses
        let data;
        try {
          const responseText = await response.text();
          data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          throw new Error("Invalid response from server. Please try again.");
        }

        if (!response.ok || !data.success) {
          let errorMessage = "Verification failed";
          if (data.message) {
            if (data.message.includes("expired")) {
              errorMessage = "OTP has expired. Please request a new one.";
            } else if (
              data.message.includes("invalid") ||
              data.message.includes("Invalid")
            ) {
              errorMessage = "The OTP you entered is incorrect.";
            } else if (data.message.includes("attempts")) {
              errorMessage =
                "Too many failed attempts. Please request a new OTP.";
            } else {
              errorMessage = data.message;
            }
          }
          throw new Error(errorMessage);
        }

        setStatus("Account created successfully!");

        // Store tokens
        if (data.accessToken) {
          await AsyncStorage.setItem("accessToken", data.accessToken);
        }
        if (data.refreshToken) {
          await AsyncStorage.setItem("refreshToken", data.refreshToken);
        }
        if (data.user) {
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
        }

        // Navigate after brief delay
        setTimeout(() => {
          navigation?.navigate("Home", { user: data.user });
        }, 500);

        return { success: true, user: data.user };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Registration failed.";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [navigation, clearMessages]
  );

  return {
    loading,
    error,
    status,
    setError,
    setStatus,
    clearMessages,
    requestOtp,
    verifyOtp,
    loginWithCredentials,
    registerUser,
  };
};

export default useAuth;
