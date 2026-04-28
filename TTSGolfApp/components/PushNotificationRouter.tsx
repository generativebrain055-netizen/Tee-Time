/**
 * Handles OS push notification taps: routes to the same destinations as in-app notification rows.
 * Without this, opening the app from a push only restores the previous screen.
 */
import React, { useEffect, useRef, useCallback } from "react";
import { AppState, type AppStateStatus, InteractionManager } from "react-native";
import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useUser } from "../contexts";
import { logger } from "../utils/logger";
import {
  prepareNotificationDataForNavigation,
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

/** Total attempts with the same response (attempt index 0 .. MAX-1). */
const MAX_CONSUME_ATTEMPTS = 6;
const PAYLOAD_RETRY_DELAY_MS = 360;

export type PushNavigation = {
  navigate: NotificationNavigateFn;
};

type Props = {
  navigation: PushNavigation;
  /** Current root screen from App.tsx (custom stack). */
  currentScreen: string;
};

function titleSuggestsTeeInviteFromPush(title: string | null | undefined): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return (
    t.includes("tee time invitation") || t.includes("tee time invite") || t.includes("invitation to play")
  );
}

function titleSuggestsGroupOrFriend(title: string | null | undefined): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return t.includes("group invitation") || t.includes("friend");
}

type ConsumeResult = { didRoute: boolean; canRetry: boolean; rawKeyCount: number };

function consumeResponseWithHeuristicFallback(
  response: NotificationResponse,
  navigate: NotificationNavigateFn,
  attempt: number,
): ConsumeResult {
  const content = response.notification.request.content;
  const raw = content.data as Record<string, unknown> | undefined;
  const keyCount = raw && typeof raw === "object" ? Object.keys(raw).length : 0;
  if (!raw || typeof raw !== "object") {
    if (titleSuggestsTeeInviteFromPush(content.title) && !titleSuggestsGroupOrFriend(content.title)) {
      try {
        navigate("Invites");
        return { didRoute: true, canRetry: false, rawKeyCount: 0 };
      } catch (e) {
        logger.warn("[PushNotificationRouter] fallback Invites (no data) failed", e);
      }
    }
    return { didRoute: false, canRetry: attempt + 1 < MAX_CONSUME_ATTEMPTS, rawKeyCount: 0 };
  }

  const data = prepareNotificationDataForNavigation(raw);
  let didRoute: boolean;
  try {
    didRoute = navigateFromNotificationData(navigate, data);
  } catch (e) {
    logger.warn("[PushNotificationRouter] navigate failed", e);
    return { didRoute: false, canRetry: attempt + 1 < MAX_CONSUME_ATTEMPTS, rawKeyCount: keyCount };
  }
  if (didRoute) {
    return { didRoute: true, canRetry: false, rawKeyCount: keyCount };
  }

  if (titleSuggestsTeeInviteFromPush(content.title) && !titleSuggestsGroupOrFriend(content.title)) {
    try {
      navigate("Invites");
    } catch (e) {
      logger.warn("[PushNotificationRouter] fallback Invites failed", e);
    }
    return { didRoute: true, canRetry: false, rawKeyCount: keyCount };
  }

  if (keyCount > 0) {
    return { didRoute: false, canRetry: attempt + 1 < MAX_CONSUME_ATTEMPTS, rawKeyCount: keyCount };
  }
  return { didRoute: false, canRetry: attempt + 1 < MAX_CONSUME_ATTEMPTS, rawKeyCount: 0 };
}

function clearConsumedNotification(): void {
  void Notifications.clearLastNotificationResponseAsync();
}

export function PushNotificationRouter({ navigation, currentScreen }: Props) {
  const { profile } = useUser();
  const pendingRef = useRef<NotificationResponse | null>(null);
  const attemptRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationRef = useRef<PushNavigation>(navigation);
  navigationRef.current = navigation;
  const tryConsumeRef = useRef<() => void>(() => {});

  const clearPendingAndResponse = useCallback(() => {
    pendingRef.current = null;
    attemptRef.current = 0;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    clearConsumedNotification();
  }, []);

  const tryConsume = useCallback(() => {
    if (!profile?.id) return;
    if (BLOCKED_UNTIL_LOGGED_IN.has(currentScreen)) return;

    const response = pendingRef.current;
    if (!response) return;

    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      clearPendingAndResponse();
      return;
    }

    const navigate = navigationRef.current.navigate;
    const { didRoute, canRetry } = consumeResponseWithHeuristicFallback(
      response,
      navigate,
      attemptRef.current,
    );

    if (didRoute) {
      clearPendingAndResponse();
      return;
    }

    if (canRetry) {
      attemptRef.current += 1;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = null;
        void InteractionManager.runAfterInteractions(() => {
          tryConsumeRef.current();
        });
      }, PAYLOAD_RETRY_DELAY_MS);
      return;
    }

    clearPendingAndResponse();
  }, [profile?.id, currentScreen, clearPendingAndResponse]);

  tryConsumeRef.current = tryConsume;

  useEffect(() => {
    let alive = true;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!alive || !response) return;
      attemptRef.current = 0;
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
        attemptRef.current = 0;
        pendingRef.current = response;
        tryConsumeRef.current();
      },
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const onApp = (s: AppStateStatus) => {
      if (s === "active" && pendingRef.current) {
        attemptRef.current = 0;
        tryConsumeRef.current();
      }
    };
    const sub = AppState.addEventListener("change", onApp);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    tryConsume();
  }, [tryConsume]);

  return null;
}
