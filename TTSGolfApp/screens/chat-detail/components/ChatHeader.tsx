import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { ArrowLeft, MoreVertical, Users } from "lucide-react-native";
import { COLORS } from "../styles";
import { ChatInfo } from "../types";

interface ChatHeaderProps {
    chatInfo: ChatInfo;
    onBack: () => void;
    onMenuPress: () => void;
}

export const ChatHeader = memo(({ chatInfo, onBack, onMenuPress }: ChatHeaderProps) => (
    <View style={styles.header}>
        <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <ArrowLeft size={24} color={COLORS.textMain} />
            </TouchableOpacity>
            <View style={styles.chatAvatarContainer}>
                {chatInfo.isGroup ? (
                    <View style={styles.groupAvatar}>
                        <Users size={20} color={COLORS.white} />
                    </View>
                ) : (
                    <Image source={{ uri: chatInfo.img }} style={styles.chatAvatar} />
                )}
            </View>
            <View style={styles.headerInfo}>
                <Text style={styles.headerTitle} numberOfLines={1}>{chatInfo.name}</Text>
                <Text style={styles.headerSubtitle}>{chatInfo.subtitle}</Text>
            </View>
        </View>
        <TouchableOpacity style={styles.moreButton} onPress={onMenuPress}>
            <MoreVertical size={24} color={COLORS.textMain} />
        </TouchableOpacity>
    </View>
));

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: -8,
    },
    chatAvatarContainer: { marginLeft: 8 },
    chatAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.divider,
    },
    groupAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.textSub,
        justifyContent: "center",
        alignItems: "center",
    },
    headerInfo: { marginLeft: 12, flex: 1 },
    headerTitle: { fontSize: 16, fontWeight: "600", color: COLORS.textMain },
    headerSubtitle: { fontSize: 13, color: COLORS.textSub, marginTop: 2 },
    moreButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
});
