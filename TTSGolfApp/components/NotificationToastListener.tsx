/**
 * Polls in-app notifications while the user is logged in and shows a toast when
 * new notification rows appear (Figma: banner on received events).
 */
import React, { useEffect, useRef, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { useUser } from "../contexts";
import { useToast, type ToastLeadingIcon } from "../ui/feedback";
import { notificationApi } from "../services/api";
import { logger } from "../utils/logger";
import { formatRelativeToastTime } from "../utils/formatting";
import {
  prepareNotificationDataForNavigation,
  navigateFromNotificationData,
} from "../utils/navigateFromNotificationData";

function leadingIconForNotificationKind(kind?: string): ToastLeadingIcon {
  if (!kind) return "bell";
  if (
    kind === "tee_time_invite" ||
    kind === "tee_time_response" ||
    kind === "check_in_reminder" ||
    kind === "spot_opened" ||
    kind === "tee_time_not_filled" ||
    kind === "organizer_fill_warning" ||
    kind === "organizer_invite_more" ||
    kind === "roster_exhausted"
  ) {
    return "calendar";
  }
  if (kind === "friend_request" || kind === "friend_accepted") return "user";
  if (
    kind === "roster_add" ||
    kind === "roster_removed" ||
    kind === "group_updated" ||
    kind === "group_deleted" ||
    kind === "on_deck_added" ||
    kind === "on_deck_removed"
  ) {
    return "users";
  }
  return "bell";
}

const POLL_INTERVAL_MS = 15_000;
const INITIAL_TOAST_LOOKBACK_MS = 15 * 60 * 1000;

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export type NotificationToastNavigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

export function NotificationToastListener({
  navigation,
}: {
  navigation: NotificationToastNavigation;
}) {
  const { profile } = useUser();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const knownIdsRef = useRef<Set<string>>(new Set());
  const hasSeededRef = useRef(false);
  const profileIdRef = useRef<string | null>(null);

  const getToastType = useCallback((kind?: string): "info" | "success" | "warning" | "error" => {
    if (!kind) return "info";
    if (
      kind === "tee_time_not_filled" ||
      kind === "organizer_fill_warning" ||
      kind === "organizer_invite_more" ||
      kind === "roster_exhausted"
    ) {
      return "warning";
    }
    if (kind === "no_show" || kind === "group_deleted") return "error";
    if (kind === "friend_accepted" || kind === "roster_add" || kind === "on_deck_added") return "success";
    return "info";
  }, []);

  const showNotificationToast = useCallback(
    (
      title: string,
      body: string,
      type: "info" | "success" | "warning" | "error",
      opts?: { kind?: string; createdAt?: string; navData?: Record<string, unknown> },
    ) => {
      const t = toastRef.current;
      const kind = opts?.kind;
      const createdAt = opts?.createdAt;
      const navData = opts?.navData;
      t.show({
        title,
        message: body ? `${title}\n${truncate(body, 160)}` : title,
        type,
        placement: "top",
        align: "right",
        duration: 6500,
        leadingIcon: leadingIconForNotificationKind(kind),
        timestamp: createdAt ? formatRelativeToastTime(createdAt) : undefined,
        action: {
          label: "View",
          onPress: () => {
            if (navData && typeof navData === "object") {
              const prepared = prepareNotificationDataForNavigation(navData);
              const didRoute = navigateFromNotificationData(
                navigation.navigate.bind(navigation),
                prepared,
              );
              if (didRoute) return;
            }
            navigation.navigate("Notifications");
          },
        },
      });
    },
    [navigation],
  );

  const poll = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const res = await notificationApi.getNotifications({ limit: 40 });
      if (!res.success || !res.notifications) return;

      const list = res.notifications;

      if (!hasSeededRef.current) {
        const recentUnread = list
          .filter((n) => !n.isRead)
          .filter((n) => {
            const createdAtMs = new Date(n.createdAt).getTime();
            return (
              Number.isFinite(createdAtMs) &&
              Date.now() - createdAtMs <= INITIAL_TOAST_LOOKBACK_MS
            );
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

        list.forEach((n) => knownIdsRef.current.add(n.id));
        hasSeededRef.current = true;

        // On first sync after app open/login, surface recent unread notifications of any type.
        if (recentUnread.length > 0) {
          const latest = recentUnread[0];
          const extra = recentUnread.length - 1;
          const title = latest.title?.trim() || "Notification";
          const body = latest.body?.trim() || "";
          const summaryBody =
            extra > 0
              ? `${truncate(body, 90)}\n+${extra} more notification${extra > 1 ? "s" : ""}`
              : body;
          showNotificationToast(title, summaryBody, getToastType(latest.data?.type), {
            kind: latest.data?.type,
            createdAt: latest.createdAt,
            navData: (latest.data || {}) as Record<string, unknown>,
          });
        }
        return;
      }

      const newOnes = list.filter((n) => !knownIdsRef.current.has(n.id));
      if (newOnes.length === 0) return;

      newOnes.forEach((n) => knownIdsRef.current.add(n.id));

      const sorted = [...newOnes].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const latest = sorted[0];
      const extra = sorted.length - 1;

      const title = latest.title?.trim() || "Notification";
      const body = latest.body?.trim() || "";
      const summaryBody =
        extra > 0
          ? `${truncate(body, 90)}\n+${extra} more notification${extra > 1 ? "s" : ""}`
          : body;
      showNotificationToast(title, summaryBody, getToastType(latest.data?.type), {
        kind: latest.data?.type,
        createdAt: latest.createdAt,
        navData: (latest.data || {}) as Record<string, unknown>,
      });
    } catch (e) {
      logger.warn("[NotificationToastListener] poll failed", e);
    }
  }, [profile?.id, showNotificationToast, getToastType]);

  useEffect(() => {
    if (!profile?.id) {
      knownIdsRef.current.clear();
      hasSeededRef.current = false;
      profileIdRef.current = null;
      return;
    }
    if (profileIdRef.current !== profile.id) {
      knownIdsRef.current.clear();
      hasSeededRef.current = false;
      profileIdRef.current = profile.id;
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    let alive = true;
    const run = () => {
      if (alive) void poll();
    };

    run();
    const interval = setInterval(run, POLL_INTERVAL_MS);
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") run();
    });

    return () => {
      alive = false;
      clearInterval(interval);
      sub.remove();
    };
  }, [profile?.id, poll]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((event) => {
      if (!profile?.id) return;
      const content = event.request.content;
      const data = (content.data || {}) as Record<string, unknown>;
      const kind = typeof data.type === "string" ? data.type : undefined;
      const title = (content.title || "Notification").trim();
      const body = (content.body || "").trim();
      showNotificationToast(title, body, getToastType(kind), {
        kind,
        navData: data,
      });
    });
    return () => sub.remove();
  }, [profile?.id, getToastType, showNotificationToast]);

  return null;
}
