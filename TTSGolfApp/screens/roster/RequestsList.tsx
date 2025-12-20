import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from "react-native";
import {
    Calendar,
    MapPin,
    Clock,
    Check,
    X,
    Users,
    UserPlus,
} from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { inviteApi, friendApi, Invite, FriendRequest } from "../../services/api";

export default function RequestsList() {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [responding, setResponding] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [inviteRes, friendRes] = await Promise.all([
                inviteApi.getPendingInvites(),
                friendApi.getPendingRequests(),
            ]);
            if (inviteRes.success) setInvites(inviteRes.invites);
            if (friendRes.success) setFriendRequests(friendRes.requests);
        } catch (error) {
            console.error("Failed to load requests:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
    }, [loadData]);

    const handleRespondInvite = async (
        inviteId: string,
        response: "accepted" | "declined"
    ) => {
        setResponding(inviteId);
        try {
            const result = await inviteApi.respondToInvite(inviteId, response);
            if (result.success) {
                setInvites((prev) => prev.filter((i) => i.id !== inviteId));
                Alert.alert(
                    response === "accepted" ? "Accepted!" : "Declined",
                    response === "accepted"
                        ? "You've been added to the tee time!"
                        : "You've declined the invite."
                );
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to respond");
        } finally {
            setResponding(null);
        }
    };

    const handleRespondFriend = async (
        requestId: string,
        response: "accepted" | "declined"
    ) => {
        setResponding(requestId);
        try {
            const result = await friendApi.respondToRequest(requestId, response);
            if (result.success) {
                setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
                Alert.alert(
                    response === "accepted" ? "Friend Added!" : "Request Declined",
                    response === "accepted"
                        ? "You are now friends!"
                        : "Friend request declined."
                );
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to respond");
        } finally {
            setResponding(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    };

    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    const FriendRequestCard = ({ request }: { request: FriendRequest }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                    {request.sender.avatar ? (
                        <Image source={{ uri: request.sender.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitials}>
                                {getInitials(request.sender.firstName, request.sender.lastName)}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>
                        {request.sender.firstName} {request.sender.lastName}
                    </Text>
                    <Text style={styles.requestLabel}>wants to be your friend</Text>
                    {request.sender.handicap && (
                        <Text style={styles.handicapText}>HCP {request.sender.handicap}</Text>
                    )}
                </View>
                <UserPlus size={20} color={COLORS.primary} />
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => handleRespondFriend(request.id, "declined")}
                    disabled={responding === request.id}
                >
                    {responding === request.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                        <>
                            <X size={16} color="#EF4444" />
                            <Text style={styles.declineBtnText}>Decline</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleRespondFriend(request.id, "accepted")}
                    disabled={responding === request.id}
                >
                    {responding === request.id ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <>
                            <Check size={16} color={COLORS.white} />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const InviteCard = ({ invite }: { invite: Invite }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.inviterInfo}>
                    <View style={styles.inviterAvatar}>
                        <Users size={18} color={COLORS.white} />
                    </View>
                    <View style={styles.inviterText}>
                        <Text style={styles.inviterName}>
                            {invite.inviter?.firstName} {invite.inviter?.lastName}
                        </Text>
                        <Text style={styles.inviteLabel}>invited you to play</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                    <MapPin size={16} color={COLORS.textSub} />
                    <Text style={styles.detailText}>{invite.courseName}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Calendar size={16} color={COLORS.textSub} />
                    <Text style={styles.detailText}>{formatDate(invite.teeDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Clock size={16} color={COLORS.textSub} />
                    <Text style={styles.detailText}>{invite.teeTime}</Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => handleRespondInvite(invite.id, "declined")}
                    disabled={responding === invite.id}
                >
                    {responding === invite.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                        <>
                            <X size={16} color="#EF4444" />
                            <Text style={styles.declineBtnText}>Decline</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleRespondInvite(invite.id, "accepted")}
                    disabled={responding === invite.id}
                >
                    {responding === invite.id ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <>
                            <Check size={16} color={COLORS.white} />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const hasRequests = friendRequests.length > 0 || invites.length > 0;

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={COLORS.primary}
                />
            }
        >
            {loading ? (
                <ActivityIndicator
                    size="large"
                    color={COLORS.primary}
                    style={{ marginTop: 40 }}
                />
            ) : hasRequests ? (
                <>
                    {/* Friend Requests Section */}
                    {friendRequests.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Friend Requests</Text>
                            {friendRequests.map((request) => (
                                <FriendRequestCard key={request.id} request={request} />
                            ))}
                        </>
                    )}

                    {/* Tee Time Invites Section */}
                    {invites.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Tee Time Invites</Text>
                            {invites.map((invite) => (
                                <InviteCard key={invite.id} invite={invite} />
                            ))}
                        </>
                    )}
                </>
            ) : (
                <View style={styles.emptyState}>
                    <UserPlus size={48} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No Pending Requests</Text>
                    <Text style={styles.emptyText}>
                        Friend requests and tee time invites will appear here
                    </Text>
                </View>
            )}
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
        marginTop: 16,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: "#FAFAFA",
        borderRadius: 12,
        padding: 14,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    requestInfo: {
        flex: 1,
    },
    requestName: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    requestLabel: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    handicapText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: "500",
        marginTop: 4,
    },
    inviterInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    inviterAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    inviterText: {
        marginLeft: 10,
    },
    inviterName: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    inviteLabel: {
        fontSize: 12,
        color: COLORS.textSub,
    },
    cardBody: {
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    detailText: {
        fontSize: 13,
        color: COLORS.textMain,
        marginLeft: 8,
    },
    cardActions: {
        flexDirection: "row",
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 8,
        gap: 4,
    },
    declineBtn: {
        backgroundColor: "#FEE2E2",
    },
    acceptBtn: {
        backgroundColor: COLORS.primary,
    },
    declineBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#EF4444",
    },
    acceptBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.white,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 13,
        color: COLORS.textSub,
        textAlign: "center",
        marginTop: 8,
        paddingHorizontal: 24,
    },
});
