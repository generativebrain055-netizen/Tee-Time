import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "./logger";

const DEVICE_ID_KEY = "@teetime_device_id";

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  os: string;
  osVersion: string;
  appVersion: string;
  brand: string | null;
  modelName: string | null;
  isDevice: boolean;
}

/**
 * Generate a unique device identifier
 * Uses a combination of device info and a stored UUID
 */
const generateDeviceId = async (): Promise<string> => {
  try {
    // Check if we already have a stored device ID
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate new device ID based on device characteristics + random component
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substring(2, 15);
      const devicePart = [
        Device.brand || "unknown",
        Device.modelName || "unknown",
        Platform.OS,
        Platform.Version,
      ]
        .join("-")
        .replace(/[^a-zA-Z0-9-]/g, "");

      deviceId = `${devicePart}-${timestamp}-${randomPart}`;

      // Store for future use
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    logger.error("[deviceInfo] Error generating device ID", error);
    // Fallback to random ID
    return `fallback-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
};

/**
 * Get device type based on Device.deviceType
 */
const getDeviceType = (): string => {
  if (!Device.isDevice) return "Simulator";

  switch (Device.deviceType) {
    case Device.DeviceType.PHONE:
      return "Mobile";
    case Device.DeviceType.TABLET:
      return "Tablet";
    case Device.DeviceType.DESKTOP:
      return "Desktop";
    case Device.DeviceType.TV:
      return "TV";
    default:
      return "Unknown";
  }
};

/**
 * Get human-readable device name
 */
const getDeviceName = (): string => {
  const brand = Device.brand || "";
  const model = Device.modelName || "";

  if (Platform.OS === "ios") {
    return model || "iPhone";
  }

  if (brand && model) {
    return `${brand} ${model}`;
  }

  return model || brand || "Android Device";
};

/**
 * Get complete device information
 */
export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const deviceId = await generateDeviceId();

  return {
    deviceId,
    deviceName: getDeviceName(),
    deviceType: getDeviceType(),
    os: Platform.OS === "ios" ? "iOS" : "Android",
    osVersion: Platform.Version?.toString() || "",
    appVersion: Application.nativeApplicationVersion || "1.0.0",
    brand: Device.brand,
    modelName: Device.modelName,
    isDevice: Device.isDevice,
  };
};

/**
 * Get device info for API requests
 * Returns a simplified object for sending to backend
 */
export const getDeviceInfoForApi = async (): Promise<{
  deviceId: string;
  deviceName: string;
  deviceType: string;
  os: string;
  osVersion: string;
  appVersion: string;
}> => {
  const info = await getDeviceInfo();

  return {
    deviceId: info.deviceId,
    deviceName: info.deviceName,
    deviceType: info.deviceType,
    os: info.os,
    osVersion: info.osVersion,
    appVersion: info.appVersion,
  };
};

/**
 * Clear stored device ID (useful for testing or logout)
 */
export const clearDeviceId = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    logger.error("[deviceInfo] Error clearing device ID", error);
  }
};

export default {
  getDeviceInfo,
  getDeviceInfoForApi,
  clearDeviceId,
};
