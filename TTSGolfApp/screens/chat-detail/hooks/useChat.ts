import { useState, useCallback, useEffect, useRef } from "react";
import { ScrollView } from "react-native";
import { messagesApi } from "../../../services/api";
import type { ChatMessage, ChatDetailState } from "../types";
import type { ChatInfo } from "../types";
import { logger } from "../../../utils/logger";

export const useChat = (chatInfo: ChatInfo | undefined) => {
  const [state, setState] = useState<ChatDetailState>({
    messageText: "",
    showMenu: false,
    messages: [],
    loading: true,
    currentUser: null,
  });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Resolve conversation and load messages
  useEffect(() => {
    if (!chatInfo) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true }));

        const params: {
          conversationId?: string;
          recipientId?: string;
          teeTimeId?: string;
          rosterGroupId?: string;
        } = {};
        if (chatInfo.conversationId) params.conversationId = chatInfo.conversationId;
        else if (chatInfo.recipientId) params.recipientId = chatInfo.recipientId;
        else if (chatInfo.teeTimeId) params.teeTimeId = chatInfo.teeTimeId;
        else if (chatInfo.groupId) params.rosterGroupId = chatInfo.groupId;

        const convRes = await messagesApi.getOrCreateConversation(params);
        if (cancelled || !convRes.success || !convRes.conversation) {
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const cid = convRes.conversation.id;
        setConversationId(cid);

        const msgRes = await messagesApi.getMessages(cid, { markRead: true });
        if (cancelled) return;
        const list = msgRes.success && msgRes.messages ? msgRes.messages : [];

        setState((prev) => ({
          ...prev,
          messages: list as ChatMessage[],
          loading: false,
        }));
      } catch (err) {
        if (!cancelled) {
          logger.warn("[useChat] Chat load error", err);
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    chatInfo?.conversationId,
    chatInfo?.recipientId,
    chatInfo?.teeTimeId,
    chatInfo?.groupId,
  ]);

  // Poll for new messages so the other person's messages appear without reopening
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const msgRes = await messagesApi.getMessages(conversationId);
        if (msgRes.success && msgRes.messages) {
          setState((prev) => {
            const prevIds = new Set(prev.messages.map((m) => m.id));
            const hasNew = msgRes.messages!.some((m) => !prevIds.has(m.id));
            if (!hasNew) return prev;
            return { ...prev, messages: msgRes.messages as ChatMessage[] };
          });
        }
      } catch {
        // ignore poll errors
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [state.messages]);

  const setMessageText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, messageText: text }));
  }, []);

  const appendToMessageText = useCallback((suffix: string) => {
    setState((prev) => ({ ...prev, messageText: prev.messageText + suffix }));
  }, []);

  const setShowMenu = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showMenu: show }));
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = state.messageText.trim();
    if (!trimmed || !conversationId) return;

    setState((prev) => ({ ...prev, messageText: "" }));

    try {
      const res = await messagesApi.sendMessage(conversationId, trimmed);
      if (res.success && res.message) {
        const m = res.message as ChatMessage;
        setState((prev) => ({ ...prev, messages: [...prev.messages, m] }));
      } else {
        setState((prev) => ({ ...prev, messageText: trimmed }));
      }
    } catch (err) {
      setState((prev) => ({ ...prev, messageText: trimmed }));
    }
  }, [state.messageText, conversationId]);

  const handleSendImage = useCallback(
    async (imageBase64: string, caption?: string) => {
      if (!conversationId) return;
      try {
        const res = await messagesApi.sendMessage(
          conversationId,
          caption?.trim() ?? "",
          imageBase64
        );
        if (res.success && res.message) {
          const m = res.message as ChatMessage;
          setState((prev) => ({ ...prev, messages: [...prev.messages, m] }));
        }
      } catch (err) {
        logger.warn("[useChat] Send image error", err);
      }
    },
    [conversationId]
  );

  const handleConvertToGroupMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return;
      try {
        const res = await messagesApi.convertToGroupMessage(conversationId, messageId);
        if (res.success && res.message) {
          const updated = res.message as ChatMessage;
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((m) => (m.id === messageId ? updated : m)),
          }));
        }
      } catch (err) {
        logger.warn("[useChat] Convert to group message error", err);
      }
    },
    [conversationId]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return;
      try {
        const res = await messagesApi.deleteMessage(conversationId, messageId);
        if (res.success) {
          setState((prev) => ({
            ...prev,
            messages: prev.messages.filter((m) => m.id !== messageId),
          }));
        }
      } catch (err) {
        logger.warn("[useChat] Delete message error", err);
        throw err; // So caller can show alert on 403
      }
    },
    [conversationId]
  );

  return {
    ...state,
    conversationId,
    scrollViewRef,
    setMessageText,
    appendToMessageText,
    setShowMenu,
    handleSend,
    handleSendImage,
    handleConvertToGroupMessage,
    handleDeleteMessage,
  };
};
