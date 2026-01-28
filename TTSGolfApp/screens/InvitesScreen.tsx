import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
    Calendar,
    MapPin,
    Clock,
    Check,
    X,
    Users,
    AlertTriangle,
    Timer,
} from "lucide-react-native";
import { Header } from "../components/common";
import { inviteApi, Invite } from "../services/api";
import { COLORS } from "../constants/colors";

export default function InvitesScreen({ navigation }: any) {
    const [activeTab, setActiveTab] = useState<"pending" | "sent">("pending");
    const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
    const [sentInvites, setSentInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [responding, setResponding] = useState<string | null>(null);

    useEffect(() => {
        loadInvites();
    }, []);

    const loadInvites = async () => {
        try {
            const [pendingRes, sentRes] = await Promise.all([
                inviteApi.getPendingInvites(),
                inviteApi.getSentInvites(),
            ]);
            if (pendingRes.success) setPendingInvites(pendingRes.invites);
            if (sentRes.success) setSentInvites(sentRes.invites);
        } catch (error) {
            console.error("Failed to load invites:", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadInvites();
        setRefreshing(false);
    }, []);

    const handleRespond = async (inviteId: string, response: "accepted" | "declined") => {
        setResponding(inviteId);
        try {
            const result = await inviteApi.respondToInvite(inviteId, response);
            if (result.success) {
                setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
                Alert.alert(
                    response === "accepted" ? "Accepted!" : "Declined",
                    response === "accepted"
                        ? "You've been added to the tee time!"
                        : "You've declined the invite."
                );
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to respond to invite");
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

    const TabBar = () => (
        <View style={styles.tabBar}>
            <TouchableOpacity
                style={[styles.tab, activeTab === "pending" && styles.tabActive]}
                onPress={() => setActiveTab("pending")}
            >
                <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
                    Received ({pendingInvites.length})
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === "sent" && styles.tabActive]}
                onPress={() => setActiveTab("sent")}
            >
                <Text style={[styles.tabText, activeTab === "sent" && styles.tabTextActive]}>
                    Sent ({sentInvites.length})
                </Text>
            </TouchableOpacity>
        </View>
    );

    const PendingInviteCard = ({ invite }: { invite: Invite }) => {
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
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.inviterInfo}>
                        <View style={[styles.inviterAvatar, isUrgent && styles.inviterAvatarUrgent]}>
                            <Users size={18} color={COLORS.white} />
                        </View>
                        <View>
                            <Text style={styles.inviterName}>
                                {invite.inviter?.firstName} {invite.inviter?.lastName}
                            </Text>
                            <Text style={styles.inviteSubtext}>invited you to play</Text>
                        </View>
                    </View>
                </View>

                {/* Details Section */}
                <View style={styles.detailsSection}>
                    <View style={styles.detailItem}>
                        <View style={styles.detailIconBox}>
                            <MapPin size={16} color={COLORS.primary} />
                        </View>
                        <View style={styles.detailTextBox}>
                            <Text style={styles.detailLabel}>Course</Text>
                            <Text style={styles.detailValue}>{invite.courseName}</Text>
                        </View>
                    </View>

                    <View style={styles.detailsDivider} />

                    <View style={styles.detailsRow}>
                        <View style={styles.detailItemHalf}>
                            <View style={styles.detailIconBox}>
                                <Calendar size={16} color={COLORS.primary} />
                            </View>
                            <View style={styles.detailTextBox}>
                                <Text style={styles.detailLabel}>Date</Text>
                                <Text style={styles.detailValue}>{formatDate(invite.teeDate)}</Text>
                            </View>
                        </View>
                        <View style={styles.detailItemHalf}>
                            <View style={styles.detailIconBox}>
                                <Clock size={16} color={COLORS.primary} />
                            </View>
                            <View style={styles.detailTextBox}>
                                <Text style={styles.detailLabel}>Time</Text>
                                <Text style={styles.detailValue}>{invite.teeTime}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Countdown Timer - Always show response window info */}
                <View style={[styles.countdownSection, isUrgent && styles.countdownSectionUrgent, !invite.expiresAt && styles.countdownSectionNoDeadline]}>
                    <View style={styles.countdownTitleRow}>
                        <Timer size={16} color={invite.expiresAt ? (isUrgent ? "#DC2626" : "#D97706") : "#6B7280"} />
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
                            This invite has expired. The spot may have been offered to someone else.
                        </Text>
                    )}

                    {!invite.expiresAt && (
                        <Text style={styles.noDeadlineMessage}>
                            No deadline set — respond at your convenience
                        </Text>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.declineBtn, isExpired && styles.actionBtnDisabled]}
                        onPress={() => handleRespond(invite.id, "declined")}
                        disabled={responding === invite.id || isExpired}
                    >
                        {responding === invite.id ? (
                            <ActivityIndicator size="small" color={COLORS.red} />
                        ) : (
                            <>
                                <X size={18} color={isExpired ? "#9CA3AF" : COLORS.red} />
                                <Text style={[styles.declineBtnText, isExpired && styles.btnTextDisabled]}>Decline</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn, isExpired && styles.actionBtnDisabled]}
                        onPress={() => handleRespond(invite.id, "accepted")}
                        disabled={responding === invite.id || isExpired}
                    >
                        {responding === invite.id ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <>
                                <Check size={18} color={COLORS.white} />
                                <Text style={styles.acceptBtnText}>Accept</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const SentInviteCard = ({ invite }: { invite: Invite }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.courseName}>{invite.courseName}</Text>
                <View style={[styles.statusBadge, styles[`status_${invite.status}` as keyof typeof styles]]}>
                    <Text style={styles.statusText}>{invite.status}</Text>
                </View>
            </View>
            <View style={styles.sentCardBody}>
                <View style={styles.sentDetailRow}>
                    <Calendar size={16} color={COLORS.textSub} />
                    <Text style={styles.sentDetailText}>{formatDate(invite.teeDate)}</Text>
                </View>
                <View style={styles.sentDetailRow}>
                    <Users size={16} color={COLORS.textSub} />
                    <Text style={styles.sentDetailText}>
                        To: {invite.invitee?.name || invite.invitee?.phone}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Header title="Invites" onBack={() => navigation?.goBack()} />
            <TabBar />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : activeTab === "pending" ? (
                    pendingInvites.length > 0 ? (
                        pendingInvites.map((invite) => (
                            <PendingInviteCard key={invite.id} invite={invite} />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Calendar size={48} color="#D1D5DB" />
                            <Text style={styles.emptyTitle}>No Pending Invites</Text>
                            <Text style={styles.emptyText}>
                                When someone invites you to a tee time, it will appear here
                            </Text>
                        </View>
                    )
                ) : sentInvites.length > 0 ? (
                    sentInvites.map((invite) => <SentInviteCard key={invite.id} invite={invite} />)
                ) : (
                    <View style={styles.emptyState}>
                        <Users size={48} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No Sent Invites</Text>
                        <Text style={styles.emptyText}>
                            Create a tee time and invite your golf buddies!
                        </Text>
                    </View>
                )}
                <View style={{ height: 20 }} />
            </ScrollView>
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    tabBar: {
        flexDirection: "row",
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
    },
    tabActive: { backgroundColor: COLORS.primary },
    tabText: { fontSize: 14, fontWeight: "600", color: COLORS.textSub },
    tabTextActive: { color: COLORS.white },
    content: { flex: 1, padding: 16 },

    // Card Styles
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    cardUrgent: {
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    inviterInfo: { flexDirection: "row", alignItems: "center" },
    inviterAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    inviterAvatarUrgent: {
        backgroundColor: "#DC2626",
    },
    inviterName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
    inviteSubtext: { fontSize: 13, color: COLORS.textSub, marginTop: 1 },

    // Details Section
    detailsSection: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    detailIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#E8F5E9",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    detailTextBox: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 11,
        color: COLORS.textSub,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
        marginTop: 2,
    },
    detailsDivider: {
        height: 1,
        backgroundColor: "#E5E7EB",
        marginVertical: 12,
    },
    detailsRow: {
        flexDirection: "row",
    },
    detailItemHalf: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },

    // Countdown Section
    countdownSection: {
        backgroundColor: "#FFFBEB",
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
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
        gap: 8,
        marginBottom: 12,
    },
    countdownTitle: {
        fontSize: 13,
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
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        minWidth: 52,
        alignItems: "center",
    },
    countdownBoxUrgent: {
        backgroundColor: "#FEE2E2",
    },
    countdownNum: {
        fontSize: 26,
        fontWeight: "700",
        color: "#92400E",
        fontVariant: ["tabular-nums"],
    },
    countdownNumUrgent: {
        color: "#DC2626",
    },
    countdownUnit: {
        fontSize: 9,
        fontWeight: "600",
        color: "#B45309",
        marginTop: 2,
        letterSpacing: 0.5,
    },
    countdownUnitUrgent: {
        color: "#991B1B",
    },
    countdownColon: {
        fontSize: 26,
        fontWeight: "700",
        color: "#92400E",
        marginHorizontal: 4,
        marginBottom: 16,
    },
    countdownColonUrgent: {
        color: "#DC2626",
    },
    expiredMessage: {
        fontSize: 13,
        color: "#991B1B",
        textAlign: "center",
        lineHeight: 18,
    },
    noDeadlineMessage: {
        fontSize: 13,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 18,
    },

    // Action Buttons
    cardActions: { flexDirection: "row", gap: 12 },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    declineBtn: { backgroundColor: "#FEE2E2" },
    acceptBtn: { backgroundColor: COLORS.primary },
    actionBtnDisabled: { backgroundColor: "#E5E7EB", opacity: 0.7 },
    declineBtnText: { fontSize: 15, fontWeight: "600", color: COLORS.red },
    acceptBtnText: { fontSize: 15, fontWeight: "600", color: COLORS.white },
    btnTextDisabled: { color: "#9CA3AF" },

    // Sent Card
    courseName: { fontSize: 16, fontWeight: "bold", color: COLORS.text, flex: 1 },
    sentCardBody: { marginTop: 4 },
    sentDetailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    sentDetailText: { fontSize: 14, color: COLORS.text, marginLeft: 8 },

    // Status Badge
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    status_pending: { backgroundColor: "#FEF3C7" },
    status_accepted: { backgroundColor: "#D1FAE5" },
    status_declined: { backgroundColor: "#FEE2E2" },
    status_expired: { backgroundColor: "#F3F4F6" },
    status_waitlist: { backgroundColor: "#E0E7FF" },
    statusText: { fontSize: 12, fontWeight: "600", color: COLORS.text, textTransform: "capitalize" },

    // Empty State
    emptyState: { alignItems: "center", paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text, marginTop: 16 },
    emptyText: { fontSize: 14, color: COLORS.textSub, textAlign: "center", marginTop: 8, paddingHorizontal: 32 },
});
