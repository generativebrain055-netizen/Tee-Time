/**
 * Register device push token with backend so admin broadcast and in-app push work.
 * Uses Expo Push (ExponentPushToken) which is delivered via FCM on Android and APNs on iOS.
 */

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notificationApi } from "../services/api/notificationApi";
import { logger } from "./logger";
import { syncSystemPushPreferenceToBackend } from "./syncNotificationPermission";

const PUSH_TOKEN_REGISTERED_KEY = "push_token_registered_v1";

/**
 * Request permission and get Expo push token; register with backend if user is logged in.
 * Safe to call multiple times; will re-register if token changes.
 */
export async function registerPushTokenIfNeeded(): Promise<void> {
  try {
    const accessToken = await AsyncStorage.getItem("accessToken");
    if (!accessToken) return;

    if (!Device.isDevice) {
      logger.debug("[PushToken] Skipping push registration on simulator/emulator");
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (existingStatus !== "granted") {
      const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
      status = requestedStatus;
    }
    if (status !== "granted") {
      logger.debug("[PushToken] Notification permission not granted");
      await syncSystemPushPreferenceToBackend(false);
      return;
    }

    await syncSystemPushPreferenceToBackend(true);

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      logger.warn("[PushToken] No EAS projectId; cannot get Expo push token");
      return;
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const pushToken = pushTokenData?.data;
    if (!pushToken) {
      logger.warn("[PushToken] Failed to get Expo push token");
      return;
    }

    await notificationApi.registerPushToken(pushToken, "expo");
    await AsyncStorage.setItem(PUSH_TOKEN_REGISTERED_KEY, pushToken);
    logger.info("[PushToken] Registered with backend for broadcast and in-app push");
  } catch (e) {
    logger.warn("[PushToken] Registration failed (non-fatal)", e);
  }
}
