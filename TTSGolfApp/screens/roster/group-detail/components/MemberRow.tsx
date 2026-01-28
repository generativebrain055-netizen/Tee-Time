import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { MoreHorizontal } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { RosterContact } from "../../../../services/api";

interface MemberRowProps {
    member: RosterContact;
    onMore: () => void;
}

export const MemberRow = memo(({ member, onMore }: MemberRowProps) => {
    const name = member.contact?.name || "Unknown";
    const avatar = member.contact?.avatar;
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    return (
        <View style={styles.memberRow}>
            <View style={styles.memberLeft}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                )}
                <Text style={styles.memberName}>{name}</Text>
            </View>
            <TouchableOpacity onPress={onMore}>
                <MoreHorizontal size={20} color={COLORS.textSub} />
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    memberRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    memberLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.divider,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    memberName: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
    },
});
