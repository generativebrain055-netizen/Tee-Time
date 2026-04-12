/**
 * Handles OS push notification taps: routes to the same destinations as in-app notification rows.
 * Without this, opening the app from a push only restores the previous screen.
 */
import React, { useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useUser } from "../contexts";
import { logger } from "../utils/logger";
import {
  normalizePushNotificationData,
  navigateFromNotificationData,
  type NotificationNavigateFn,
} from "../utils/navigateFromNotificationData";

const BLOCKED_UNTIL_LOGGED_IN = new Set<string>([
  "Splash",
  "Welcome",
  "Login",
  "Onboarding",
  "OAuthOnboarding",
  "OAuthPhoneEntry",
  "OAuthMagicLinkVerification",
  "OAuthProfileCompletion",
  "AvailabilityOnboarding",
]);

export type PushNavigation = {
  navigate: NotificationNavigateFn;
};

type Props = {
  navigation: PushNavigation;
  /** Current root screen from App.tsx (custom stack). */
  currentScreen: string;
};

export function PushNotificationRouter({ navigation, currentScreen }: Props) {
  const { profile } = useUser();
  const pendingRef = useRef<NotificationResponse | null>(null);
  const tryConsumeRef = useRef<() => void>(() => {});

  const tryConsume = useCallback(() => {
    if (!profile?.id) return;
    if (BLOCKED_UNTIL_LOGGED_IN.has(currentScreen)) return;

    const response = pendingRef.current;
    if (!response) return;

    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      pendingRef.current = null;
      return;
    }

    const raw = response.notification.request.content
      .data as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== "object") {
      pendingRef.current = null;
      void Notifications.clearLastNotificationResponseAsync();
      return;
    }

    const data = normalizePushNotificationData(raw);
    pendingRef.current = null;

    try {
      navigateFromNotificationData(navigation.navigate, data);
    } catch (e) {
      logger.warn("[PushNotificationRouter] navigate failed", e);
    }
    void Notifications.clearLastNotificationResponseAsync();
  }, [profile?.id, currentScreen, navigation]);

  tryConsumeRef.current = tryConsume;

  useEffect(() => {
    let alive = true;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!alive || !response) return;
      pendingRef.current = response;
      tryConsumeRef.current();
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        pendingRef.current = response;
        tryConsumeRef.current();
      },
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    tryConsume();
  }, [tryConsume]);

  return null;
}
