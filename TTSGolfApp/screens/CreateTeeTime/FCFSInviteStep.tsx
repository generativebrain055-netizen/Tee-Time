import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
} from "react-native";
import { Users, UserCheck, Check } from "lucide-react-native";
import { COLORS } from "./constants";
import { Friend, RosterGroup } from "../../services/api";

type TargetType = "roster" | "group";

interface FCFSInviteStepProps {
    friends: Friend[];
    groups: RosterGroup[];
    targetType: TargetType;
    selectedGroupId: string | null;
    onTargetTypeChange: (type: TargetType) => void;
    onGroupSelect: (groupId: string | null) => void;
}

export default function FCFSInviteStep({
    friends,
    groups,
    targetType,
    selectedGroupId,
    onTargetTypeChange,
    onGroupSelect,
}: FCFSInviteStepProps) {
    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    return (
        <View style={styles.content}>
            <Text style={styles.stepTitle}>First Come First Serve</Text>
            <Text style={styles.subtitle}>
                All selected players will be notified. First to accept get the spots!
            </Text>

            {/* Target Type Selection */}
            <View style={styles.targetTypeContainer}>
                <TouchableOpacity
                    style={[styles.targetTypeBtn, targetType === "roster" && styles.targetTypeBtnActive]}
                    onPress={() => onTargetTypeChange("roster")}
                >
                    <Users size={20} color={targetType === "roster" ? COLORS.white : COLORS.text} />
                    <Text style={[styles.targetTypeText, targetType === "roster" && styles.targetTypeTextActive]}>
                        Entire Roster
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.targetTypeBtn, targetType === "group" && styles.targetTypeBtnActive]}
                    onPress={() => onTargetTypeChange("group")}
                >
                    <UserCheck size={20} color={targetType === "group" ? COLORS.white : COLORS.text} />
                    <Text style={[styles.targetTypeText, targetType === "group" && styles.targetTypeTextActive]}>
                        Select Group
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Group Selection */}
            {targetType === "group" && (
                <View style={styles.groupSection}>
                    <Text style={styles.sectionLabel}>Select a group</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                        {groups.map((group) => (
                            <TouchableOpacity
                                key={group.id}
                                style={[
                                    styles.groupChip,
                                    selectedGroupId === group.id && styles.groupChipSelected,
                                    { borderColor: group.color },
                                ]}
                                onPress={() => onGroupSelect(group.id)}
                            >
                                <View style={[styles.groupDot, { backgroundColor: group.color }]} />
                                <Text style={[
                                    styles.groupChipText,
                                    selectedGroupId === group.id && styles.groupChipTextSelected
                                ]}>
                                    {group.name}
                                </Text>
                                <Text style={styles.groupCount}>({group.memberCount})</Text>
                            </TouchableOpacity>
                        ))}
                        {groups.length === 0 && (
                            <Text style={styles.noGroupsText}>No groups created yet</Text>
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Preview of who will receive */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                {targetType === "roster" ? "Roster members" : "Group members"} ({friends.length})
            </Text>
            <Text style={styles.sectionHint}>
                All players below will receive the invite simultaneously
            </Text>

            <ScrollView style={styles.playerList} showsVerticalScrollIndicator={false}>
                {friends.map((friend) => (
                    <View key={friend.id} style={styles.playerItem}>
                        <View style={styles.avatarContainer}>
                            {friend.avatar ? (
                                <Image source={{ uri: friend.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>
                                        {getInitials(friend.firstName, friend.lastName)}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.playerInfo}>
                            <Text style={styles.playerName}>
                                {friend.firstName} {friend.lastName}
                            </Text>
                            {friend.handicap !== undefined && (
                                <Text style={styles.playerSub}>HCP {friend.handicap}</Text>
                            )}
                        </View>
                        <View style={styles.willReceive}>
                            <Check size={16} color={COLORS.primary} />
                        </View>
                    </View>
                ))}
                {friends.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>
                            {targetType === "roster" ? "No friends in roster" : "Select a group"}
                        </Text>
                        <Text style={styles.emptyText}>
                            {targetType === "roster"
                                ? "Add friends from Availability first"
                                : "Choose a group above to see members"}
                        </Text>
                    </View>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        marginBottom: 24,
    },
    targetTypeContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
    },
    targetTypeBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
        gap: 8,
    },
    targetTypeBtnActive: {
        backgroundColor: COLORS.primary,
    },
    targetTypeText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
    },
    targetTypeTextActive: {
        color: COLORS.white,
    },
    groupSection: {
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 8,
    },
    sectionHint: {
        fontSize: 13,
        color: COLORS.textSub,
        marginBottom: 12,
    },
    groupScroll: {
        flexGrow: 0,
    },
    groupChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 2,
        marginRight: 10,
        backgroundColor: COLORS.white,
    },
    groupChipSelected: {
        backgroundColor: "#F0FDF4",
    },
    groupDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    groupChipText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.text,
    },
    groupChipTextSelected: {
        fontWeight: "600",
    },
    groupCount: {
        fontSize: 12,
        color: COLORS.textSub,
        marginLeft: 4,
    },
    noGroupsText: {
        fontSize: 14,
        color: COLORS.textSub,
        fontStyle: "italic",
    },
    playerList: {
        flex: 1,
    },
    playerItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        marginBottom: 8,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
    },
    playerSub: {
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 2,
    },
    willReceive: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#DCFCE7",
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
    },
});
