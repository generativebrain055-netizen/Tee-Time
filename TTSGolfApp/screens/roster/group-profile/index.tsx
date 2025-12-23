/**
 * Group Profile Screen - Modular Implementation
 */
import React, { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../constants/colors";
import { RosterContact } from "../../../services/api";

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
