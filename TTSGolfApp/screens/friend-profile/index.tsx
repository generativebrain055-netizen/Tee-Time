/**
 * Friend Profile Screen - Modular Implementation
 */
import React, { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { DiscoveredUser } from "../../services/api";
import { formatScore } from "../profile/utils";

import { useFriendProfile } from "./hooks/useFriendProfile";
import {
    ProfileBanner,
    ProfileInfo,
    ActionButtons,
    PreferencesCard,
    HomeCourseCard,
    StatsRow,
} from "./components";
import { getInitials, getFullName, getPreferredTeeTimeDisplay, getWalkOrRideDisplay } from "./utils";

interface Props {
    navigation: any;
    route: { params: { userId: string; user?: DiscoveredUser } };
}

export default function FriendProfileScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const { userId, user: initialUser } = route.params;

    const {
        profile,
        loading,
        refreshing,
        actionLoading,
        onRefresh,
        handleAddFriend,
        handleAcceptRequest,
        handleRemoveFriend,
        handleMessage,
    } = useFriendProfile(userId, initialUser);

    const handleBack = useCallback(() => {
        navigation.goBack();
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
    if (!profile) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>User not found</Text>
                <TouchableOpacity style={styles.backLink} onPress={handleBack}>
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const fullName = getFullName(profile.firstName, profile.lastName);
    const initials = getInitials(profile.firstName, profile.lastName);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <ProfileBanner
                    avatar={profile.avatar}
                    initials={initials}
                    topInset={insets.top}
                    onBack={handleBack}
                />

                <ProfileInfo
                    fullName={fullName}
                    username={profile.username}
                    location={profile.location}
                    handicap={profile.handicap}
                />

                <ActionButtons
                    status={profile.friendshipStatus}
                    loading={actionLoading}
                    onAddFriend={handleAddFriend}
                    onAcceptRequest={handleAcceptRequest}
                    onRemoveFriend={handleRemoveFriend}
                    onMessage={handleMessage}
                />

                <PreferencesCard
                    teeTimePreference={getPreferredTeeTimeDisplay(profile.preferredTeeTime)}
                    walkOrRide={getWalkOrRideDisplay(profile.walkOrRide)}
                />

                <HomeCourseCard homeCourse={profile.homeCourse} />

                <StatsRow
                    handicap={profile.handicap}
                    socialScore={formatScore(profile.socialRate)}
                />

                <View style={styles.bottomSpacer} />
            </ScrollView>
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
