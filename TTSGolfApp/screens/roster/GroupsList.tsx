import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, TextInput, Modal } from "react-native";
import { Users, Calendar, Plus, MoreVertical, Edit2, Trash2, X } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { Group } from "./types";
import { rosterApi, RosterGroup } from "../../services/api";

interface GroupsListProps {
    onGroupClick: (groupId: string) => void;
}

const GROUP_COLORS = ['#5DB075', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export default function GroupsList({ onGroupClick }: GroupsListProps) {
    const [groups, setGroups] = useState<RosterGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<RosterGroup | null>(null);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);

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

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            Alert.alert("Error", "Please enter a group name");
            return;
        }
        try {
            const response = await rosterApi.createGroup({ name: newGroupName.trim(), color: newGroupColor });
            if (response.success) {
                setGroups(prev => [...prev, response.group]);
                setShowCreateModal(false);
                setNewGroupName("");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to create group");
        }
    };

    const handleUpdateGroup = async () => {
        if (!editingGroup || !newGroupName.trim()) return;
        try {
            const response = await rosterApi.updateGroup(editingGroup.id, { name: newGroupName.trim(), color: newGroupColor });
            if (response.success) {
                setGroups(prev => prev.map(g => g.id === editingGroup.id ? response.group : g));
                setEditingGroup(null);
                setNewGroupName("");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to update group");
        }
    };

    const handleDeleteGroup = (group: RosterGroup) => {
        Alert.alert("Delete Group", `Delete "${group.name}"? Members will be moved to ungrouped.`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await rosterApi.deleteGroup(group.id);
                        setGroups(prev => prev.filter(g => g.id !== group.id));
                    } catch (error) {
                        Alert.alert("Error", "Failed to delete group");
                    }
                },
            },
        ]);
    };

    const openEditModal = (group: RosterGroup) => {
        setEditingGroup(group);
        setNewGroupName(group.name);
        setNewGroupColor(group.color);
    };


    const GroupModal = () => (
        <Modal visible={showCreateModal || !!editingGroup} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{editingGroup ? 'Edit Group' : 'Create Group'}</Text>
                        <TouchableOpacity onPress={() => { setShowCreateModal(false); setEditingGroup(null); setNewGroupName(""); }}>
                            <X size={24} color={COLORS.textSub} />
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="Group name"
                        placeholderTextColor={COLORS.textSub}
                        value={newGroupName}
                        onChangeText={setNewGroupName}
                        autoFocus
                    />
                    <Text style={styles.colorLabel}>Color</Text>
                    <View style={styles.colorPicker}>
                        {GROUP_COLORS.map(color => (
                            <TouchableOpacity
                                key={color}
                                style={[styles.colorOption, { backgroundColor: color }, newGroupColor === color && styles.colorOptionSelected]}
                                onPress={() => setNewGroupColor(color)}
                            />
                        ))}
                    </View>
                    <TouchableOpacity
                        style={styles.modalButton}
                        onPress={editingGroup ? handleUpdateGroup : handleCreateGroup}
                    >
                        <Text style={styles.modalButtonText}>{editingGroup ? 'Save Changes' : 'Create Group'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {groups.length === 0 && !loading ? (
                    <View style={styles.emptyState}>
                        <Users size={48} color={COLORS.textSub} />
                        <Text style={styles.emptyTitle}>No Groups Yet</Text>
                        <Text style={styles.emptyText}>Create groups to organize your golf buddies</Text>
                    </View>
                ) : (
                    groups.map((group) => (
                        <TouchableOpacity
                            key={group.id}
                            style={styles.groupCard}
                            onPress={() => onGroupClick(group.id)}
                        >
                            <View style={[styles.groupIcon, { backgroundColor: group.color + '20' }]}>
                                <Text style={[styles.groupInitials, { color: group.color }]}>
                                    {group.name.substring(0, 2).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.groupInfo}>
                                <Text style={styles.groupName}>{group.name}</Text>
                                <View style={styles.groupMeta}>
                                    <View style={styles.groupMetaRow}>
                                        <Users size={12} color={COLORS.textSub} />
                                        <Text style={styles.groupMetaText}>{group.memberCount} members</Text>
                                    </View>
                                    {group.autoInvite && (
                                        <View style={styles.autoInviteBadge}>
                                            <Text style={styles.autoInviteText}>Auto-invite</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <View style={styles.groupActions}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(group)}>
                                    <Edit2 size={16} color={COLORS.textSub} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteGroup(group)}>
                                    <Trash2 size={16} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 120 }} />
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
                <Plus size={28} color={COLORS.white} />
            </TouchableOpacity>

            <GroupModal />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white, paddingHorizontal: 16 },
    emptyState: { alignItems: "center", paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontWeight: "600", color: COLORS.textMain, marginTop: 16 },
    emptyText: { fontSize: 14, color: COLORS.textSub, marginTop: 4 },
    groupCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 14,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    groupIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
    groupInitials: { fontSize: 16, fontWeight: "bold" },
    groupInfo: { flex: 1, marginLeft: 14 },
    groupName: { fontSize: 16, fontWeight: "600", color: COLORS.textMain },
    groupMeta: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
    groupMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    groupMetaText: { fontSize: 12, color: COLORS.textSub },
    autoInviteBadge: { backgroundColor: "#E8F5E9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    autoInviteText: { fontSize: 10, fontWeight: "500", color: COLORS.primary },
    groupActions: { flexDirection: "row", gap: 8 },
    actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
    fab: {
        position: "absolute",
        bottom: 96,
        right: 16,
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
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, width: "85%", maxWidth: 340 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.textMain },
    input: {
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textMain,
        marginBottom: 16,
    },
    colorLabel: { fontSize: 14, fontWeight: "500", color: COLORS.textSub, marginBottom: 8 },
    colorPicker: { flexDirection: "row", gap: 10, marginBottom: 20 },
    colorOption: { width: 32, height: 32, borderRadius: 16 },
    colorOptionSelected: { borderWidth: 3, borderColor: COLORS.textMain },
    modalButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    modalButtonText: { fontSize: 16, fontWeight: "600", color: COLORS.white },
});
