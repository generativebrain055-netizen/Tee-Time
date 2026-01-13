import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../constants/colors";
import { BottomNav } from "../../components/common";
import { profileApi, teeTimeApi, TeeTime } from "../../services/api";

// Modular components
import {
    ProfileBanner,
    ProfileInfo,
    ActionButtons,
    PreferencesCard,
    MembershipCard,
    ProfileStats,
    RecentRounds,
    BlockedUsersCard,
} from "./components";

// Utility functions
import {
    formatScore,
    getPreferredTeeTimeDisplay,
    getWalkOrRideDisplay,
    getGroupSizeDisplay,
    getInitials,
    getFullName,
} from "./utils";

interface UserProfileData {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    location?: string;
    handicap?: number | string;
    avatar?: string;
    homeCourse?: string;
    bio?: string;
    socialRate?: number | string;
    roundsPlayed?: number;
    preferences?: {
        preferredTeeTime?: string;
        walkOrRide?: string;
        playingPartnerPreference?: string;
    };
}

export default function ProfileScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [recentRounds, setRecentRounds] = useState<TeeTime[]>([]);

    // Fetch profile data
    const fetchProfile = useCallback(async () => {
        try {
            const [profileRes, teeTimesRes] = await Promise.all([
                profileApi.getCurrentUser(),
                teeTimeApi.getTeeTimes("completed").catch(() => ({ success: false, teeTimes: [] })),
            ]);

            console.log("📱 [PROFILE] API Response:", JSON.stringify(profileRes, null, 2));

            if (profileRes.success && profileRes.user) {
                const u = profileRes.user;
                console.log("📱 [PROFILE] User preferences from API:", u.preferences);

                setProfile({
                    id: u.id,
                    firstName: u.firstName || "",
                    lastName: u.lastName || "",
                    email: u.email,
                    phone: u.phoneNumber,
                    location: u.location,
                    handicap: u.handicap,
                    avatar: u.avatarUrl,
                    homeCourse: u.homeCourse,
                    bio: u.bio,
                    socialRate: u.socialRate,
                    roundsPlayed: u.roundsPlayed,
                    preferences: u.preferences,
                });

                console.log("📱 [PROFILE] Profile state set with preferences:", u.preferences);
            }

            if (teeTimesRes.success) {
                setRecentRounds(teeTimesRes.teeTimes.slice(0, 3));
            }
        } catch (error: any) {
            // Don't log session expired errors - they're handled by sessionManager
            if (error?.message !== "Session expired") {
                console.error("Error fetching profile:", error);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchProfile();
        setRefreshing(false);
    }, [fetchProfile]);

    // Action handlers
    const handleEditProfile = useCallback(() => {
        navigation?.navigate("EditProfile", { profile });
    }, [navigation, profile]);

    const handleDraftViaQR = useCallback(() => {
        navigation?.navigate("QRCode");
    }, [navigation]);

    const handleSignOut = useCallback(() => {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Sign Out",
                style: "destructive",
                onPress: async () => {
                    try {
                        await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
                        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
                    } catch (error) {
                        console.error("Error signing out:", error);
                    }
                },
            },
        ]);
    }, [navigation]);

    const handleRoundPress = useCallback((teeTime: TeeTime) => {
        navigation?.navigate("TeeTimeDetail", { teeTimeId: teeTime.id });
    }, [navigation]);

    const handleSeeAllRounds = useCallback(() => {
        navigation?.navigate("TeeTimeHistory");
    }, [navigation]);

    // Loading state
    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Derived values
    const fullName = getFullName(profile?.firstName, profile?.lastName);
    const initials = getInitials(profile?.firstName, profile?.lastName);
    const coursesPlayed = recentRounds.length > 0
        ? new Set(recentRounds.map(r => r.courseName)).size
        : 0;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <ProfileBanner
                    avatar={profile?.avatar}
                    initials={initials}
                    topInset={insets.top}
                    onSignOut={handleSignOut}
                />

                <ProfileInfo
                    fullName={fullName}
                    location={profile?.location}
                    handicap={profile?.handicap}
                />

                <ActionButtons
                    onDraftViaQR={handleDraftViaQR}
                    onEditProfile={handleEditProfile}
                />

                <PreferencesCard
                    teeTimePreference={getPreferredTeeTimeDisplay(profile?.preferences?.preferredTeeTime)}
                    walkOrRide={getWalkOrRideDisplay(profile?.preferences?.walkOrRide)}
                    groupSize={getGroupSizeDisplay(profile?.preferences?.playingPartnerPreference)}
                />

                <MembershipCard homeCourse={profile?.homeCourse} />

                <ProfileStats
                    roundsPlayed={profile?.roundsPlayed || 0}
                    coursesPlayed={coursesPlayed}
                    socialScore={formatScore(profile?.socialRate)}
                />

                <RecentRounds
                    rounds={recentRounds}
                    onRoundPress={handleRoundPress}
                    onSeeAll={handleSeeAllRounds}
                />

                <BlockedUsersCard onRefresh={onRefresh} />

                <View style={{ height: 100 }} />
            </ScrollView>

            <BottomNav activeTab="Profile" navigation={navigation} />
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
});
