/**
 * Group Profile Screen - Modular Implementation
 */
import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../constants/colors";
import { RosterContact, rosterApi, friendApi } from "../../../services/api";
import { useToast } from "../../../ui/feedback";
import { useAuthStore } from "../../../stores";

import { useGroupProfile } from "./hooks/useGroupProfile";
import {
    GroupBanner,
    GroupInfo,
    GroupActions,
    GroupStats,
    TeeTimesList,
    MembersList,
    AddMembersModal,
    GroupOptionsSheet,
} from "./components";
import { getGroupInitials, calculateAvgHandicap } from "./utils";

interface Props {
    navigation: any;
    route: { params: { groupId: string } };
}

export default function GroupProfileScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const { groupId } = route.params;
    const toast = useToast();
    const [showOptionsSheet, setShowOptionsSheet] = useState(false);
    const currentUserId = useAuthStore((s) => s.user?.id);

    const {
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
    } = useGroupProfile(groupId, navigation);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleOpenOptions = useCallback(() => {
        setShowOptionsSheet(true);
    }, []);

    const handleLeaveGroupConfirm = useCallback(() => {
        Alert.alert(
            "Leave group?",
            "You'll no longer be part of this group. You can rejoin if you're invited again.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave group",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await rosterApi.leaveGroup(groupId);
                            if (res.success) {
                                toast.show({ message: "You've left the group", type: "success" });
                                navigation.goBack();
                            } else {
                                Alert.alert("Error", "Failed to leave group");
                            }
                        } catch (e: any) {
                            Alert.alert("Error", e?.message || "Failed to leave group");
                        }
                    },
                },
            ]
        );
    }, [groupId, navigation, toast]);

    const handleLeaveGroupFromSheet = useCallback(() => {
        setShowOptionsSheet(false);
        handleLeaveGroupConfirm();
    }, [handleLeaveGroupConfirm]);

    const handleAddTeeTime = useCallback(() => {
        navigation?.navigate("CreateTeeTime", { groupId });
    }, [navigation, groupId]);

    const handleMemberPress = useCallback((member: RosterContact) => {
        if (member.contact?.userId) {
            navigation?.navigate("FriendProfile", { userId: member.contact.userId });
        }
    }, [navigation]);

    const handleRemoveMember = useCallback((member: RosterContact) => {
        const name = member.contact?.name || "this member";
        Alert.alert(
            "Remove from Group",
            `Remove ${name} from this group? They will still be in your roster.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Remove from group by setting group to null
                            await rosterApi.updateMemberGroup(member.id, null);
                            Alert.alert("Removed", `${name} has been removed from the group.`);
                            onRefresh();
                        } catch (error) {
                            Alert.alert("Error", "Failed to remove member from group");
                        }
                    },
                },
            ]
        );
    }, [onRefresh]);

    const handleBlockMember = useCallback((member: RosterContact) => {
        const name = member.contact?.name || "this user";
        const userId = member.contact?.userId;

        if (!userId) {
            Alert.alert(
                "Cannot Block",
                "This contact is not a registered user and cannot be blocked. You can remove them from the group instead."
            );
            return;
        }

        Alert.alert(
            "Block User",
            `Block ${name}? They will be removed from your roster and won't be able to:\n\n• Send you friend requests\n• Invite you to tee times\n• See your availability`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Block",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Remove from roster first
                            await rosterApi.removeFromRoster(member.id);
                            // Then block the user
                            await friendApi.blockUser(userId);
                            Alert.alert("Blocked", `${name} has been blocked.`);
                            onRefresh();
                        } catch (error) {
                            Alert.alert("Error", "Failed to block user");
                        }
                    },
                },
            ]
        );
    }, [onRefresh]);

    // Loading state
    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Error state
    if (!group) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <Text className="text-base text-gray-600 mb-4">Group not found</Text>
                <TouchableOpacity className="py-2 px-4" onPress={handleBack}>
                    <Text className="text-base font-medium" style={{ color: COLORS.primary }}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const groupInitials = getGroupInitials(group.name);
    const avgHandicap = calculateAvgHandicap(members);

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="light" />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <GroupBanner
                    initials={groupInitials}
                    name={group.name}
                    color={group.color}
                    topInset={insets.top}
                    isOwner={group.isOwner}
                    onBack={handleBack}
                    onSettings={handleOpenOptions}
                />

                <GroupActions
                    onChat={handleGroupChat}
                    onInvitePeople={openAddPeopleModal}
                />

                <GroupInfo
                    name={group.name}
                    description={group.description}
                    memberCount={members.length}
                />

                <GroupStats
                    memberCount={members.length}
                    avgHandicap={avgHandicap}
                    upcomingCount={upcomingTeeTimes.length}
                />

                <TeeTimesList
                    teeTimes={upcomingTeeTimes}
                    onAddTeeTime={handleAddTeeTime}
                />

                <View style={{ height: 6, backgroundColor: "#F3F3F3" }} />

                <MembersList
                    members={members}
                    currentUserId={currentUserId}
                    isOwner={group.isOwner}
                    onAddPress={openAddPeopleModal}
                    onMemberPress={handleMemberPress}
                    onRemoveMember={handleRemoveMember}
                    onBlockMember={handleBlockMember}
                />

                {/* Leave group option (Figma 1075-927: removing yourself) */}
                {!group.isOwner && (
                    <View className="px-5 mb-6">
                        <TouchableOpacity
                            className="py-3.5 px-4 rounded-md items-center"
                            style={{ backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FEE2E2" }}
                            onPress={handleLeaveGroupConfirm}
                        >
                            <Text className="text-[15px] font-semibold" style={{ color: "#DC2626" }}>
                                Leave Group
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View className="h-10" />
            </ScrollView>

            <GroupOptionsSheet
                visible={showOptionsSheet}
                onClose={() => setShowOptionsSheet(false)}
                onLeaveGroup={handleLeaveGroupFromSheet}
                members={members}
                currentUserId={currentUserId}
                isOwner={group.isOwner}
            />

            <AddMembersModal
                visible={showAddModal}
                friends={friends}
                selectedFriends={selectedFriends}
                loading={addingMembers}
                topInset={insets.top}
                memberUserIds={members.map(m => m.contact?.userId).filter(Boolean)}
                onClose={closeAddModal}
                onToggleFriend={toggleFriend}
                onAdd={handleAddMembers}
            />
        </View>
    );
}
