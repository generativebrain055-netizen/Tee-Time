import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import { rosterApi, friendApi, RosterGroup } from "../../../../services/api";
import { GroupsListState, CreateStep, GROUP_COLORS } from "../types";

export const useGroupsList = () => {
  const [state, setState] = useState<GroupsListState>({
    groups: [],
    loading: true,
    refreshing: false,
    showCreateModal: false,
    createStep: "select",
    friends: [],
    selectedMembers: [],
    newGroupName: "",
    newGroupColor: GROUP_COLORS[0],
    creating: false,
    editingGroup: null,
  });

  const loadGroups = useCallback(async () => {
    try {
      const response = await rosterApi.getGroups();
      if (response.success) {
        setState(prev => ({ ...prev, groups: response.groups, loading: false }));
      }
    } catch (error) {
      console.error("Failed to load groups:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const onRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    await loadGroups();
    setState(prev => ({ ...prev, refreshing: false }));
  }, [loadGroups]);

  const openCreateModal = useCallback(async () => {
    setState(prev => ({
      ...prev,
      showCreateModal: true,
      createStep: "select",
      selectedMembers: [],
      newGroupName: "",
      newGroupColor: GROUP_COLORS[0],
    }));

    try {
      const response = await friendApi.getFriends();
      if (response.success) {
        setState(prev => ({ ...prev, friends: response.friends }));
      }
    } catch (error) {
      console.error("Failed to load friends:", error);
    }
  }, []);

  const closeCreateModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      showCreateModal: false,
      createStep: "select",
      selectedMembers: [],
      newGroupName: "",
      editingGroup: null,
    }));
  }, []);

  const toggleMember = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(id)
        ? prev.selectedMembers.filter(m => m !== id)
        : [...prev.selectedMembers, id],
    }));
  }, []);

  const setCreateStep = useCallback((step: CreateStep) => {
    setState(prev => ({ ...prev, createStep: step }));
  }, []);

  const setNewGroupName = useCallback((name: string) => {
    setState(prev => ({ ...prev, newGroupName: name }));
  }, []);

  const setNewGroupColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, newGroupColor: color }));
  }, []);

  const handleNextStep = useCallback(() => {
    if (state.selectedMembers.length === 0) {
      Alert.alert("Select Members", "Please select at least one member for the group");
      return;
    }
    setState(prev => ({ ...prev, createStep: "details" }));
  }, [state.selectedMembers.length]);

  const handleCreateGroup = useCallback(async () => {
    if (!state.newGroupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    setState(prev => ({ ...prev, creating: true }));
    try {
      const response = await rosterApi.createGroup({
        name: state.newGroupName.trim(),
        color: state.newGroupColor,
        memberIds: state.selectedMembers,
      });

      if (response.success) {
        const newGroup = { ...response.group, memberCount: state.selectedMembers.length };
        setState(prev => ({
          ...prev,
          groups: [...prev.groups, newGroup],
          showCreateModal: false,
          creating: false,
        }));
        Alert.alert("Success", `Group "${state.newGroupName}" created with ${state.selectedMembers.length} members!`);
      }
    } catch (error: any) {
      console.error("Create group error:", error);
      Alert.alert("Error", error.message || "Failed to create group");
      setState(prev => ({ ...prev, creating: false }));
    }
  }, [state.newGroupName, state.newGroupColor, state.selectedMembers]);

  const handleUpdateGroup = useCallback(async () => {
    if (!state.editingGroup || !state.newGroupName.trim()) return;

    try {
      const response = await rosterApi.updateGroup(state.editingGroup.id, {
        name: state.newGroupName.trim(),
        color: state.newGroupColor,
      });
      if (response.success) {
        setState(prev => ({
          ...prev,
          groups: prev.groups.map(g => g.id === state.editingGroup!.id ? response.group : g),
          showCreateModal: false,
          editingGroup: null,
        }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update group");
    }
  }, [state.editingGroup, state.newGroupName, state.newGroupColor]);

  const handleDeleteGroup = useCallback((group: RosterGroup) => {
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
              setState(prev => ({ ...prev, groups: prev.groups.filter(g => g.id !== group.id) }));
            } catch (error) {
              Alert.alert("Error", "Failed to delete group");
            }
          },
        },
      ]
    );
  }, []);

  const openEditModal = useCallback((group: RosterGroup) => {
    setState(prev => ({
      ...prev,
      editingGroup: group,
      newGroupName: group.name,
      newGroupColor: group.color,
      createStep: "details",
      showCreateModal: true,
    }));
  }, []);

  return {
    ...state,
    loadGroups,
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
  };
};
