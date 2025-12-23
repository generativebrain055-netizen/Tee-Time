import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Users, Edit2, Trash2 } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { RosterGroup } from "../../../../services/api";

interface GroupCardProps {
    group: RosterGroup;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const GroupCard = memo(({ group, onPress, onEdit, onDelete }: GroupCardProps) => (
    <TouchableOpacity style={styles.groupCard} onPress={onPress}>
        <View style={[styles.groupIcon, { backgroundColor: group.color + "20" }]}>
            <Text style={[styles.groupInitials, { color: group.color }]}>
                {group.name.substring(0, 2).toUpperCase()}
            </Text>
        </View>
        <View style={styles.groupInfo}>
            <View style={styles.groupNameRow}>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.isOwner === false && (
                    <View style={styles.memberBadge}>
                        <Text style={styles.memberBadgeText}>Member</Text>
                    </View>
                )}
            </View>
            <View style={styles.groupMeta}>
                <View style={styles.groupMetaRow}>
                    <Users size={12} color={COLORS.textSub} />
                    <Text style={styles.groupMetaText}>{group.memberCount} members</Text>
                </View>
            </View>
        </View>
        {group.isOwner !== false && (
            <View style={styles.groupActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
                    <Edit2 size={16} color={COLORS.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
                    <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
            </View>
        )}
    </TouchableOpacity>
));

const styles = StyleSheet.create({
    groupCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    groupIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    groupInitials: {
        fontSize: 16,
        fontWeight: "bold",
    },
    groupInfo: {
        flex: 1,
        marginLeft: 14,
    },
    groupNameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    groupName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    memberBadge: {
        backgroundColor: "#E0E7FF",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    memberBadgeText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#4F46E5",
    },
    groupMeta: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    groupMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    groupMetaText: {
        fontSize: 12,
        color: COLORS.textSub,
    },
    groupActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
});
