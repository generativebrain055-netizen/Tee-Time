import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
    TextInput,
    Modal,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Users, Plus, Edit2, Trash2, X, Check, ArrowLeft } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { rosterApi, friendApi, RosterGroup, Friend } from "../../services/api";

interface GroupsListProps {
    onGroupClick: (groupId: string) => void;
}

const GROUP_COLORS = [
    "#5DB075",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
];

type CreateStep = "select" | "details";

export default function GroupsList({ onGroupClick }: GroupsListProps) {
    const [groups, setGroups] = useState<RosterGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Create group flow
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createStep, setCreateStep] = useState<CreateStep>("select");
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
    const [creating, setCreating] = useState(false);

    // Edit group
    const [editingGroup, setEditingGroup] = useState<RosterGroup | null>(null);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const response = await rosterApi.getGroups();
            if (response.success) setGroups(response.groups);
        } catch (error) {
            console.error("Failed to load groups:", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadGroups();
        setRefreshing(false);
    }, []);

    const openCreateModal = async () => {
        setShowCreateModal(true);
        setCreateStep("select");
        setSelectedMembers([]);
        setNewGroupName("");
        setNewGroupColor(GROUP_COLORS[0]);

        try {
            // Load friends (which are the roster)
            const response = await friendApi.getFriends();
            if (response.success) setFriends(response.friends);
        } catch (error) {
            console.error("Failed to load friends:", error);
        }
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setCreateStep("select");
        setSelectedMembers([]);
        setNewGroupName("");
        setEditingGroup(null);
    };

    const toggleMember = (id: string) => {
        setSelectedMembers((prev) =>
            prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
        );
    };

    const handleNextStep = () => {
        if (selectedMembers.length === 0) {
            Alert.alert("Select Members", "Please select at least one member for the group");
            return;
        }
        setCreateStep("details");
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            Alert.alert("Error", "Please enter a group name");
            return;
        }

        setCreating(true);
        try {
            // Create the group with member IDs
            const response = await rosterApi.createGroup({
                name: newGroupName.trim(),
                color: newGroupColor,
                memberIds: selectedMembers, // Pass selected friend/user IDs
            });

            if (response.success) {
                const newGroup = {
                    ...response.group,
                    memberCount: selectedMembers.length
                };

                setGroups((prev) => [...prev, newGroup]);
                closeCreateModal();
                Alert.alert("Success", `Group "${newGroupName}" created with ${selectedMembers.length} members!`);
            }
        } catch (error: any) {
            console.error("Create group error:", error);
            Alert.alert("Error", error.message || "Failed to create group");
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateGroup = async () => {
        if (!editingGroup || !newGroupName.trim()) return;

        try {
            const response = await rosterApi.updateGroup(editingGroup.id, {
                name: newGroupName.trim(),
                color: newGroupColor,
            });
            if (response.success) {
                setGroups((prev) =>
                    prev.map((g) => (g.id === editingGroup.id ? response.group : g))
                );
                closeCreateModal();
            }
        } catch (error) {
            Alert.alert("Error", "Failed to update group");
        }
    };

    const handleDeleteGroup = (group: RosterGroup) => {
        Alert.alert(
            "Delete Group",
            `Delete "${group.name}"? Members will be moved to ungrouped.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await rosterApi.deleteGroup(group.id);
                            setGroups((prev) => prev.filter((g) => g.id !== group.id));
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete group");
                        }
                    },
                },
            ]
        );
    };

    const openEditModal = (group: RosterGroup) => {
        setEditingGroup(group);
        setNewGroupName(group.name);
        setNewGroupColor(group.color);
        setCreateStep("details");
        setShowCreateModal(true);
    };

    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    const SelectMembersView = () => (
        <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeCreateModal} style={styles.modalHeaderBtn}>
                    <X size={24} color={COLORS.textMain} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Members</Text>
                <TouchableOpacity
                    onPress={handleNextStep}
                    style={styles.modalHeaderBtn}
                    disabled={selectedMembers.length === 0}
                >
                    <Text
                        style={[
                            styles.nextText,
                            selectedMembers.length === 0 && styles.nextTextDisabled,
                        ]}
                    >
                        Next
                    </Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.selectedCount}>
                {selectedMembers.length} selected
            </Text>

            <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
                {friends.map((friend) => {
                    const isSelected = selectedMembers.includes(friend.id);
                    return (
                        <TouchableOpacity
                            key={friend.id}
                            style={styles.memberItem}
                            onPress={() => toggleMember(friend.id)}
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
                        <Text style={styles.emptySubtext}>
                            Add friends from Availability first
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );

    const GroupDetailsView = () => (
        <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
        >
            <View style={styles.modalHeader}>
                <TouchableOpacity
                    onPress={() => (editingGroup ? closeCreateModal() : setCreateStep("select"))}
                    style={styles.modalHeaderBtn}
                >
                    <ArrowLeft size={24} color={COLORS.textMain} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                    {editingGroup ? "Edit Group" : "Group Details"}
                </Text>
                <View style={styles.modalHeaderBtn} />
            </View>

            <View style={styles.detailsContent}>
                <Text style={styles.inputLabel}>Group Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter group name"
                    placeholderTextColor={COLORS.textSub}
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    autoFocus
                    blurOnSubmit={false}
                    returnKeyType="done"
                />

                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.colorPicker}>
                    {GROUP_COLORS.map((color) => (
                        <TouchableOpacity
                            key={color}
                            style={[
                                styles.colorOption,
                                { backgroundColor: color },
                                newGroupColor === color && styles.colorOptionSelected,
                            ]}
                            onPress={() => setNewGroupColor(color)}
                        />
                    ))}
                </View>

                {!editingGroup && (
                    <View style={styles.membersPreview}>
                        <Text style={styles.inputLabel}>
                            Members ({selectedMembers.length})
                        </Text>
                        <View style={styles.membersAvatars}>
                            {selectedMembers.slice(0, 5).map((id) => {
                                const friend = friends.find((f) => f.id === id);
                                if (!friend) return null;
                                return (
                                    <View key={id} style={styles.previewAvatar}>
                                        {friend.avatar ? (
                                            <Image
                                                source={{ uri: friend.avatar }}
                                                style={styles.previewAvatarImage}
                                            />
                                        ) : (
                                            <View style={styles.previewAvatarPlaceholder}>
                                                <Text style={styles.previewAvatarText}>
                                                    {getInitials(friend.firstName, friend.lastName)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                            {selectedMembers.length > 5 && (
                                <View style={styles.previewAvatarMore}>
                                    <Text style={styles.previewAvatarMoreText}>
                                        +{selectedMembers.length - 5}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.createButton, creating && styles.createButtonDisabled]}
                    onPress={editingGroup ? handleUpdateGroup : handleCreateGroup}
                    disabled={creating}
                >
                    {creating ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.createButtonText}>
                            {editingGroup ? "Save Changes" : "Create Group"}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {groups.length === 0 && !loading ? (
                    <View style={styles.emptyState}>
                        <Users size={48} color={COLORS.textSub} />
                        <Text style={styles.emptyTitle}>No Groups Yet</Text>
                        <Text style={styles.emptySubtext}>
                            Create groups to organize your golf buddies
                        </Text>
                    </View>
                ) : (
                    groups.map((group) => (
                        <TouchableOpacity
                            key={group.id}
                            style={styles.groupCard}
                            onPress={() => onGroupClick(group.id)}
                        >
                            <View
                                style={[styles.groupIcon, { backgroundColor: group.color + "20" }]}
                            >
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
                                        <Text style={styles.groupMetaText}>
                                            {group.memberCount} members
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            {group.isOwner !== false && (
                                <View style={styles.groupActions}>
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => openEditModal(group)}
                                    >
                                        <Edit2 size={16} color={COLORS.textSub} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => handleDeleteGroup(group)}
                                    >
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 120 }} />
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
                <Plus size={28} color={COLORS.white} />
            </TouchableOpacity>

            <Modal visible={showCreateModal} animationType="slide">
                {createStep === "select" ? <SelectMembersView /> : <GroupDetailsView />}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textMain,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSub,
        marginTop: 4,
    },
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
    fab: {
        position: "absolute",
        bottom: 96,
        right: 0,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    // Modal styles
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
    // Details view
    detailsContent: {
        flex: 1,
        padding: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textMain,
    },
    colorPicker: {
        flexDirection: "row",
        gap: 12,
    },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: COLORS.textMain,
    },
    membersPreview: {
        marginTop: 24,
    },
    membersAvatars: {
        flexDirection: "row",
        marginTop: 8,
    },
    previewAvatar: {
        marginRight: -8,
    },
    previewAvatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    previewAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    previewAvatarText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    previewAvatarMore: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    previewAvatarMoreText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.white,
    },
    createButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 32,
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.white,
    },
});
