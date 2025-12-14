import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
    ArrowLeft,
    MapPin,
    Clock,
    Award,
    UserPlus,
    Check,
    UserMinus,
    Star,
} from "lucide-react-native";
import { friendApi, DiscoveredUser } from "../services/api";

const COLORS = {
    primary: "#5DB075",
    bg: "#F6F6F6",
    white: "#FFFFFF",
    text: "#1F2937",
    textSub: "#9CA3AF",
    border: "#E5E7EB",
    requested: "#F59E0B",
    danger: "#EF4444",
};

interface Props {
    navigation: any;
    route: { params: { userId: string; user?: DiscoveredUser } };
}

export default function FriendProfileScreen({ navigation, route }: Props) {
    const { userId, user: initialUser } = route.params;
    const [profile, setProfile] = useState<DiscoveredUser | null>(initialUser || null);
    const [loading, setLoading] = useState(!initialUser);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!initialUser) {
            fetchProfile();
        }
    }, [userId]);

    const fetchProfile = async () => {
        try {
            const response = await friendApi.getUserProfile(userId);
            if (response.success) {
                setProfile(response.profile);
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async () => {
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
    };

    const handleAcceptRequest = async () => {
        // Need to get the request ID - for now we'll refetch
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
    };

    const handleRemoveFriend = async () => {
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
    };

    const renderActionButton = () => {
        if (!profile) return null;

        if (actionLoading) {
            return (
                <View style={[styles.actionButton, styles.loadingButton]}>
                    <ActivityIndicator color={COLORS.white} />
                </View>
            );
        }

        switch (profile.friendshipStatus) {
            case "friend":
                return (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.friendsButton]}
                        onPress={handleRemoveFriend}
                    >
                        <UserMinus size={20} color={COLORS.danger} />
                        <Text style={[styles.actionText, { color: COLORS.danger }]}>Remove Friend</Text>
                    </TouchableOpacity>
                );
            case "requested":
                return (
                    <View style={[styles.actionButton, styles.requestedBtn]}>
                        <Clock size={20} color={COLORS.requested} />
                        <Text style={[styles.actionText, { color: COLORS.requested }]}>Requested</Text>
                    </View>
                );
            case "pending":
                return (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={handleAcceptRequest}
                    >
                        <Check size={20} color={COLORS.white} />
                        <Text style={[styles.actionText, { color: COLORS.white }]}>Accept Request</Text>
                    </TouchableOpacity>
                );
            default:
                return (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.addFriendButton]}
                        onPress={handleAddFriend}
                    >
                        <UserPlus size={20} color={COLORS.white} />
                        <Text style={[styles.actionText, { color: COLORS.white }]}>Add Friend</Text>
                    </TouchableOpacity>
                );
        }
    };


    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>User not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        {profile.avatar ? (
                            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitial}>
                                    {profile.firstName?.charAt(0) || "?"}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.profileName}>
                        {profile.firstName} {profile.lastName}
                    </Text>
                    {profile.username && (
                        <Text style={styles.username}>@{profile.username}</Text>
                    )}
                </View>

                {renderActionButton()}

                <View style={styles.statsRow}>
                    {profile.handicap !== undefined && (
                        <View style={styles.statItem}>
                            <Award size={20} color={COLORS.primary} />
                            <Text style={styles.statValue}>{profile.handicap}</Text>
                            <Text style={styles.statLabel}>Handicap</Text>
                        </View>
                    )}
                    {profile.socialRate !== undefined && (
                        <View style={styles.statItem}>
                            <Star size={20} color={COLORS.primary} />
                            <Text style={styles.statValue}>{profile.socialRate.toFixed(1)}</Text>
                            <Text style={styles.statLabel}>Social Rate</Text>
                        </View>
                    )}
                </View>

                <View style={styles.infoSection}>
                    {profile.homeCourse && (
                        <View style={styles.infoRow}>
                            <MapPin size={18} color={COLORS.textSub} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Home Course</Text>
                                <Text style={styles.infoValue}>{profile.homeCourse}</Text>
                            </View>
                        </View>
                    )}
                    {profile.location && (
                        <View style={styles.infoRow}>
                            <MapPin size={18} color={COLORS.textSub} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Location</Text>
                                <Text style={styles.infoValue}>{profile.location}</Text>
                            </View>
                        </View>
                    )}
                    {profile.preferredTeeTime && (
                        <View style={styles.infoRow}>
                            <Clock size={18} color={COLORS.textSub} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Preferred Tee Time</Text>
                                <Text style={styles.infoValue}>{profile.preferredTeeTime}</Text>
                            </View>
                        </View>
                    )}
                    {profile.walkOrRide && (
                        <View style={styles.infoRow}>
                            <Award size={18} color={COLORS.textSub} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Play Style</Text>
                                <Text style={styles.infoValue}>
                                    {profile.walkOrRide === "walk" ? "Walker" : profile.walkOrRide === "ride" ? "Rider" : "Either"}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    centered: { justifyContent: "center", alignItems: "center" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: { width: 40, height: 40, justifyContent: "center" },
    headerTitle: { fontSize: 18, fontWeight: "600", color: COLORS.text },
    content: { flex: 1 },
    profileHeader: { alignItems: "center", paddingVertical: 24, backgroundColor: COLORS.white },
    avatarContainer: { marginBottom: 16 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitial: { fontSize: 40, fontWeight: "bold", color: COLORS.white },
    profileName: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
    username: { fontSize: 15, color: COLORS.textSub, marginTop: 4 },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 20,
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    addFriendButton: { backgroundColor: COLORS.primary },
    acceptButton: { backgroundColor: COLORS.primary },
    requestedBtn: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: COLORS.requested },
    friendsButton: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
    loadingButton: { backgroundColor: COLORS.primary },
    actionText: { fontSize: 16, fontWeight: "600" },
    statsRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 40,
        paddingVertical: 20,
        marginTop: 16,
        marginHorizontal: 20,
        backgroundColor: COLORS.white,
        borderRadius: 12,
    },
    statItem: { alignItems: "center", gap: 4 },
    statValue: { fontSize: 22, fontWeight: "bold", color: COLORS.text },
    statLabel: { fontSize: 13, color: COLORS.textSub },
    infoSection: {
        marginTop: 16,
        marginHorizontal: 20,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
    },
    infoRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, gap: 12 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 13, color: COLORS.textSub },
    infoValue: { fontSize: 15, fontWeight: "500", color: COLORS.text, marginTop: 2 },
    errorText: { fontSize: 16, color: COLORS.textSub },
});
