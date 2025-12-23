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
    Timer,
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

    const InviteCard = ({ invite }: { invite: Invite }) => {
        const [countdown, setCountdown] = useState<{ days: number; hours: number; mins: number; secs: number } | null>(null);
        const [isUrgent, setIsUrgent] = useState(false);
        const [isExpired, setIsExpired] = useState(false);

        // Real-time countdown timer - updates every second
        useEffect(() => {
            if (!invite.expiresAt) {
                setCountdown(null);
                return;
            }

            const calculateCountdown = () => {
                const expiresAt = new Date(invite.expiresAt!);
                const now = new Date();
                const diffMs = expiresAt.getTime() - now.getTime();

                if (diffMs <= 0) {
                    setIsExpired(true);
                    setIsUrgent(true);
                    setCountdown(null);
                    return;
                }

                const totalSecs = Math.floor(diffMs / 1000);
                const days = Math.floor(totalSecs / 86400);
                const hours = Math.floor((totalSecs % 86400) / 3600);
                const mins = Math.floor((totalSecs % 3600) / 60);
                const secs = totalSecs % 60;

                setIsUrgent(totalSecs < 3600); // Urgent if < 1 hour
                setCountdown({ days, hours, mins, secs });
            };

            calculateCountdown();
            const interval = setInterval(calculateCountdown, 1000);
            return () => clearInterval(interval);
        }, [invite.expiresAt]);

        const padZero = (num: number) => num.toString().padStart(2, '0');

        return (
            <View style={[styles.card, isUrgent && styles.cardUrgent]}>
                <View style={styles.cardHeader}>
                    <View style={styles.inviterInfo}>
                        <View style={[styles.inviterAvatar, isUrgent && styles.inviterAvatarUrgent]}>
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

                {/* Countdown Timer Section */}
                <View style={[styles.countdownSection, isUrgent && styles.countdownSectionUrgent, !invite.expiresAt && styles.countdownSectionNoDeadline]}>
                    <View style={styles.countdownTitleRow}>
                        <Timer size={14} color={invite.expiresAt ? (isUrgent ? "#DC2626" : "#D97706") : "#6B7280"} />
                        <Text style={[styles.countdownTitle, isUrgent && styles.countdownTitleUrgent, !invite.expiresAt && styles.countdownTitleNoDeadline]}>
                            {!invite.expiresAt ? "Response Window" : isExpired ? "Invite Expired" : "Time Remaining"}
                        </Text>
                    </View>

                    {invite.expiresAt && !isExpired && countdown && (
                        <View style={styles.countdownBoxes}>
                            {countdown.days > 0 && (
                                <>
                                    <View style={[styles.countdownBox, isUrgent && styles.countdownBoxUrgent]}>
                                        <Text style={[styles.countdownNum, isUrgent && styles.countdownNumUrgent]}>
                                            {countdown.days}
                                        </Text>
                                        <Text style={[styles.countdownUnit, isUrgent && styles.countdownUnitUrgent]}>
                                            DAY{countdown.days > 1 ? 'S' : ''}
                                        </Text>
                                    </View>
                                    <Text style={[styles.countdownColon, isUrgent && styles.countdownColonUrgent]}>:</Text>
                                </>
                            )}
                            <View style={[styles.countdownBox, isUrgent && styles.countdownBoxUrgent]}>
                                <Text style={[styles.countdownNum, isUrgent && styles.countdownNumUrgent]}>
                                    {padZero(countdown.hours)}
                                </Text>
                                <Text style={[styles.countdownUnit, isUrgent && styles.countdownUnitUrgent]}>HRS</Text>
                            </View>
                            <Text style={[styles.countdownColon, isUrgent && styles.countdownColonUrgent]}>:</Text>
                            <View style={[styles.countdownBox, isUrgent && styles.countdownBoxUrgent]}>
                                <Text style={[styles.countdownNum, isUrgent && styles.countdownNumUrgent]}>
                                    {padZero(countdown.mins)}
                                </Text>
                                <Text style={[styles.countdownUnit, isUrgent && styles.countdownUnitUrgent]}>MIN</Text>
                            </View>
                            <Text style={[styles.countdownColon, isUrgent && styles.countdownColonUrgent]}>:</Text>
                            <View style={[styles.countdownBox, isUrgent && styles.countdownBoxUrgent]}>
                                <Text style={[styles.countdownNum, isUrgent && styles.countdownNumUrgent]}>
                                    {padZero(countdown.secs)}
                                </Text>
                                <Text style={[styles.countdownUnit, isUrgent && styles.countdownUnitUrgent]}>SEC</Text>
                            </View>
                        </View>
                    )}

                    {invite.expiresAt && isExpired && (
                        <Text style={styles.expiredMessage}>
                            This invite has expired
                        </Text>
                    )}

                    {!invite.expiresAt && (
                        <Text style={styles.noDeadlineMessage}>
                            No deadline — respond at your convenience
                        </Text>
                    )}
                </View>

                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.declineBtn, isExpired && styles.actionBtnDisabled]}
                        onPress={() => handleRespondInvite(invite.id, "declined")}
                        disabled={responding === invite.id || isExpired}
                    >
                        {responding === invite.id ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                            <>
                                <X size={16} color={isExpired ? "#9CA3AF" : "#EF4444"} />
                                <Text style={[styles.declineBtnText, isExpired && styles.btnTextDisabled]}>Decline</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn, isExpired && styles.actionBtnDisabled]}
                        onPress={() => handleRespondInvite(invite.id, "accepted")}
                        disabled={responding === invite.id || isExpired}
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
    };

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
    cardUrgent: {
        borderColor: "#FECACA",
        backgroundColor: "#FFFBFB",
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
    inviterAvatarUrgent: {
        backgroundColor: "#DC2626",
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
    // Countdown Section
    countdownSection: {
        backgroundColor: "#FFFBEB",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#FDE68A",
    },
    countdownSectionUrgent: {
        backgroundColor: "#FEF2F2",
        borderColor: "#FECACA",
    },
    countdownSectionNoDeadline: {
        backgroundColor: "#F3F4F6",
        borderColor: "#E5E7EB",
    },
    countdownTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginBottom: 10,
    },
    countdownTitle: {
        fontSize: 11,
        fontWeight: "600",
        color: "#D97706",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    countdownTitleUrgent: {
        color: "#DC2626",
    },
    countdownTitleNoDeadline: {
        color: "#6B7280",
    },
    countdownBoxes: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    countdownBox: {
        backgroundColor: "#FEF3C7",
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 8,
        minWidth: 44,
        alignItems: "center",
    },
    countdownBoxUrgent: {
        backgroundColor: "#FEE2E2",
    },
    countdownNum: {
        fontSize: 20,
        fontWeight: "700",
        color: "#92400E",
        fontVariant: ["tabular-nums"],
    },
    countdownNumUrgent: {
        color: "#DC2626",
    },
    countdownUnit: {
        fontSize: 8,
        fontWeight: "600",
        color: "#B45309",
        marginTop: 1,
        letterSpacing: 0.5,
    },
    countdownUnitUrgent: {
        color: "#991B1B",
    },
    countdownColon: {
        fontSize: 20,
        fontWeight: "700",
        color: "#92400E",
        marginHorizontal: 3,
        marginBottom: 12,
    },
    countdownColonUrgent: {
        color: "#DC2626",
    },
    expiredMessage: {
        fontSize: 12,
        color: "#991B1B",
        textAlign: "center",
    },
    noDeadlineMessage: {
        fontSize: 12,
        color: "#6B7280",
        textAlign: "center",
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
    actionBtnDisabled: {
        backgroundColor: "#E5E7EB",
        opacity: 0.7,
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
    btnTextDisabled: {
        color: "#9CA3AF",
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
