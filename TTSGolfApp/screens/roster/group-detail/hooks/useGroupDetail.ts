import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import { rosterApi, friendApi, teeTimeApi, RosterContact, Friend, TeeTime } from "../../../../services/api";
import { GroupData, GroupDetailState } from "../types";
import { logger } from "../../../../utils/logger";
import { rosterGroupMembersExceptSelf } from "../../../../utils/groupMemberCount";
import { useAuthStore } from "../../../../stores";

export const useGroupDetail = (groupId: string) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [state, setState] = useState<GroupDetailState>({
    loading: true,
    refreshing: false,
    group: null,
    members: [],
    upcomingTeeTimes: [],
    showAddModal: false,
    friends: [],
    selectedFriends: [],
    addingMembers: false,
  });

  const loadGroupData = useCallback(async () => {
    try {
      const [groupsRes, membersRes, teeTimesRes] = await Promise.all([
        rosterApi.getGroups(),
        rosterApi.getGroupMembers(groupId),
        teeTimeApi.getUpcoming(5),
      ]);

      setState(prev => ({
        ...prev,
        group: groupsRes.success 
          ? groupsRes.groups.find(g => g.id === groupId) || null 
          : null,
        members: membersRes.success
          ? rosterGroupMembersExceptSelf(membersRes.members, currentUserId)
          : [],
        upcomingTeeTimes: teeTimesRes.success ? teeTimesRes.teeTimes.slice(0, 2) : [],
        loading: false,
      }));
    } catch (error) {
      logger.error("[useGroupDetail] Failed to load group data", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [groupId, currentUserId]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  const onRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    await loadGroupData();
    setState(prev => ({ ...prev, refreshing: false }));
  }, [loadGroupData]);

  const openAddPeopleModal = useCallback(async () => {
    setState(prev => ({ ...prev, showAddModal: true, selectedFriends: [] }));

    try {
      const res = await friendApi.getFriends();
      if (res.success) {
        const memberUserIds = state.members.map(m => m.contact?.userId).filter(Boolean);
        const availableFriends = res.friends.filter(f => !memberUserIds.includes(f.id));
        setState(prev => ({ ...prev, friends: availableFriends }));
      }
    } catch (error) {
      logger.error("[useGroupDetail] Failed to load friends", error);
    }
  }, [state.members]);

  const closeAddModal = useCallback(() => {
    setState(prev => ({ ...prev, showAddModal: false, selectedFriends: [] }));
  }, []);

  const toggleFriend = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      selectedFriends: prev.selectedFriends.includes(id)
        ? prev.selectedFriends.filter(f => f !== id)
        : [...prev.selectedFriends, id],
    }));
  }, []);

  const handleAddMembers = useCallback(async () => {
    if (state.selectedFriends.length === 0) return;

    setState(prev => ({ ...prev, addingMembers: true }));
    try {
      for (const friendId of state.selectedFriends) {
        const rosterRes = await rosterApi.getRoster();
        const rosterEntry = rosterRes.roster.find(r => r.contact?.userId === friendId);
        if (rosterEntry) {
          await rosterApi.updateMemberGroup(rosterEntry.id, groupId);
        }
      }

      setState(prev => ({ ...prev, showAddModal: false, addingMembers: false }));
      Alert.alert("Success", `Added ${state.selectedFriends.length} member(s) to the group`);
      loadGroupData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add members");
      setState(prev => ({ ...prev, addingMembers: false }));
    }
  }, [state.selectedFriends, groupId, loadGroupData]);

  return {
    ...state,
    loadGroupData,
    onRefresh,
    openAddPeopleModal,
    closeAddModal,
    toggleFriend,
    handleAddMembers,
  };
};
