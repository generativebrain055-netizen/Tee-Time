import { useState, useCallback } from "react";
import { API_ENDPOINTS } from "../config/api";

/**
 * Custom hook for handling authentication logic
 * Separates business logic from UI components
 */
export const useAuth = (navigation) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const clearMessages = useCallback(() => {
    setError("");
    setStatus("");
  }, []);

  /**
   * Request OTP for phone verification
   */
  const requestOtp = useCallback(
    async (phoneNumber, purpose = "signup") => {
      setLoading(true);
      clearMessages();

      try {
        const response = await fetch(API_ENDPOINTS.REQUEST_OTP, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber, purpose }),
        });

        const data = await response.json();

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
        const errorMessage = err.message || "Unable to send OTP.";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [clearMessages]
  );

  /**
   * Verify OTP code (for login - existing users only)
   */
  const verifyOtp = useCallback(
    async (phoneNumber, otpCode) => {
      setLoading(true);
      clearMessages();

      try {
        // Ensure OTP is numeric and 6 digits
        const cleanOtp = otpCode.trim().replace(/\D/g, "");
        if (cleanOtp.length !== 6) {
          throw new Error("OTP must be exactly 6 digits");
        }

        console.log("🔍 [FRONTEND] Verifying OTP for LOGIN:", {
          phoneNumber,
          originalOtp: otpCode,
          cleanOtp,
          otpLength: cleanOtp.length,
        });

        const requestBody = { phoneNumber, otp: cleanOtp, purpose: "login" };
        console.log(
          "📤 [FRONTEND] Sending request:",
          JSON.stringify(requestBody, null, 2)
        );

        const response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log("📥 [FRONTEND] Response received:", {
          status: response.status,
          ok: response.ok,
          data,
        });

        if (!response.ok) {
          throw new Error(data.message || "Unable to verify OTP.");
        }

        setStatus("OTP verified. Logging you in...");

        // Navigate after brief delay
        setTimeout(() => {
          navigation?.navigate("Home", { user: data.user });
        }, 500);

        return { success: true, user: data.user };
      } catch (err) {
        setError(err.message || "Unable to verify OTP.");
        return { success: false };
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
    async (username, password) => {
      setLoading(true);
      clearMessages();

      try {
        const response = await fetch(API_ENDPOINTS.LOGIN, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim().toLowerCase(),
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Login failed.");
        }

        setStatus("Login successful!");

        // Navigate after brief delay
        setTimeout(() => {
          navigation?.navigate("Home", { user: data.user });
        }, 500);

        return { success: true, user: data.user };
      } catch (err) {
        setError(err.message || "Login failed.");
        return { success: false };
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
    async (userData, otpCode) => {
      setLoading(true);
      clearMessages();

      try {
        // Ensure OTP is numeric and 6 digits
        const cleanOtp = otpCode.trim().replace(/\D/g, "");
        if (cleanOtp.length !== 6) {
          throw new Error("OTP must be exactly 6 digits");
        }

        const response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: userData.phoneNumber,
            otp: cleanOtp,
            firstName: userData.firstName,
            lastName: userData.lastName,
            username: userData.username,
            handicap: userData.handicap,
            password: userData.password,
          }),
        });

        const data = await response.json();

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

        // Navigate after brief delay
        setTimeout(() => {
          navigation?.navigate("Home", { user: data.user });
        }, 500);

        return { success: true, user: data.user };
      } catch (err) {
        setError(err.message || "Registration failed.");
        return { success: false };
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
