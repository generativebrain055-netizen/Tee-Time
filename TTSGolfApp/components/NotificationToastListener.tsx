/**
 * Polls in-app notifications while the user is logged in and shows a toast when
 * new notification rows appear (Figma: banner on received events).
 */
import React, { useEffect, useRef, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useUser } from "../contexts";
import { useToast } from "../ui/feedback";
import { notificationApi } from "../services/api";
import { logger } from "../utils/logger";

const POLL_INTERVAL_MS = 15_000;

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

  const poll = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const res = await notificationApi.getNotifications({ limit: 40 });
      if (!res.success || !res.notifications) return;

      const list = res.notifications;

      if (!hasSeededRef.current) {
        list.forEach((n) => knownIdsRef.current.add(n.id));
        hasSeededRef.current = true;
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
      let message: string;
      if (extra > 0) {
        message = `${title}\n${truncate(body, 90)}\n+${extra} more notification${extra > 1 ? "s" : ""}`;
      } else {
        message = body ? `${title}\n${truncate(body, 140)}` : title;
      }

      const t = toastRef.current;
      t.dismiss();
      t.show({
        message,
        type: "info",
        duration: Math.min(9000, 4500 + extra * 400),
        action: {
          label: "View",
          onPress: () => {
            t.dismiss();
            navigation.navigate("Notifications");
          },
        },
      });
    } catch (e) {
      logger.warn("[NotificationToastListener] poll failed", e);
    }
  }, [profile?.id, navigation]);

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

  return null;
}
