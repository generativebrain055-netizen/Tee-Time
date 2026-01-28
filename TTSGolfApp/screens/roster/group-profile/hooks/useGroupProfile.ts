/**
 * Group Profile data and actions hook
 */
import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import {
    rosterApi,
    friendApi,
    teeTimeApi,
    RosterGroup,
    RosterContact,
    Friend,
    TeeTime,
} from "../../../../services/api";

export const useGroupProfile = (groupId: string) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [group, setGroup] = useState<RosterGroup | null>(null);
    const [members, setMembers] = useState<RosterContact[]>([]);
    const [upcomingTeeTimes, setUpcomingTeeTimes] = useState<TeeTime[]>([]);

    // Add people modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [addingMembers, setAddingMembers] = useState(false);

    const loadGroupData = useCallback(async () => {
        try {
            const [groupRes, membersRes, teeTimesRes] = await Promise.all([
                rosterApi.getGroup(groupId),
                rosterApi.getGroupMembers(groupId),
                teeTimeApi.getUpcoming(5),
            ]);

            if (groupRes.success && groupRes.group) {
                setGroup(groupRes.group);
            }

            if (membersRes.success) setMembers(membersRes.members);
            if (teeTimesRes.success) setUpcomingTeeTimes(teeTimesRes.teeTimes.slice(0, 3));
        } catch (error) {
            console.error("Failed to load group data:", error);
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        loadGroupData();
    }, [loadGroupData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadGroupData();
        setRefreshing(false);
    }, [loadGroupData]);

    const openAddPeopleModal = useCallback(async () => {
        setShowAddModal(true);
        setSelectedFriends([]);

        try {
            const res = await friendApi.getFriends();
            if (res.success) {
                const memberUserIds = members.map(m => m.contact?.userId).filter(Boolean);
                const availableFriends = res.friends.filter(f => !memberUserIds.includes(f.id));
                setFriends(availableFriends);
            }
        } catch (error) {
            console.error("Failed to load friends:", error);
        }
    }, [members]);

    const closeAddModal = useCallback(() => {
        setShowAddModal(false);
    }, []);

    const toggleFriend = useCallback((id: string) => {
        setSelectedFriends(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    }, []);

    const handleAddMembers = useCallback(async () => {
        if (selectedFriends.length === 0) return;

        setAddingMembers(true);
        try {
            for (const friendId of selectedFriends) {
                const rosterRes = await rosterApi.getRoster();
                const rosterEntry = rosterRes.roster.find(r => r.contact?.userId === friendId);
                if (rosterEntry) {
                    await rosterApi.updateMemberGroup(rosterEntry.id, groupId);
                }
            }

            setShowAddModal(false);
            Alert.alert("Success", `Added ${selectedFriends.length} member(s) to the group`);
            loadGroupData();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to add members");
        } finally {
            setAddingMembers(false);
        }
    }, [selectedFriends, groupId, loadGroupData]);

    const handleGroupChat = useCallback(() => {
        Alert.alert("Coming Soon", "Group chat feature is coming soon!");
    }, []);

    const handleSettings = useCallback(() => {
        Alert.alert("Group Settings", "Group settings coming soon!");
    }, []);

    return {
        loading,
        refreshing,
        group,
        members,
        upcomingTeeTimes,
        showAddModal,
        friends,
        selectedFriends,
        addingMembers,
        onRefresh,
        openAddPeopleModal,
        closeAddModal,
        toggleFriend,
        handleAddMembers,
        handleGroupChat,
        handleSettings,
    };
};
