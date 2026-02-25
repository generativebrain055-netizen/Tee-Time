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
import { logger } from "../../../../utils/logger";

export const useGroupProfile = (groupId: string, navigation?: any) => {
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
            logger.error("[useGroupProfile] Failed to load group data", error);
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
            logger.error("[useGroupProfile] Failed to load friends", error);
            setFriends([]);
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
            // Send group invitations (Figma 1269-977): invitees receive notification with Accept/Decline
            const res = await rosterApi.inviteToGroup(groupId, selectedFriends);
            if (res.success) {
                setShowAddModal(false);
                Alert.alert("Invitations sent", `Sent ${res.sent} invitation(s). They'll receive a group request to accept.`);
                loadGroupData();
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to send invitations");
        } finally {
            setAddingMembers(false);
        }
    }, [selectedFriends, groupId, loadGroupData]);

    const handleLeaveGroup = useCallback(async () => {
        Alert.alert(
            "Leave Group",
            `Leave "${group?.name || "this group"}"? You'll be removed from all members in this group.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await rosterApi.leaveGroup(groupId);
                            if (res.success) {
                                Alert.alert("Left Group", "You've left the group.", [
                                    {
                                        text: "OK",
                                        onPress: () => {
                                            // Navigate back - group profile will be invalid
                                            navigation?.goBack();
                                        },
                                    },
                                ]);
                            }
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to leave group");
                        }
                    },
                },
            ],
        );
    }, [groupId, group?.name]);

    const handleGroupChat = useCallback(async () => {
        if (!group) return;
        try {
            // Navigate to group chat
            navigation?.navigate("ChatDetail", {
                chatInfo: {
                    groupId: group.id,
                    id: group.id,
                    name: group.name,
                    subtitle: `${members.length} members`,
                    img: undefined,
                    isGroup: true,
                    participantCount: members.length,
                },
            });
        } catch (error) {
            logger.error("[useGroupProfile] Failed to open group chat", error);
            Alert.alert("Error", "Failed to open group chat");
        }
    }, [group, members.length, navigation]);

    const handleSettings = useCallback(() => {
        Alert.alert("Group Settings", "Group settings coming soon!");
    }, []);

    const updateGroup = useCallback(
        async (data: { name?: string; description?: string; color?: string; icon?: string; avatar?: string }) => {
            if (!groupId) return;
            const res = await rosterApi.updateGroup(groupId, data);
            if (res.success) {
                await loadGroupData();
            }
            return res;
        },
        [groupId, loadGroupData]
    );

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
        handleLeaveGroup,
        handleGroupChat,
        handleSettings,
        updateGroup,
    };
};
