import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { Friend } from "../../../../services/api";

interface FriendItemProps {
    friend: Friend;
    isSelected: boolean;
    onToggle: () => void;
}

export const FriendItem = memo(({ friend, isSelected, onToggle }: FriendItemProps) => {
    const name = `${friend.firstName} ${friend.lastName}`;
    const initials = `${friend.firstName?.[0] || ""}${friend.lastName?.[0] || ""}`.toUpperCase();

    return (
        <TouchableOpacity style={styles.friendItem} onPress={onToggle}>
            {friend.avatar ? (
                <Image source={{ uri: friend.avatar }} style={styles.friendAvatar} />
            ) : (
                <View style={styles.friendAvatarPlaceholder}>
                    <Text style={styles.friendAvatarInitials}>{initials}</Text>
                </View>
            )}
            <Text style={styles.friendName}>{name}</Text>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    friendItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    friendAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    friendAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    friendAvatarInitials: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    friendName: {
        flex: 1,
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textMain,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
});
