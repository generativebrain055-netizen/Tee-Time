import React, { memo, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, RefreshControl } from "react-native";
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
        <View className="flex-1 bg-white">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {groups.length === 0 && !loading ? (
                    <View className="items-center py-20 px-8">
                        <View style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
                            marginBottom: 20,
                        }}>
                            <Users size={36} color="#9CA3AF" strokeWidth={1.5} />
                        </View>
                        <Text style={{
                            fontSize: 22, fontWeight: '700', color: '#111827',
                            marginBottom: 8, textAlign: 'center',
                        }}>
                            Build a group
                        </Text>
                        <Text style={{
                            fontSize: 15, color: '#6B7280', textAlign: 'center',
                            lineHeight: 22, marginBottom: 24, paddingHorizontal: 8,
                        }}>
                            Create a group for your regular golfing buddies. Quickly invite the same players, lock in tee times faster, and keep an ongoing communication in one place with built-in group messaging.
                        </Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: COLORS.primary, paddingHorizontal: 32,
                                paddingVertical: 14, borderRadius: 10,
                            }}
                            onPress={openCreateModal}
                        >
                            <Text style={{ fontSize: 15, fontWeight: '600', color: 'white' }}>
                                Create group
                            </Text>
                        </TouchableOpacity>
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

            <TouchableOpacity className="absolute bottom-24 right-4 w-14 h-14 rounded-full justify-center items-center shadow-lg" style={{ backgroundColor: COLORS.primary, elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
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
