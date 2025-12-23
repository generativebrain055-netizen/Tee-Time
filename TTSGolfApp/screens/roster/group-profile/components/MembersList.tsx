import React, { memo, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { UserPlus, ChevronRight } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { RosterContact } from "../../../../services/api";
import { getMemberInitials } from "../utils";

interface MemberCardProps {
    member: RosterContact;
    onPress: () => void;
}

const MemberCard = memo(({ member, onPress }: MemberCardProps) => {
    const name = member.contact?.name || "Unknown";
    const initials = getMemberInitials(name);

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            {member.contact?.avatar ? (
                <Image source={{ uri: member.contact.avatar }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
            )}
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                {member.contact?.handicap != null && (
                    <Text style={styles.handicap}>Handicap: {member.contact.handicap}</Text>
                )}
            </View>
            <ChevronRight size={20} color={COLORS.textSub} />
        </TouchableOpacity>
    );
});

interface Props {
    members: RosterContact[];
    isOwner?: boolean;
    onAddPress: () => void;
    onMemberPress: (member: RosterContact) => void;
}

const MembersList = memo(({ members, isOwner, onAddPress, onMemberPress }: Props) => (
    <View style={styles.section}>
        <View style={styles.header}>
            <Text style={styles.title}>Members ({members.length})</Text>
            {isOwner !== false && (
                <TouchableOpacity onPress={onAddPress}>
                    <Text style={styles.addText}>Add</Text>
                </TouchableOpacity>
            )}
        </View>

        {isOwner !== false && (
            <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
                <View style={styles.addIcon}>
                    <UserPlus size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.addButtonText}>Add people to group</Text>
            </TouchableOpacity>
        )}

        {members.length > 0 ? (
            members.slice(0, 5).map((member) => (
                <MemberCard
                    key={member.id}
                    member={member}
                    onPress={() => onMemberPress(member)}
                />
            ))
        ) : (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>No members yet</Text>
                <Text style={styles.emptySubtext}>Add friends to this group</Text>
            </View>
        )}

        {members.length > 5 && (
            <TouchableOpacity style={styles.viewAll}>
                <Text style={styles.viewAllText}>View all {members.length} members</Text>
            </TouchableOpacity>
        )}
    </View>
));

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    addText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.primary,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        marginBottom: 8,
    },
    addIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.primary,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    avatarInitials: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
        marginBottom: 2,
    },
    handicap: {
        fontSize: 13,
        color: COLORS.textSub,
    },
    empty: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
    },
    emptySubtext: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 4,
    },
    viewAll: {
        alignItems: "center",
        paddingVertical: 12,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.primary,
    },
});

export default MembersList;
