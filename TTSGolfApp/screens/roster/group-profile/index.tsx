/**
 * Group Profile Screen - Modular Implementation
 */
import React, { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../constants/colors";
import { RosterContact, rosterApi, friendApi } from "../../../services/api";

import { useGroupProfile } from "./hooks/useGroupProfile";
import {
    GroupBanner,
    GroupInfo,
    GroupActions,
    GroupStats,
    TeeTimesList,
    MembersList,
    AddMembersModal,
} from "./components";
import { getGroupInitials, calculateAvgHandicap } from "./utils";

interface Props {
    navigation: any;
    route: { params: { groupId: string } };
}

export default function GroupProfileScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const { groupId } = route.params;

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
        handleGroupChat,
        handleSettings,
    } = useGroupProfile(groupId);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

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
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Error state
    if (!group) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Group not found</Text>
                <TouchableOpacity style={styles.backLink} onPress={handleBack}>
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const groupInitials = getGroupInitials(group.name);
    const avgHandicap = calculateAvgHandicap(members);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <GroupBanner
                    initials={groupInitials}
                    color={group.color}
                    topInset={insets.top}
                    isOwner={group.isOwner}
                    onBack={handleBack}
                    onSettings={handleSettings}
                />

                <GroupInfo
                    name={group.name}
                    description={group.description}
                    memberCount={members.length}
                />

                <GroupActions
                    onChat={handleGroupChat}
                    onAddTeeTime={handleAddTeeTime}
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

                <MembersList
                    members={members}
                    isOwner={group.isOwner}
                    onAddPress={openAddPeopleModal}
                    onMemberPress={handleMemberPress}
                    onRemoveMember={handleRemoveMember}
                    onBlockMember={handleBlockMember}
                />

                <View style={styles.bottomSpacer} />
            </ScrollView>

            <AddMembersModal
                visible={showAddModal}
                friends={friends}
                selectedFriends={selectedFriends}
                loading={addingMembers}
                topInset={insets.top}
                onClose={closeAddModal}
                onToggleFriend={toggleFriend}
                onAdd={handleAddMembers}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.textSub,
        marginBottom: 16,
    },
    backLink: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    backLinkText: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: "500",
    },
    bottomSpacer: {
        height: 40,
    },
});
