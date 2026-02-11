import React, { memo, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useChat } from "./hooks/useChat";
import { ChatHeader, ChatActionsMenu, MessageBubble, MessageInput } from "./components";
import { COLORS } from "./styles";
import { ChatInfo } from "./types";

interface ChatDetailScreenProps {
    navigation: any;
    route: any;
}

function ChatDetailScreen({ navigation, route }: ChatDetailScreenProps) {
    const {
        messageText,
        showMenu,
        messages,
        loading,
        scrollViewRef,
        setMessageText,
        setShowMenu,
        handleSend,
    } = useChat();

    const chatInfo: ChatInfo = route?.params?.chatInfo || {
        id: "1",
        name: "Unknown",
        subtitle: "",
        img: undefined,
    };

    const handleBack = useCallback(() => {
        navigation?.goBack();
    }, [navigation]);

    const handleMenuPress = useCallback(() => {
        setShowMenu(true);
    }, [setShowMenu]);

    const handleMenuClose = useCallback(() => {
        setShowMenu(false);
    }, [setShowMenu]);

    const handleHeaderPress = useCallback(() => {
        if (chatInfo.isGroup && chatInfo.groupId) {
            navigation?.navigate("GroupProfile", { groupId: chatInfo.groupId });
        }
    }, [navigation, chatInfo.isGroup, chatInfo.groupId]);

    // Add the header press handler to chatInfo
    const chatInfoWithHandler = {
        ...chatInfo,
        onHeaderPress: handleHeaderPress,
    };

    if (loading) {
        return (
            <View className="flex-1 bg-bg-muted justify-center items-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-bg-muted">
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ChatHeader chatInfo={chatInfoWithHandler} onBack={handleBack} onMenuPress={handleMenuPress} />
                <ScrollView
                    ref={scrollViewRef}
                    className="flex-1 bg-bg-muted"
                    contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.length === 0 ? (
                        <View className="flex-1 justify-center items-center pt-[100px]">
                            <Text className="text-base font-semibold text-[#111827]">No messages yet</Text>
                            <Text className="text-sm text-text-secondary mt-1">Send a message to start the conversation</Text>
                        </View>
                    ) : (
                        messages.map((message) => <MessageBubble key={message.id} message={message} />)
                    )}
                </ScrollView>
                <MessageInput value={messageText} onChangeText={setMessageText} onSend={handleSend} />
            </KeyboardAvoidingView>
            <ChatActionsMenu visible={showMenu} onClose={handleMenuClose} />
        </View>
    );
}

export default memo(ChatDetailScreen);
