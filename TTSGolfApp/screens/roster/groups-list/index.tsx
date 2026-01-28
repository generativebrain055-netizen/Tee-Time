import React, { memo, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, RefreshControl, StyleSheet } from "react-native";
import { Users, Plus } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";
import { useGroupsList } from "./hooks/useGroupsList";
import { GroupCard, GroupDetailsView, SelectMembersView } from "./components";
import { GroupsListProps } from "./types";

function GroupsList({ onGroupClick }: GroupsListProps) {
    const {
        groups,
        loading,
        refreshing,
        showCreateModal,
        createStep,
        friends,
        selectedMembers,
        newGroupName,
        newGroupColor,
        creating,
        editingGroup,
        onRefresh,
        openCreateModal,
        closeCreateModal,
        toggleMember,
        setCreateStep,
        setNewGroupName,
        setNewGroupColor,
        handleNextStep,
        handleCreateGroup,
        handleUpdateGroup,
        handleDeleteGroup,
        openEditModal,
    } = useGroupsList();

    const handleBack = useCallback(() => {
        if (editingGroup) {
            closeCreateModal();
        } else {
            setCreateStep("select");
        }
    }, [editingGroup, closeCreateModal, setCreateStep]);

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {groups.length === 0 && !loading ? (
                    <View style={styles.emptyState}>
                        <Users size={48} color={COLORS.textSub} />
                        <Text style={styles.emptyTitle}>No Groups Yet</Text>
                        <Text style={styles.emptySubtext}>Create groups to organize your golf buddies</Text>
                    </View>
                ) : (
                    groups.map((group) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            onPress={() => onGroupClick(group.id)}
                            onEdit={() => openEditModal(group)}
                            onDelete={() => handleDeleteGroup(group)}
                        />
                    ))
                )}
                <View style={{ height: 120 }} />
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
                <Plus size={28} color={COLORS.white} />
            </TouchableOpacity>

            <Modal visible={showCreateModal} animationType="slide">
                {createStep === "select" ? (
                    <SelectMembersView
                        friends={friends}
                        selectedMembers={selectedMembers}
                        onClose={closeCreateModal}
                        onNext={handleNextStep}
                        onToggleMember={toggleMember}
                    />
                ) : (
                    <GroupDetailsView
                        editingGroup={editingGroup}
                        newGroupName={newGroupName}
                        newGroupColor={newGroupColor}
                        selectedMembers={selectedMembers}
                        friends={friends}
                        creating={creating}
                        onBack={handleBack}
                        onNameChange={setNewGroupName}
                        onColorChange={setNewGroupColor}
                        onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
                    />
                )}
            </Modal>
        </View>
    );
}

export default memo(GroupsList);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
        paddingHorizontal: 16,
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
});
