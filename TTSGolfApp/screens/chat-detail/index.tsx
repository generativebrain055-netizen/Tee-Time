import React, { memo, useCallback, useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useChat } from "./hooks/useChat";
import { ChatHeader, ChatActionsMenu, MessageBubble, MessageInput } from "./components";
import { COLORS } from "./styles";
import { ChatInfo, DirectBlockRelation } from "./types";

function getDirectBlockBannerText(
  name: string,
  rel: DirectBlockRelation | null
): string {
  if (!rel || (!rel.iBlockedThem && !rel.theyBlockedYou)) return "";
  const n = name?.trim() || "This person";
  if (rel.iBlockedThem && rel.theyBlockedYou) {
    return `You blocked ${n}, and they blocked you. Messaging isn’t available.`;
  }
  if (rel.iBlockedThem) {
    return `You blocked ${n}. Unblock them to send messages again.`;
  }
  return `${n} blocked you. You can’t send messages until they unblock you.`;
}
import { teeTimeApi, rosterApi } from "../../services/api";
import { logger } from "../../utils/logger";

interface ChatDetailScreenProps {
    navigation: any;
    route: any;
}

function ChatDetailScreen({ navigation, route }: ChatDetailScreenProps) {
    const chatInfo: ChatInfo = route?.params?.chatInfo || {
        id: "1",
        name: "Unknown",
        subtitle: "",
        img: undefined,
    };

    const {
        messageText,
        showMenu,
        messages,
        loading,
        scrollViewRef,
        setMessageText,
        appendToMessageText,
        setShowMenu,
        handleSend,
        handleSendImage,
        handleConvertToGroupMessage,
        handleDeleteMessage,
        isMuted,
        handleMuteToggle,
        handleLeaveConversation,
        blockRelation,
    } = useChat(chatInfo);

    const isDirectChat = !chatInfo.teeTimeId && !chatInfo.groupId;
    const directMessagingBlocked =
        isDirectChat &&
        blockRelation != null &&
        (blockRelation.iBlockedThem || blockRelation.theyBlockedYou);
    const blockBannerText = directMessagingBlocked
        ? getDirectBlockBannerText(chatInfo.name, blockRelation)
        : "";

    const [participants, setParticipants] = useState<string[]>([]);

    // Extract participants from chat for "Create group" flow (Figma 1269-2563)
    useEffect(() => {
        const loadParticipants = async () => {
            try {
                if (chatInfo.teeTimeId) {
                    // Tee time chat: get participants from tee time
                    const ttRes = await teeTimeApi.getTeeTime(chatInfo.teeTimeId);
                    if (ttRes.success && ttRes.teeTime?.participants) {
                        const userIds = ttRes.teeTime.participants
                            .map((p: any) => p.userId)
                            .filter((id: string | undefined): id is string => !!id);
                        setParticipants(userIds);
                    }
                } else if (chatInfo.groupId) {
                    // Group chat: get members from group
                    const groupRes = await rosterApi.getGroupMembers(chatInfo.groupId);
                    if (groupRes.success && groupRes.members) {
                        const userIds = groupRes.members
                            .map((m: any) => m.contact?.userId)
                            .filter((id: string | undefined): id is string => !!id);
                        setParticipants(userIds);
                    }
                } else if (chatInfo.recipientId) {
                    // Direct message: just the recipient
                    setParticipants([chatInfo.recipientId]);
                }
            } catch (error) {
                logger.warn("[ChatDetailScreen] Failed to load participants", error);
            }
        };
        loadParticipants();
    }, [chatInfo.teeTimeId, chatInfo.groupId, chatInfo.recipientId]);

    const handleBack = useCallback(() => {
        navigation?.goBack();
    }, [navigation]);

    const handleMenuPress = useCallback(() => {
        setShowMenu(true);
    }, [setShowMenu]);

    const handleMenuClose = useCallback(() => {
        setShowMenu(false);
    }, []);

    const handleCreateGroup = useCallback(() => {
        setShowMenu(false);
        // Pass participants from chat to pre-fill CreateGroup (Figma 1269-2563)
        navigation?.navigate("CreateGroup", {
            initialParticipantIds: participants.length > 0 ? participants : undefined,
        });
    }, [navigation, participants]);

    const handleHeaderPress = useCallback(() => {
        if (chatInfo.isGroup && chatInfo.groupId) {
            navigation?.navigate("GroupProfile", { groupId: chatInfo.groupId });
        }
    }, [navigation, chatInfo.isGroup, chatInfo.groupId]);

    const handleDeleteChatFromMenu = useCallback(() => {
        const hasTeeTime = chatInfo.teeTimeId != null && chatInfo.teeTimeId !== "";
        const hasGroup = chatInfo.groupId != null && chatInfo.groupId !== "";
        const reopenHint = hasTeeTime
            ? "You can open it again from the tee time."
            : hasGroup
              ? "You can open it again from the group."
              : "You can open it again from the profile.";
        const deleteChatMessage = `This chat will be removed from your Messages list. Other members still have the conversation. ${reopenHint}`;
        Alert.alert(
            "Delete chat?",
            deleteChatMessage,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const result = await handleLeaveConversation();
                        if (result.success) {
                            navigation?.goBack();
                        } else {
                            Alert.alert(
                                "Error",
                                result.errorMessage || "Could not delete chat. Try again."
                            );
                        }
                    },
                },
            ]
        );
    }, [chatInfo.groupId, chatInfo.teeTimeId, handleLeaveConversation, navigation]);

    const deleteDeniedFallback =
        chatInfo.teeTimeId != null && chatInfo.teeTimeId !== ""
            ? "You can only delete your own messages, or any message as the tee time organizer."
            : chatInfo.groupId != null && chatInfo.groupId !== ""
              ? "You can only delete your own messages in this group chat."
              : "You can only delete your own messages in this conversation.";

    const handleDeleteMessageWithAlert = useCallback(
        async (messageId: string) => {
            try {
                await handleDeleteMessage(messageId);
            } catch (err: any) {
                Alert.alert("Cannot delete", err?.message || deleteDeniedFallback);
            }
        },
        [handleDeleteMessage, deleteDeniedFallback]
    );

    const handlePickImage = useCallback(
        (uri: string, base64?: string) => {
            if (base64) {
                handleSendImage(base64);
            } else {
                Alert.alert("Photo selected", "Could not load image. Try another photo.");
            }
        },
        [handleSendImage]
    );

    const handleEmojiSelected = useCallback(
        (emoji: string) => {
            appendToMessageText(emoji);
        },
        [appendToMessageText]
    );

    // Add the header press handler to chatInfo
    const chatInfoWithHandler = {
        ...chatInfo,
        onHeaderPress: handleHeaderPress,
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ChatHeader chatInfo={chatInfoWithHandler} onBack={handleBack} onMenuPress={handleMenuPress} />
                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1, backgroundColor: COLORS.bg }}
                    contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.length === 0 ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 }}>
                            <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.textMain }}>No messages yet</Text>
                            <Text style={{ fontSize: 14, color: COLORS.textSub, marginTop: 8, textAlign: "center", paddingHorizontal: 24 }}>
                                {blockBannerText || "Send a message to start the conversation"}
                            </Text>
                        </View>
                    ) : (
                        messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                onConvertToGroupMessage={handleConvertToGroupMessage}
                                canDelete={message.isMe || !!chatInfo.teeTimeId}
                                onDelete={handleDeleteMessageWithAlert}
                            />
                        ))
                    )}
                </ScrollView>
                {blockBannerText ? (
                    <View
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            backgroundColor: COLORS.primaryLight,
                            borderTopWidth: 1,
                            borderTopColor: COLORS.divider,
                        }}
                    >
                        <Text style={{ fontSize: 14, lineHeight: 20, color: COLORS.textMain }}>{blockBannerText}</Text>
                    </View>
                ) : null}
                <MessageInput
                    value={messageText}
                    onChangeText={setMessageText}
                    onSend={handleSend}
                    onPickImage={handlePickImage}
                    onEmojiSelected={handleEmojiSelected}
                    disabled={directMessagingBlocked}
                />
            </KeyboardAvoidingView>
            <ChatActionsMenu
                visible={showMenu}
                onClose={handleMenuClose}
                onCreateGroup={chatInfo.teeTimeId ? handleCreateGroup : undefined}
                isMuted={isMuted}
                onMuteToggle={handleMuteToggle}
                onDeleteChat={handleDeleteChatFromMenu}
            />
        </View>
    );
}

export default memo(ChatDetailScreen);
