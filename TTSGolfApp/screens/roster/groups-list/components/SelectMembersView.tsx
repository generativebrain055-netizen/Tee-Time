import React, { memo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { X, Check } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { Friend } from "../../../../services/api";
import { getInitials } from "../utils";

interface SelectMembersViewProps {
    friends: Friend[];
    selectedMembers: string[];
    onClose: () => void;
    onNext: () => void;
    onToggleMember: (id: string) => void;
}

export const SelectMembersView = memo(({
    friends,
    selectedMembers,
    onClose,
    onNext,
    onToggleMember,
}: SelectMembersViewProps) => (
    <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modalHeaderBtn}>
                <X size={24} color={COLORS.textMain} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Members</Text>
            <TouchableOpacity
                onPress={onNext}
                style={styles.modalHeaderBtn}
                disabled={selectedMembers.length === 0}
            >
                <Text style={[styles.nextText, selectedMembers.length === 0 && styles.nextTextDisabled]}>
                    Next
                </Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.selectedCount}>{selectedMembers.length} selected</Text>

        <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
            {friends.map((friend) => {
                const isSelected = selectedMembers.includes(friend.id);
                return (
                    <TouchableOpacity
                        key={friend.id}
                        style={styles.memberItem}
                        onPress={() => onToggleMember(friend.id)}
                    >
                        <View style={styles.memberAvatar}>
                            {friend.avatar ? (
                                <Image source={{ uri: friend.avatar }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>
                                        {getInitials(friend.firstName, friend.lastName)}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.memberName}>
                            {friend.firstName} {friend.lastName}
                        </Text>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                        </View>
                    </TouchableOpacity>
                );
            })}
            {friends.length === 0 && (
                <View style={styles.emptyMembers}>
                    <Text style={styles.emptyText}>No friends yet</Text>
                    <Text style={styles.emptySubtext}>Add friends from Availability first</Text>
                </View>
            )}
        </ScrollView>
    </View>
));

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingTop: 50,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    modalHeaderBtn: {
        width: 60,
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    nextText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
    },
    nextTextDisabled: {
        color: COLORS.textSub,
    },
    selectedCount: {
        fontSize: 14,
        color: COLORS.textSub,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    membersList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    memberItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    memberAvatar: {
        marginRight: 12,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
    emptyMembers: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSub,
        marginTop: 4,
    },
});
