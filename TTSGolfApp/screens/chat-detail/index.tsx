import React, { memo, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StyleSheet,
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

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ChatHeader chatInfo={chatInfo} onBack={handleBack} onMenuPress={handleMenuPress} />
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No messages yet</Text>
                            <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    loadingContainer: { justifyContent: "center", alignItems: "center" },
    keyboardView: { flex: 1 },
    messagesContainer: { flex: 1, backgroundColor: COLORS.bg },
    messagesContent: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexGrow: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
    },
    emptyText: { fontSize: 16, fontWeight: "600", color: COLORS.textMain },
    emptySubtext: { fontSize: 14, color: COLORS.textSub, marginTop: 4 },
});
