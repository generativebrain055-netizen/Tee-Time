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
    Flag,
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

    // Polished Friend Request Card
    const FriendRequestCard = ({ request }: { request: FriendRequest }) => (
        <View style={styles.friendCard}>
            {/* Gradient-like top accent */}
            <View style={styles.friendCardAccent} />

            <View style={styles.friendCardContent}>
                <View style={styles.friendCardHeader}>
                    <View style={styles.friendAvatarWrapper}>
                        {request.sender.avatar ? (
                            <Image source={{ uri: request.sender.avatar }} style={styles.friendAvatar} />
                        ) : (
                            <View style={styles.friendAvatarPlaceholder}>
                                <Text style={styles.friendAvatarInitials}>
                                    {getInitials(request.sender.firstName, request.sender.lastName)}
                                </Text>
                            </View>
                        )}
                        <View style={styles.friendBadge}>
                            <UserPlus size={10} color={COLORS.white} />
                        </View>
                    </View>

                    <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>
                            {request.sender.firstName} {request.sender.lastName}
                        </Text>
                        <Text style={styles.friendSubtext}>wants to connect</Text>
                    </View>

                    {request.sender.handicap && (
                        <View style={styles.handicapBadge}>
                            <Text style={styles.handicapValue}>{request.sender.handicap}</Text>
                            <Text style={styles.handicapLabel}>HCP</Text>
                        </View>
                    )}
                </View>

                <View style={styles.friendActions}>
                    <TouchableOpacity
                        style={styles.friendDeclineBtn}
                        onPress={() => handleRespondFriend(request.id, "declined")}
                        disabled={responding === request.id}
                    >
                        {responding === request.id ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                            <X size={20} color="#EF4444" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.friendAcceptBtn}
                        onPress={() => handleRespondFriend(request.id, "accepted")}
                        disabled={responding === request.id}
                    >
                        {responding === request.id ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <>
                                <Check size={18} color={COLORS.white} />
                                <Text style={styles.friendAcceptText}>Accept</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    // Polished Invite Card with Group Size
    const InviteCard = ({ invite }: { invite: Invite }) => {
        const [countdown, setCountdown] = useState<{ days: number; hours: number; mins: number; secs: number } | null>(null);
        const [isUrgent, setIsUrgent] = useState(false);
        const [isExpired, setIsExpired] = useState(false);

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

                setIsUrgent(totalSecs < 3600);
                setCountdown({ days, hours, mins, secs });
            };

            calculateCountdown();
            const interval = setInterval(calculateCountdown, 1000);
            return () => clearInterval(interval);
        }, [invite.expiresAt]);

        const padZero = (num: number) => num.toString().padStart(2, '0');

        return (
            <View style={[styles.inviteCard, isUrgent && styles.inviteCardUrgent]}>
                {/* Header with inviter info */}
                <View style={styles.inviteHeader}>
                    <View style={[styles.inviteIconCircle, isUrgent && styles.inviteIconCircleUrgent]}>
                        <Flag size={20} color={COLORS.white} />
                    </View>
                    <View style={styles.inviteHeaderText}>
                        <Text style={styles.inviteTitle}>Tee Time Invite</Text>
                        <Text style={styles.inviteFrom}>
                            from {invite.inviter?.firstName} {invite.inviter?.lastName}
                        </Text>
                    </View>
                    {invite.inviteType && (
                        <View style={[styles.inviteTypeBadge, invite.inviteType === 'fcfs' && styles.inviteTypeBadgeFCFS]}>
                            <Text style={styles.inviteTypeText}>
                                {invite.inviteType === 'fcfs' ? 'FCFS' : invite.inviteType.toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Course & Details Grid */}
                <View style={styles.detailsGrid}>
                    <View style={styles.detailsGridMain}>
                        <View style={styles.detailIconBox}>
                            <MapPin size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.detailsCourseName} numberOfLines={1}>
                            {invite.courseName}
                        </Text>
                    </View>

                    <View style={styles.detailsGridRow}>
                        <View style={styles.detailsGridItem}>
                            <View style={styles.detailIconBoxSmall}>
                                <Calendar size={14} color="#6B7280" />
                            </View>
                            <Text style={styles.detailsGridText}>{formatDate(invite.teeDate)}</Text>
                        </View>
                        <View style={styles.detailsGridItem}>
                            <View style={styles.detailIconBoxSmall}>
                                <Clock size={14} color="#6B7280" />
                            </View>
                            <Text style={styles.detailsGridText}>{invite.teeTime}</Text>
                        </View>
                        <View style={styles.detailsGridItem}>
                            <View style={styles.detailIconBoxSmall}>
                                <Users size={14} color="#6B7280" />
                            </View>
                            <Text style={styles.detailsGridText}>{invite.maxPlayers || 4} players</Text>
                        </View>
                    </View>
                </View>

                {/* Countdown Timer */}
                <View style={[
                    styles.countdownContainer,
                    isUrgent && styles.countdownContainerUrgent,
                    !invite.expiresAt && styles.countdownContainerNone
                ]}>
                    <View style={styles.countdownHeader}>
                        <Timer size={14} color={invite.expiresAt ? (isUrgent ? "#DC2626" : "#D97706") : "#9CA3AF"} />
                        <Text style={[
                            styles.countdownLabel,
                            isUrgent && styles.countdownLabelUrgent,
                            !invite.expiresAt && styles.countdownLabelNone
                        ]}>
                            {!invite.expiresAt ? "Response Window" : isExpired ? "Expired" : "Respond Within"}
                        </Text>
                    </View>

                    {invite.expiresAt && !isExpired && countdown && (
                        <View style={styles.countdownTimer}>
                            {countdown.days > 0 && (
                                <>
                                    <View style={[styles.countdownBlock, isUrgent && styles.countdownBlockUrgent]}>
                                        <Text style={[styles.countdownValue, isUrgent && styles.countdownValueUrgent]}>
                                            {countdown.days}
                                        </Text>
                                        <Text style={[styles.countdownUnit, isUrgent && styles.countdownUnitUrgent]}>D</Text>
                                    </View>
                                    <Text style={[styles.countdownSep, isUrgent && styles.countdownSepUrgent]}>:</Text>
                                </>
                            )}
                            <View style={[styles.countdownBlock, isUrgent && styles.countdownBlockUrgent]}>
                                <Text style={[styles.countdownValue, isUrgent && styles.countdownValueUrgent]}>
                                    {padZero(countdown.hours)}
                                </Text>
                                <Text style={[styles.countdownUnit, isUrgent && styles.countdownUnitUrgent]}>H</Text>
                            </View>
                            <Text style={[styles.countdownSep, isUrgent && styles.countdownSepUrgent]}>:</Text>
                            <View style={[styles.countdownBlock, isUrgent && styles.countdownBlockUrgent]}>
                                <Text style={[styles.countdownValue, isUrgent && styles.countdownValueUrgent]}>
                                    {padZero(countdown.mins)}
                                </Text>
                                <Text style={[styles.countdownUnit, isUrgent && styles.countdownUnitUrgent]}>M</Text>
                            </View>
                            <Text style={[styles.countdownSep, isUrgent && styles.countdownSepUrgent]}>:</Text>
                            <View style={[styles.countdownBlock, isUrgent && styles.countdownBlockUrgent]}>
                                <Text style={[styles.countdownValue, isUrgent && styles.countdownValueUrgent]}>
                                    {padZero(countdown.secs)}
                                </Text>
                                <Text style={[styles.countdownUnit, isUrgent && styles.countdownUnitUrgent]}>S</Text>
                            </View>
                        </View>
                    )}

                    {invite.expiresAt && isExpired && (
                        <Text style={styles.expiredText}>This invite has expired</Text>
                    )}

                    {!invite.expiresAt && (
                        <Text style={styles.noDeadlineText}>No deadline set</Text>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.inviteActions}>
                    <TouchableOpacity
                        style={[styles.inviteDeclineBtn, isExpired && styles.inviteBtnDisabled]}
                        onPress={() => handleRespondInvite(invite.id, "declined")}
                        disabled={responding === invite.id || isExpired}
                    >
                        {responding === invite.id ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                            <>
                                <X size={18} color={isExpired ? "#9CA3AF" : "#EF4444"} />
                                <Text style={[styles.inviteDeclineText, isExpired && styles.inviteBtnTextDisabled]}>
                                    Decline
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.inviteAcceptBtn, isExpired && styles.inviteBtnDisabled]}
                        onPress={() => handleRespondInvite(invite.id, "accepted")}
                        disabled={responding === invite.id || isExpired}
                    >
                        {responding === invite.id ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <>
                                <Check size={18} color={COLORS.white} />
                                <Text style={styles.inviteAcceptText}>Accept</Text>
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
                    {friendRequests.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIconBox}>
                                    <UserPlus size={14} color={COLORS.primary} />
                                </View>
                                <Text style={styles.sectionTitle}>Friend Requests</Text>
                                <View style={styles.sectionCount}>
                                    <Text style={styles.sectionCountText}>{friendRequests.length}</Text>
                                </View>
                            </View>
                            {friendRequests.map((request) => (
                                <FriendRequestCard key={request.id} request={request} />
                            ))}
                        </View>
                    )}

                    {invites.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIconBox, { backgroundColor: "#FEF3C7" }]}>
                                    <Flag size={14} color="#D97706" />
                                </View>
                                <Text style={styles.sectionTitle}>Tee Time Invites</Text>
                                <View style={[styles.sectionCount, { backgroundColor: "#FEF3C7" }]}>
                                    <Text style={[styles.sectionCountText, { color: "#D97706" }]}>{invites.length}</Text>
                                </View>
                            </View>
                            {invites.map((invite) => (
                                <InviteCard key={invite.id} invite={invite} />
                            ))}
                        </View>
                    )}
                </>
            ) : (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                        <UserPlus size={32} color="#9CA3AF" />
                    </View>
                    <Text style={styles.emptyTitle}>All Caught Up!</Text>
                    <Text style={styles.emptyText}>
                        No pending requests right now.{"\n"}Check back later for new invites.
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
        backgroundColor: "#F8FAFC",
        paddingHorizontal: 16,
    },
    section: {
        marginTop: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionIconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: "#E8F5E9",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textMain,
        flex: 1,
    },
    sectionCount: {
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sectionCountText: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.primary,
    },

    // Friend Request Card
    friendCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        marginBottom: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    friendCardAccent: {
        height: 4,
        backgroundColor: COLORS.primary,
    },
    friendCardContent: {
        padding: 16,
    },
    friendCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    friendAvatarWrapper: {
        position: "relative",
        marginRight: 14,
    },
    friendAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    friendAvatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#E0E7FF",
        justifyContent: "center",
        alignItems: "center",
    },
    friendAvatarInitials: {
        fontSize: 18,
        fontWeight: "700",
        color: "#4F46E5",
    },
    friendBadge: {
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textMain,
    },
    friendSubtext: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    handicapBadge: {
        backgroundColor: "#F0FDF4",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        alignItems: "center",
    },
    handicapValue: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.primary,
    },
    handicapLabel: {
        fontSize: 9,
        fontWeight: "600",
        color: "#6B7280",
        marginTop: 1,
    },
    friendActions: {
        flexDirection: "row",
        gap: 12,
    },
    friendDeclineBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
    },
    friendAcceptBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    friendAcceptText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },

    // Invite Card
    inviteCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    inviteCardUrgent: {
        borderWidth: 1.5,
        borderColor: "#FECACA",
    },
    inviteHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    inviteIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    inviteIconCircleUrgent: {
        backgroundColor: "#DC2626",
    },
    inviteHeaderText: {
        flex: 1,
    },
    inviteTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textMain,
    },
    inviteFrom: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    inviteTypeBadge: {
        backgroundColor: "#E0E7FF",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    inviteTypeBadgeFCFS: {
        backgroundColor: "#FEF3C7",
    },
    inviteTypeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#4F46E5",
    },

    // Details Grid
    detailsGrid: {
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
    },
    detailsGridMain: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    detailIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#E8F5E9",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    detailsCourseName: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
        flex: 1,
    },
    detailsGridRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    detailsGridItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    detailIconBoxSmall: {
        width: 26,
        height: 26,
        borderRadius: 6,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 6,
    },
    detailsGridText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#4B5563",
    },

    // Countdown
    countdownContainer: {
        backgroundColor: "#FFFBEB",
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#FDE68A",
    },
    countdownContainerUrgent: {
        backgroundColor: "#FEF2F2",
        borderColor: "#FECACA",
    },
    countdownContainerNone: {
        backgroundColor: "#F3F4F6",
        borderColor: "#E5E7EB",
    },
    countdownHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginBottom: 10,
    },
    countdownLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#D97706",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    countdownLabelUrgent: {
        color: "#DC2626",
    },
    countdownLabelNone: {
        color: "#6B7280",
    },
    countdownTimer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    countdownBlock: {
        backgroundColor: "#FEF3C7",
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        minWidth: 48,
        alignItems: "center",
    },
    countdownBlockUrgent: {
        backgroundColor: "#FEE2E2",
    },
    countdownValue: {
        fontSize: 22,
        fontWeight: "800",
        color: "#92400E",
        fontVariant: ["tabular-nums"],
    },
    countdownValueUrgent: {
        color: "#DC2626",
    },
    countdownUnit: {
        fontSize: 10,
        fontWeight: "700",
        color: "#B45309",
        marginTop: 2,
    },
    countdownUnitUrgent: {
        color: "#991B1B",
    },
    countdownSep: {
        fontSize: 22,
        fontWeight: "800",
        color: "#92400E",
        marginHorizontal: 4,
        marginBottom: 14,
    },
    countdownSepUrgent: {
        color: "#DC2626",
    },
    expiredText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#991B1B",
        textAlign: "center",
    },
    noDeadlineText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#6B7280",
        textAlign: "center",
    },

    // Invite Actions
    inviteActions: {
        flexDirection: "row",
        gap: 12,
    },
    inviteDeclineBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEE2E2",
        borderRadius: 12,
        paddingVertical: 14,
        gap: 6,
    },
    inviteAcceptBtn: {
        flex: 1.5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        gap: 6,
    },
    inviteBtnDisabled: {
        backgroundColor: "#E5E7EB",
        opacity: 0.7,
    },
    inviteDeclineText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#EF4444",
    },
    inviteAcceptText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },
    inviteBtnTextDisabled: {
        color: "#9CA3AF",
    },

    // Empty State
    emptyState: {
        alignItems: "center",
        paddingVertical: 80,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.textMain,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        lineHeight: 20,
    },
});
