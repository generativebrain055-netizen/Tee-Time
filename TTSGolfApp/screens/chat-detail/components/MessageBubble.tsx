import React, { memo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { COLORS } from "../styles";
import { ChatMessage } from "../types";

interface MessageBubbleProps {
    message: ChatMessage;
}

export const MessageBubble = memo(({ message }: MessageBubbleProps) => (
    <View
        style={[
            styles.messageContainer,
            message.isMe ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
    >
        {!message.isMe && (
            <Image source={{ uri: message.senderImg }} style={styles.messageAvatar} />
        )}
        <View
            style={[
                styles.messageBubble,
                message.isMe ? styles.myMessageBubble : styles.otherMessageBubble,
            ]}
        >
            <Text
                style={[
                    styles.messageText,
                    message.isMe ? styles.myMessageText : styles.otherMessageText,
                ]}
            >
                {message.message}
            </Text>
            <Text
                style={[
                    styles.messageTime,
                    message.isMe ? styles.myMessageTime : styles.otherMessageTime,
                ]}
            >
                {message.time}
            </Text>
        </View>
        {message.isMe && <View style={styles.messageSpacer} />}
    </View>
));

const styles = StyleSheet.create({
    messageContainer: {
        flexDirection: "row",
        marginBottom: 16,
        alignItems: "flex-end",
    },
    myMessageContainer: { justifyContent: "flex-end" },
    otherMessageContainer: { justifyContent: "flex-start" },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.divider,
        marginRight: 8,
    },
    messageSpacer: { width: 40 },
    messageBubble: {
        maxWidth: "70%",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    myMessageBubble: {
        backgroundColor: COLORS.myMessageBg,
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        backgroundColor: COLORS.otherMessageBg,
        borderBottomLeftRadius: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageText: { fontSize: 15, lineHeight: 20 },
    myMessageText: { color: COLORS.textMain },
    otherMessageText: { color: COLORS.textMain },
    messageTime: { fontSize: 11, marginTop: 4 },
    myMessageTime: { color: COLORS.textSub, textAlign: "right" },
    otherMessageTime: { color: COLORS.textSub },
});
