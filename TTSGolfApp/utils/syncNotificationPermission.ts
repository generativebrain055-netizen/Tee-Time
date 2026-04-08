/**
 * Syncs iOS/Android notification permission to the backend so server-side push respects OS settings.
 * Stored as notification_preferences.systemPushEnabled (merged server-side).
 */

import * as Notifications from "expo-notifications";
import { profileApi } from "../services/api/profileApi";
import { logger } from "./logger";

export async function syncSystemPushPreferenceToBackend(granted: boolean): Promise<void> {
    try {
        await profileApi.updateNotificationPreferences({
            systemPushEnabled: granted,
        });
        logger.debug("[PushPrefs] systemPushEnabled synced", { granted });
    } catch (e) {
        logger.warn("[PushPrefs] syncSystemPushPreferenceToBackend failed (non-fatal)", e);
    }
}

/** Reads current OS permission and syncs boolean to profile. */
export async function syncSystemPushPreferenceFromOs(): Promise<void> {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        await syncSystemPushPreferenceToBackend(status === "granted");
    } catch (e) {
        logger.warn("[PushPrefs] syncSystemPushPreferenceFromOs failed (non-fatal)", e);
    }
}
