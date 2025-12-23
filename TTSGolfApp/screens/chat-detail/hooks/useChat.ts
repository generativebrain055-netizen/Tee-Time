import { useState, useCallback, useEffect, useRef } from "react";
import { ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChatMessage, CurrentUser, ChatDetailState } from "../types";

export const useChat = () => {
  const [state, setState] = useState<ChatDetailState>({
    messageText: "",
    showMenu: false,
    messages: [],
    loading: true,
    currentUser: null,
  });
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          setState(prev => ({
            ...prev,
            currentUser: {
              id: user.id,
              name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "You",
              avatar: user.avatarUrl,
            },
            loading: false,
          }));
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Failed to load user:", error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [state.messages]);

  const setMessageText = useCallback((text: string) => {
    setState(prev => ({ ...prev, messageText: text }));
  }, []);

  const setShowMenu = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showMenu: show }));
  }, []);

  const handleSend = useCallback(() => {
    if (!state.messageText.trim()) return;

    const trimmedMessage = state.messageText.trim();
    setState(prev => ({ ...prev, messageText: "" }));

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: state.currentUser?.id || "me",
      senderName: state.currentUser?.name || "You",
      senderImg: state.currentUser?.avatar || "",
      message: trimmedMessage,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      isMe: true,
    };

    setState(prev => ({ ...prev, messages: [...prev.messages, newMessage] }));
  }, [state.messageText, state.currentUser]);

  return {
    ...state,
    scrollViewRef,
    setMessageText,
    setShowMenu,
    handleSend,
  };
};
