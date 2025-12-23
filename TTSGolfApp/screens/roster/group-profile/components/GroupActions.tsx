import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MessageCircle, Calendar } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";

interface Props {
    onChat: () => void;
    onAddTeeTime: () => void;
}

const GroupActions = memo(({ onChat, onAddTeeTime }: Props) => (
    <View style={styles.container}>
        <TouchableOpacity style={styles.chatButton} onPress={onChat}>
            <MessageCircle size={18} color={COLORS.white} />
            <Text style={styles.chatText}>Group Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.teeTimeButton} onPress={onAddTeeTime}>
            <Calendar size={18} color={COLORS.primary} />
            <Text style={styles.teeTimeText}>Add Tee Time</Text>
        </TouchableOpacity>
    </View>
));

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    chatButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    chatText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },
    teeTimeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        gap: 8,
    },
    teeTimeText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.primary,
    },
});

export default GroupActions;
