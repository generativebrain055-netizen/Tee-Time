import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
} from "react-native";
import { Clock, ChevronDown, GripVertical, Check } from "lucide-react-native";
import { COLORS } from "./constants";
import { Friend } from "../../services/api";

interface RosterInviteStepProps {
    friends: Friend[];
    responseWindow: number;
    orderedPlayers: string[];
    onResponseWindowChange: (hours: number) => void;
    onReorderPlayers: (orderedIds: string[]) => void;
}

const RESPONSE_WINDOWS = [
    { value: 1, label: "1 hour" },
    { value: 2, label: "2 hours" },
    { value: 3, label: "3 hours" },
    { value: 4, label: "4 hours" },
    { value: 6, label: "6 hours" },
    { value: 8, label: "8 hours" },
    { value: 12, label: "12 hours" },
    { value: 24, label: "24 hours" },
];

export default function RosterInviteStep({
    friends,
    responseWindow,
    orderedPlayers,
    onResponseWindowChange,
    onReorderPlayers,
}: RosterInviteStepProps) {
    const [showPicker, setShowPicker] = useState(false);

    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    const getSelectedLabel = () => {
        const option = RESPONSE_WINDOWS.find((w) => w.value === responseWindow);
        return option?.label || "Select response time";
    };

    // Get ordered friends list
    const getOrderedFriends = useCallback(() => {
        if (orderedPlayers.length === 0) {
            return friends;
        }
        return orderedPlayers
            .map((id) => friends.find((f) => f.id === id))
            .filter(Boolean) as Friend[];
    }, [friends, orderedPlayers]);

    const moveUp = (index: number) => {
        if (index === 0) return;
        const ordered = getOrderedFriends().map((f) => f.id);
        [ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]];
        onReorderPlayers(ordered);
    };

    const moveDown = (index: number) => {
        const ordered = getOrderedFriends().map((f) => f.id);
        if (index === ordered.length - 1) return;
        [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]];
        onReorderPlayers(ordered);
    };

    const orderedFriends = getOrderedFriends();

    return (
        <View style={styles.content}>
            <Text style={styles.stepTitle}>Set Up Roster Invite</Text>

            {/* Response Window Picker */}
            <Text style={styles.sectionLabel}>Response window</Text>
            <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}
            >
                <Clock size={20} color={COLORS.textSub} />
                <Text style={styles.pickerText}>{getSelectedLabel()}</Text>
                <ChevronDown size={20} color={COLORS.textSub} />
            </TouchableOpacity>

            {/* Player Order */}
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                Invite order (drag to reorder)
            </Text>
            <Text style={styles.sectionHint}>
                Players will be invited in this order. Each player has {responseWindow} hour(s) to respond before the next is invited.
            </Text>

            <ScrollView style={styles.playerList} showsVerticalScrollIndicator={false}>
                {orderedFriends.map((friend, index) => (
                    <View key={friend.id} style={styles.playerItem}>
                        <TouchableOpacity
                            style={styles.dragHandle}
                            onPress={() => moveUp(index)}
                            disabled={index === 0}
                        >
                            <Text style={[styles.arrowText, index === 0 && styles.arrowDisabled]}>▲</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.dragHandle}
                            onPress={() => moveDown(index)}
                            disabled={index === orderedFriends.length - 1}
                        >
                            <Text style={[styles.arrowText, index === orderedFriends.length - 1 && styles.arrowDisabled]}>▼</Text>
                        </TouchableOpacity>

                        <Text style={styles.rankNumber}>{index + 1}</Text>

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
                    </View>
                ))}
                {orderedFriends.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>No friends in roster</Text>
                        <Text style={styles.emptyText}>
                            Add friends from Availability to use roster invites
                        </Text>
                    </View>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Response Window Modal */}
            <Modal visible={showPicker} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPicker(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select response time</Text>
                        {RESPONSE_WINDOWS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={styles.modalOption}
                                onPress={() => {
                                    onResponseWindowChange(option.value);
                                    setShowPicker(false);
                                }}
                            >
                                <Text style={styles.modalOptionText}>{option.label}</Text>
                                {responseWindow === option.value && (
                                    <Check size={20} color={COLORS.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
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
        marginBottom: 24,
        textAlign: "center",
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
        lineHeight: 18,
    },
    pickerButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: 12,
        backgroundColor: COLORS.white,
    },
    pickerText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        marginLeft: 10,
    },
    playerList: {
        flex: 1,
    },
    playerItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        marginBottom: 8,
    },
    dragHandle: {
        padding: 4,
        marginRight: 2,
    },
    arrowText: {
        fontSize: 12,
        color: COLORS.primary,
    },
    arrowDisabled: {
        color: "#D1D5DB",
    },
    rankNumber: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
        width: 24,
        textAlign: "center",
    },
    avatarContainer: {
        marginLeft: 8,
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        width: "85%",
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        maxHeight: "70%",
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 16,
        textAlign: "center",
    },
    modalOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    modalOptionText: {
        fontSize: 16,
        color: COLORS.text,
    },
});
