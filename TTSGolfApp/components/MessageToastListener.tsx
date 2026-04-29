/**
 * Polls conversations while the user is logged in and shows a toast
 * when new unread messages arrive in any unmuted conversation.
 *
 * Also exposes `useUnreadConversations` so the Notifications screen
 * can surface a "New Messages" section without a second network call.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useUser } from "../contexts";
import { useToast } from "../ui/feedback";
import { formatRelativeToastTime } from "../utils/formatting";
import { messagesApi } from "../services/api";
import type { ConversationListItem } from "../services/api/messagesApi";
import { logger } from "../utils/logger";
import {
  tryConsumeMessageToastSlot,
  clearMessageToastDedupeForUser,
} from "../utils/messageNotificationToastDedupe";

const POLL_INTERVAL_MS = 6_000;
const INITIAL_LOOKBACK_MS = 10 * 60 * 1000; // 10 min

// ---------------------------------------------------------------------------
// Context — shares unread conversations with consumers (e.g. NotificationsScreen)
// ---------------------------------------------------------------------------

interface MessageNotifContextValue {
  unreadConversations: ConversationListItem[];
  totalUnread: number;
}

const MessageNotifContext = createContext<MessageNotifContextValue>({
  unreadConversations: [],
  totalUnread: 0,
});

export function useUnreadConversations(): MessageNotifContextValue {
  return useContext(MessageNotifContext);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(s: string, max: number): string {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

// ---------------------------------------------------------------------------
// Provider + listener
// ---------------------------------------------------------------------------

export type MessageToastNavigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

interface Props {
  navigation: MessageToastNavigation;
  children?: ReactNode;
}

export function MessageToastListener({ navigation, children }: Props) {
  const { profile } = useUser();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // knownCounts[conversationId] = last seen unreadCount
  const knownCountsRef = useRef<Map<string, number>>(new Map());
  const hasSeededRef = useRef(false);
  const profileIdRef = useRef<string | null>(null);

  const [unreadConversations, setUnreadConversations] = useState<ConversationListItem[]>([]);

  const totalUnread = unreadConversations.reduce(
    (sum, c) => sum + (c.unreadCount ?? 0),
    0,
  );

  const poll = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const res = await messagesApi.listConversations();
      if (!res.success || !res.conversations) return;

      const list = res.conversations;

      // Update shared unread state
      const unread = list.filter((c) => !c.isMuted && (c.unreadCount ?? 0) > 0);
      setUnreadConversations(unread);

      if (!hasSeededRef.current) {
        // Seed known counts; only toast conversations updated recently
        list.forEach((c) => knownCountsRef.current.set(c.id, c.unreadCount ?? 0));
        hasSeededRef.current = true;

        // Surface recent unread conversations as toasts on first open
        const recentUnread = unread
          .filter((c) => {
            if (!c.lastMessage?.created_at) return false;
            const ms = new Date(c.lastMessage.created_at).getTime();
            return Number.isFinite(ms) && Date.now() - ms <= INITIAL_LOOKBACK_MS;
          })
          .sort((a, b) => {
            const ta = a.lastMessage?.created_at
              ? new Date(a.lastMessage.created_at).getTime()
              : 0;
            const tb = b.lastMessage?.created_at
              ? new Date(b.lastMessage.created_at).getTime()
              : 0;
            return tb - ta;
          });

        if (recentUnread.length > 0) {
          const top = recentUnread[0];
          if (!tryConsumeMessageToastSlot(top.id)) {
            return;
          }
          const extra = recentUnread.length - 1;
          const title = top.title || "New Message";
          const body = top.lastMessage?.body
            ? truncate(top.lastMessage.body, 100)
            : "";
          const suffix =
            extra > 0
              ? `\n+${extra} more conversation${extra > 1 ? "s" : ""}`
              : "";

          toastRef.current.show({
            title,
            message: body ? `${title}\n${body}${suffix}` : `${title}${suffix}`,
            type: "info",
            placement: "top",
            align: "right",
            duration: 6500,
            leadingIcon: "message",
            timestamp: top.lastMessage?.created_at
              ? formatRelativeToastTime(top.lastMessage.created_at)
              : undefined,
            action: {
              label: "View",
              onPress: () =>
                navigation.navigate("ChatDetail", {
                  chatInfo: {
                    conversationId: top.id,
                    recipientId: top.otherUserId ?? undefined,
                    id: top.id,
                    name: top.title,
                    subtitle: top.subtitle,
                    img: top.avatarUrl ?? undefined,
                    isGroup: top.type !== "direct",
                  },
                }),
            },
          });
        }
        return;
      }

      // Subsequent polls: detect new messages per conversation
      const newlyUnread: ConversationListItem[] = [];
      list.forEach((c) => {
        if (c.isMuted) return;
        const prev = knownCountsRef.current.get(c.id) ?? 0;
        const curr = c.unreadCount ?? 0;
        if (curr > prev) newlyUnread.push(c);
        knownCountsRef.current.set(c.id, curr);
      });

      if (newlyUnread.length === 0) return;

      // Sort by most recent last message
      newlyUnread.sort((a, b) => {
        const ta = a.lastMessage?.created_at
          ? new Date(a.lastMessage.created_at).getTime()
          : 0;
        const tb = b.lastMessage?.created_at
          ? new Date(b.lastMessage.created_at).getTime()
          : 0;
        return tb - ta;
      });

      const top = newlyUnread[0];
      if (!tryConsumeMessageToastSlot(top.id)) {
        return;
      }
      const extra = newlyUnread.length - 1;
      const title = top.title || "New Message";
      const body = top.lastMessage?.body
        ? truncate(top.lastMessage.body, 100)
        : "";
      const suffix =
        extra > 0
          ? `\n+${extra} more conversation${extra > 1 ? "s" : ""}`
          : "";

      toastRef.current.show({
        title,
        message: body ? `${title}\n${body}${suffix}` : `${title}${suffix}`,
        type: "info",
        placement: "top",
        align: "right",
        duration: 6500,
        leadingIcon: "message",
        timestamp: top.lastMessage?.created_at
          ? formatRelativeToastTime(top.lastMessage.created_at)
          : undefined,
        action: {
          label: "View",
          onPress: () =>
            navigation.navigate("ChatDetail", {
              chatInfo: {
                conversationId: top.id,
                recipientId: top.otherUserId ?? undefined,
                id: top.id,
                name: top.title,
                subtitle: top.subtitle,
                img: top.avatarUrl ?? undefined,
                isGroup: top.type !== "direct",
              },
            }),
        },
      });
    } catch (e) {
      logger.warn("[MessageToastListener] poll failed", e);
    }
  }, [profile?.id, navigation]);

  // Reset when user changes
  useEffect(() => {
    if (!profile?.id) {
      knownCountsRef.current.clear();
      hasSeededRef.current = false;
      profileIdRef.current = null;
      setUnreadConversations([]);
      clearMessageToastDedupeForUser();
      return;
    }
    if (profileIdRef.current !== profile.id) {
      knownCountsRef.current.clear();
      hasSeededRef.current = false;
      profileIdRef.current = profile.id;
    }
  }, [profile?.id]);

  // Start polling
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

  return (
    <MessageNotifContext.Provider value={{ unreadConversations, totalUnread }}>
      {children}
    </MessageNotifContext.Provider>
  );
}
