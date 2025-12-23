import React, { memo, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, Modal, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { X, Check } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { Friend } from "../../../../services/api";
import { getFriendInitials } from "../utils";

interface FriendItemProps {
    friend: Friend;
    isSelected: boolean;
    onToggle: () => void;
}

const FriendItem = memo(({ friend, isSelected, onToggle }: FriendItemProps) => {
    const name = `${friend.firstName} ${friend.lastName}`;
    const initials = getFriendInitials(friend.firstName, friend.lastName);

    return (
        <TouchableOpacity style={styles.friendItem} onPress={onToggle}>
            {friend.avatar ? (
                <Image source={{ uri: friend.avatar }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
            )}
            <Text style={styles.friendName}>{name}</Text>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
            </View>
        </TouchableOpacity>
    );
});

interface Props {
    visible: boolean;
    friends: Friend[];
    selectedFriends: string[];
    loading: boolean;
    topInset: number;
    onClose: () => void;
    onToggleFriend: (id: string) => void;
    onAdd: () => void;
}

const AddMembersModal = memo(({
    visible,
    friends,
    selectedFriends,
    loading,
    topInset,
    onClose,
    onToggleFriend,
    onAdd,
}: Props) => {
    const renderItem = useCallback(
        ({ item }: { item: Friend }) => (
            <FriendItem
                friend={item}
                isSelected={selectedFriends.includes(item.id)}
                onToggle={() => onToggleFriend(item.id)}
            />
        ),
        [selectedFriends, onToggleFriend]
    );

    return (
        <Modal visible={visible} animationType="slide">
            <View style={[styles.container, { paddingTop: topInset }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                        <X size={24} color={COLORS.textMain} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Add People</Text>
                    <TouchableOpacity
                        onPress={onAdd}
                        style={styles.headerBtn}
                        disabled={selectedFriends.length === 0 || loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <Text style={[styles.addText, selectedFriends.length === 0 && styles.addTextDisabled]}>
                                Add ({selectedFriends.length})
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.list}>
                    {friends.length > 0 ? (
                        <FlatList
                            data={friends}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id}
                        />
                    ) : (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No friends available to add</Text>
                            <Text style={styles.emptySubtext}>
                                All your friends are already in this group
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    headerBtn: {
        width: 80,
        alignItems: "center",
    },
    title: {
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
    list: {
        flex: 1,
        paddingHorizontal: 16,
    },
    friendItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
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
    empty: {
        alignItems: "center",
        paddingVertical: 40,
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
});

export default AddMembersModal;
