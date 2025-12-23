import React, { memo } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { X } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { Friend } from "../../../../services/api";
import { FriendItem } from "./FriendItem";

interface AddPeopleModalProps {
    visible: boolean;
    friends: Friend[];
    selectedFriends: string[];
    addingMembers: boolean;
    onClose: () => void;
    onToggleFriend: (id: string) => void;
    onAddMembers: () => void;
}

export const AddPeopleModal = memo(({
    visible,
    friends,
    selectedFriends,
    addingMembers,
    onClose,
    onToggleFriend,
    onAddMembers,
}: AddPeopleModalProps) => (
    <Modal visible={visible} animationType="slide">
        <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose} style={styles.modalHeaderBtn}>
                    <X size={24} color={COLORS.textMain} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Add People</Text>
                <TouchableOpacity
                    onPress={onAddMembers}
                    style={styles.modalHeaderBtn}
                    disabled={selectedFriends.length === 0 || addingMembers}
                >
                    {addingMembers ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Text style={[styles.addText, selectedFriends.length === 0 && styles.addTextDisabled]}>
                            Add ({selectedFriends.length})
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.friendsList}>
                {friends.length > 0 ? (
                    <FlatList
                        data={friends}
                        renderItem={({ item }) => (
                            <FriendItem
                                friend={item}
                                isSelected={selectedFriends.includes(item.id)}
                                onToggle={() => onToggleFriend(item.id)}
                            />
                        )}
                        keyExtractor={(item) => item.id}
                    />
                ) : (
                    <View style={styles.emptyFriends}>
                        <Text style={styles.emptyText}>No friends available to add</Text>
                        <Text style={styles.emptySubtext}>All your friends are already in this group</Text>
                    </View>
                )}
            </View>
        </View>
    </Modal>
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
        width: 80,
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    addText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
    },
    addTextDisabled: {
        color: COLORS.textSub,
    },
    friendsList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    emptyFriends: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
    },
    emptySubtext: {
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 4,
    },
});
