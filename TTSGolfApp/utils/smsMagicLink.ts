/**
 * SMS Magic Link - sends verification link via SMS (not OTP code)
 * User taps link in SMS → opens app → verification complete
 */
import { API_ENDPOINTS } from "../config/api";
import { getDeviceInfoForApi } from "./deviceInfo";

export interface RequestSmsMagicLinkResult {
  success: boolean;
  error?: string;
}

export interface VerifySmsMagicLinkResult {
  success: boolean;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
  phoneNumber?: string;
}

export async function requestSmsMagicLink(
  phoneNumber: string,
  userData?: { email?: string; [key: string]: unknown }
): Promise<RequestSmsMagicLinkResult> {
  try {
    const deviceInfo = await getDeviceInfoForApi();
    const response = await fetch(API_ENDPOINTS.REQUEST_SMS_MAGIC_LINK, {
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
        userData: userData || undefined,
        deviceInfo: deviceInfo || undefined,
      }),
    });

    let data;
    try {
      const responseText = await response.text();
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("Invalid response from server.");
    }

    if (!response.ok) {
      throw new Error(data.message || "Unable to send verification link.");
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unable to send verification link.";
    return { success: false, error: msg };
  }
}

export async function requestSmsMagicLinkForLogin(
  phoneNumber: string
): Promise<RequestSmsMagicLinkResult> {
  try {
    const deviceInfo = await getDeviceInfoForApi();
    const response = await fetch(API_ENDPOINTS.REQUEST_SMS_MAGIC_LINK_LOGIN, {
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
        deviceInfo: deviceInfo || undefined,
      }),
    });

    let data;
    try {
      const responseText = await response.text();
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("Invalid response from server.");
    }

    if (!response.ok) {
      const msg =
        data?.error?.details?.phoneNumber ||
        data?.error?.message ||
        data?.message ||
        "Unable to send sign-in link.";
      throw new Error(msg);
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unable to send sign-in link.";
    return { success: false, error: msg };
  }
}

export async function verifySmsMagicLink(
  token: string
): Promise<VerifySmsMagicLinkResult> {
  try {
    const deviceInfo = await getDeviceInfoForApi();
    const response = await fetch(API_ENDPOINTS.VERIFY_SMS_MAGIC_LINK, {
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
      body: JSON.stringify({ token }),
    });

    let data;
    try {
      const responseText = await response.text();
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("Invalid response from server.");
    }

    if (!response.ok) {
      throw new Error(data.message || "Unable to verify link.");
    }

    // For signup flow, backend returns phoneNumber only (no tokens yet)
    // For login flow, backend returns accessToken, refreshToken, and user
    return {
      success: true,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      phoneNumber: data.phoneNumber, // Present for signup flow
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unable to verify link.";
    return { success: false, error: msg };
  }
}

/** Mask phone for display: +1 *** *** 1234 */
export function maskPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  const last4 = digits.slice(-4);
  const prefix = digits.length > 10 ? `+${digits.slice(0, -10)} ` : "+1 ";
  return `${prefix}*** *** ${last4}`;
}
