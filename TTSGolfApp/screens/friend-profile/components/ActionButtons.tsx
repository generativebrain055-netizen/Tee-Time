import React, { memo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { UserPlus, UserMinus, Clock, Check, MessageCircle } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";
import { FriendshipStatus } from "../types";

interface Props {
    status?: FriendshipStatus;
    loading: boolean;
    onAddFriend: () => void;
    onAcceptRequest: () => void;
    onRemoveFriend: () => void;
    onMessage: () => void;
}

const ActionButtons = memo(({
    status,
    loading,
    onAddFriend,
    onAcceptRequest,
    onRemoveFriend,
    onMessage,
}: Props) => {
    if (loading) {
        return (
            <View style={styles.container}>
                <View style={[styles.button, styles.loadingButton]}>
                    <ActivityIndicator color={COLORS.white} />
                </View>
            </View>
        );
    }

    switch (status) {
        case "friend":
            return (
                <View style={styles.container}>
                    <TouchableOpacity style={styles.messageButton} onPress={onMessage}>
                        <MessageCircle size={18} color={COLORS.white} />
                        <Text style={styles.messageText}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeButton} onPress={onRemoveFriend}>
                        <UserMinus size={18} color={COLORS.red} />
                        <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                </View>
            );
        case "requested":
            return (
                <View style={styles.container}>
                    <View style={styles.requestedButton}>
                        <Clock size={18} color="#F59E0B" />
                        <Text style={styles.requestedText}>Request Sent</Text>
                    </View>
                </View>
            );
        case "pending":
            return (
                <View style={styles.container}>
                    <TouchableOpacity style={styles.acceptButton} onPress={onAcceptRequest}>
                        <Check size={18} color={COLORS.white} />
                        <Text style={styles.acceptText}>Accept Request</Text>
                    </TouchableOpacity>
                </View>
            );
        default:
            return (
                <View style={styles.container}>
                    <TouchableOpacity style={styles.addButton} onPress={onAddFriend}>
                        <UserPlus size={18} color={COLORS.white} />
                        <Text style={styles.addText}>Add Friend</Text>
                    </TouchableOpacity>
                </View>
            );
    }
});

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    button: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    loadingButton: {
        backgroundColor: COLORS.primary,
    },
    addButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    addText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },
    acceptButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    acceptText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },
    requestedButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEF3C7",
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#F59E0B",
        gap: 8,
    },
    requestedText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#F59E0B",
    },
    messageButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    messageText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },
    removeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.red,
        gap: 8,
    },
    removeText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.red,
    },
});

export default ActionButtons;
