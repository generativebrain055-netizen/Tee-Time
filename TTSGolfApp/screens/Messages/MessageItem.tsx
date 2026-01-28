import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { CheckCheck, Users } from "lucide-react-native";
import { COLORS, Message } from "./constants";

interface MessageItemProps {
    message: Message;
    onPress: () => void;
}

export function MessageItem({ message, onPress }: MessageItemProps) {
    return (
        <TouchableOpacity
            style={[styles.messageItem, !message.isRead && styles.messageItemUnread]}
            onPress={onPress}
        >
            <View style={styles.messageAvatar}>
                <Image source={{ uri: message.img }} style={styles.avatar} />
                {message.unread && message.unread > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{message.unread}</Text>
                    </View>
                )}
            </View>
            <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                    <Text style={styles.messageName} numberOfLines={1}>{message.name}</Text>
                    <Text style={styles.messageTime}>{message.time}</Text>
                </View>
                <View style={styles.messagePreview}>
                    <Text style={styles.messageText} numberOfLines={1}>{message.message}</Text>
                    {message.isRead && (
                        <CheckCheck size={16} color={COLORS.primary} style={styles.checkIcon} />
                    )}
                    {message.unread && message.unread > 0 && (
                        <View style={styles.unreadCount}>
                            <Text style={styles.unreadCountText}>{message.unread}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

export function GroupMessageItem({ message, onPress }: MessageItemProps) {
    return (
        <TouchableOpacity style={styles.groupMessageItem} onPress={onPress}>
            <View style={styles.groupAvatarContainer}>
                <View style={styles.groupAvatar}>
                    <Users size={24} color={COLORS.white} />
                </View>
                {message.unread && message.unread > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{message.unread}</Text>
                    </View>
                )}
            </View>
            <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                    <Text style={styles.messageName} numberOfLines={1}>{message.name}</Text>
                    <Text style={styles.messageTime}>{message.time}</Text>
                </View>
                <Text style={styles.messageText} numberOfLines={1}>{message.message}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    messageItem: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.readBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    messageItemUnread: { backgroundColor: COLORS.unreadBg },
    messageAvatar: { position: "relative" },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.divider },
    unreadBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    unreadText: { color: COLORS.white, fontSize: 11, fontWeight: "bold" },
    messageContent: { flex: 1, marginLeft: 12, justifyContent: "center" },
    messageHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    messageName: { fontSize: 16, fontWeight: "600", color: COLORS.textMain, flex: 1, marginRight: 8 },
    messageTime: { fontSize: 13, color: COLORS.textSub },
    messagePreview: { flexDirection: "row", alignItems: "center" },
    messageText: { fontSize: 14, color: COLORS.textSub, flex: 1 },
    checkIcon: { marginLeft: 4 },
    unreadCount: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    unreadCountText: { color: COLORS.white, fontSize: 11, fontWeight: "bold" },
    groupMessageItem: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    groupAvatarContainer: { position: "relative" },
    groupAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.textSub,
        justifyContent: "center",
        alignItems: "center",
    },
});
