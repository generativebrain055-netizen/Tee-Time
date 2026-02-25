/**
 * Friend Profile data and actions hook
 */
import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { friendApi, DiscoveredUser } from "../../../services/api";
import { FriendProfileData } from "../types";

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

    const fetchProfile = useCallback(async () => {
        try {
            const response = await friendApi.getUserProfile(userId);
            if (response.success && response.profile) {
                const p = response.profile as Record<string, unknown>;
                const apiAvatar = (typeof p.avatar === "string" ? p.avatar : (p.avatarUrl as string) || "").trim();
                setProfile((prev) => {
                    const merged = { ...response.profile } as FriendProfileData;
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

    return {
        profile,
        loading,
        refreshing,
        actionLoading,
        onRefresh,
        handleAddFriend,
        handleAcceptRequest,
        handleRemoveFriend,
        handleMessage,
    };
};
