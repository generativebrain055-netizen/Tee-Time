/**
 * Friend Profile data and actions hook
 */
import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { friendApi, DiscoveredUser } from "../../../services/api";
import { FriendProfileData } from "../types";

function pickStr(a: unknown, b?: unknown): string | undefined {
    const v = a ?? b;
    if (v == null || v === "") return undefined;
    return typeof v === "string" ? v : String(v);
}

function pickNum(a: unknown, b?: unknown): number | undefined {
    const v = a ?? b;
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

/** Normalize GET /friends/profile response (camelCase + occasional snake_case / JSON clubs). */
function normalizeFriendProfileApi(raw: Record<string, unknown>): FriendProfileData {
    let clubs: FriendProfileData["clubs"];
    const cr = raw.clubs;
    if (Array.isArray(cr)) {
        clubs = cr as FriendProfileData["clubs"];
    } else if (typeof cr === "string") {
        try {
            const parsed = JSON.parse(cr);
            clubs = Array.isArray(parsed) ? parsed : [];
        } catch {
            clubs = [];
        }
    } else {
        clubs = [];
    }

    let recentRounds = raw.recentRounds ?? raw.recent_rounds;
    if (!Array.isArray(recentRounds)) recentRounds = [];

    const playingPartnerPreference = pickStr(raw.playingPartnerPreference, raw.playing_partner_preference);
    const fs = raw.friendshipStatus ?? raw.friendship_status;

    return {
        id: String(raw.id ?? ""),
        firstName: pickStr(raw.firstName, raw.first_name) ?? "",
        lastName: pickStr(raw.lastName, raw.last_name) ?? "",
        username: pickStr(raw.username),
        avatar: pickStr(raw.avatar, raw.avatar_url),
        handicap: pickNum(raw.handicap) ?? null,
        location: pickStr(raw.location),
        homeCourse: pickStr(raw.homeCourse, raw.home_course),
        preferredTeeTime: pickStr(raw.preferredTeeTime, raw.preferred_tee_time),
        walkOrRide: pickStr(raw.walkOrRide, raw.walk_or_ride),
        playingPartnerPreference,
        socialRate: pickNum(raw.socialRate, raw.social_rate),
        friendshipStatus:
            fs === "friend" || fs === "requested" || fs === "pending" || fs === "none"
                ? fs
                : "none",
        roundsPlayed: pickNum(raw.roundsPlayed, raw.rounds_played),
        golfVibe: pickStr(raw.golfVibe) ?? playingPartnerPreference,
        drinkOfChoice: pickStr(raw.drinkOfChoice, raw.drink_of_choice),
        roundsCount: pickNum(raw.roundsCount, raw.rounds_count) ?? pickNum(raw.roundsPlayed, raw.rounds_played) ?? 0,
        coursesCount: pickNum(raw.coursesCount, raw.courses_count) ?? 0,
        recentRounds: recentRounds as FriendProfileData["recentRounds"],
        blockedYou: Boolean(raw.blockedYou ?? raw.blocked_you),
        phone: pickStr(raw.phone, raw.phone_number),
        clubs,
        averageScore: pickNum(raw.averageScore, raw.average_score),
        headerImage: pickStr(raw.headerImage),
    };
}

export const useFriendProfile = (userId: string, initialUser?: DiscoveredUser) => {
    const [profile, setProfile] = useState<FriendProfileData | null>(() => {
        if (initialUser && initialUser.id === userId) {
            const avatar = initialUser.avatar || (initialUser as Record<string, unknown>).avatarUrl as string | undefined;
            return { ...initialUser, avatar: avatar || undefined } as FriendProfileData;
        }
        return null;
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);

    const fetchProfile = useCallback(async () => {
        try {
            const [response, blockedRes] = await Promise.all([
                friendApi.getUserProfile(userId),
                friendApi.getBlockedUsers(),
            ]);

            const uidKey = String(userId).toLowerCase();
            if (blockedRes.success && Array.isArray(blockedRes.blockedUsers)) {
                const blocked = (blockedRes.blockedUsers as { id?: string }[]).some(
                    (u) => u?.id && String(u.id).toLowerCase() === uidKey,
                );
                setIsBlocked(blocked);
            } else {
                setIsBlocked(false);
            }

            if (response.success && response.profile) {
                const p = response.profile as Record<string, unknown>;
                const normalized = normalizeFriendProfileApi(p);
                const apiAvatar =
                    (typeof p.avatar === "string" ? p.avatar : (p.avatarUrl as string) || "").trim() ||
                    normalized.avatar?.trim() ||
                    "";
                setProfile((prev) => {
                    const merged = { ...normalized };
                    merged.avatar = apiAvatar || (prev?.avatar && String(prev.avatar).trim()) || undefined;
                    return merged;
                });
            }
        } catch (error) {
            // Error handling is done by the component
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchProfile();
        setRefreshing(false);
    }, [fetchProfile]);

    const handleAddFriend = useCallback(async () => {
        if (!profile) return;
        setActionLoading(true);
        try {
            const response = await friendApi.sendRequest(profile.id);
            if (response.success) {
                setProfile({ ...profile, friendshipStatus: "requested" });
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to send request");
        } finally {
            setActionLoading(false);
        }
    }, [profile]);

    const handleAcceptRequest = useCallback(async () => {
        setActionLoading(true);
        try {
            const pendingRes = await friendApi.getPendingRequests();
            const request = pendingRes.requests.find((r) => r.sender.id === userId);
            if (request) {
                await friendApi.respondToRequest(request.id, "accepted");
                setProfile((prev) => (prev ? { ...prev, friendshipStatus: "friend" } : null));
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to accept request");
        } finally {
            setActionLoading(false);
        }
    }, [userId]);

    const handleRemoveFriend = useCallback(async () => {
        if (!profile) return;
        Alert.alert("Remove Friend", `Remove ${profile.firstName} from your friends?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Remove",
                style: "destructive",
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        await friendApi.removeFriend(profile.id);
                        setProfile({ ...profile, friendshipStatus: "none" });
                    } catch (error: any) {
                        Alert.alert("Error", error.message || "Failed to remove friend");
                    } finally {
                        setActionLoading(false);
                    }
                },
            },
        ]);
    }, [profile]);

    const handleMessage = useCallback(() => {
        Alert.alert("Message", "Messaging feature coming soon!");
    }, []);

    const handleUnblock = useCallback(async () => {
        if (!userId) return;
        setActionLoading(true);
        try {
            const res = await friendApi.unblockUser(userId);
            if (res.success) {
                setIsBlocked(false);
                await fetchProfile();
                Alert.alert("Unblocked", "This person has been unblocked.");
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to unblock";
            Alert.alert("Error", msg);
        } finally {
            setActionLoading(false);
        }
    }, [userId, fetchProfile]);

    return {
        profile,
        loading,
        refreshing,
        actionLoading,
        isBlocked,
        onRefresh,
        handleAddFriend,
        handleAcceptRequest,
        handleRemoveFriend,
        handleMessage,
        handleUnblock,
    };
};
