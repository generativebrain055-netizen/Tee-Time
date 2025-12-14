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
    ArrowLeft,
    Calendar,
    MapPin,
    Clock,
    Check,
    X,
    Users,
} from "lucide-react-native";
import { inviteApi, Invite } from "../services/api";

const COLORS = {
    primary: "#5DB075",
    bg: "#F6F6F6",
    white: "#FFFFFF",
    text: "#1F2937",
    textSub: "#6B7280",
    border: "#E5E7EB",
    success: "#10B981",
    error: "#EF4444",
};

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

    const Header = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation?.goBack()}>
                <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Invites</Text>
            <View style={{ width: 24 }} />
        </View>
    );

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

    const PendingInviteCard = ({ invite }: { invite: Invite }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.inviterInfo}>
                    <View style={styles.inviterAvatar}>
                        <Users size={20} color={COLORS.white} />
                    </View>
                    <Text style={styles.inviterName}>
                        {invite.inviter?.firstName} {invite.inviter?.lastName}
                    </Text>
                </View>
                <Text style={styles.inviteTime}>invited you</Text>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                    <MapPin size={16} color={COLORS.textSub} />
                    <Text style={styles.detailText}>{invite.courseName}</Text>
                </View>
                {invite.courseLocation && (
                    <Text style={styles.locationText}>{invite.courseLocation}</Text>
                )}
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
                    onPress={() => handleRespond(invite.id, "declined")}
                    disabled={responding === invite.id}
                >
                    {responding === invite.id ? (
                        <ActivityIndicator size="small" color={COLORS.error} />
                    ) : (
                        <>
                            <X size={18} color={COLORS.error} />
                            <Text style={styles.declineBtnText}>Decline</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleRespond(invite.id, "accepted")}
                    disabled={responding === invite.id}
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

    const SentInviteCard = ({ invite }: { invite: Invite }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.courseName}>{invite.courseName}</Text>
                <View style={[styles.statusBadge, styles[`status_${invite.status}`]]}>
                    <Text style={styles.statusText}>{invite.status}</Text>
                </View>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                    <Calendar size={16} color={COLORS.textSub} />
                    <Text style={styles.detailText}>{formatDate(invite.teeDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Users size={16} color={COLORS.textSub} />
                    <Text style={styles.detailText}>
                        To: {invite.invitee?.name || invite.invitee?.phone}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Header />
            <TabBar />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
        backgroundColor: COLORS.white,
    },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
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
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    inviterInfo: { flexDirection: "row", alignItems: "center" },
    inviterAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    inviterName: { fontSize: 15, fontWeight: "600", color: COLORS.text, marginLeft: 10 },
    inviteTime: { fontSize: 13, color: COLORS.textSub },
    courseName: { fontSize: 16, fontWeight: "bold", color: COLORS.text, flex: 1 },
    cardBody: { marginBottom: 12 },
    detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    detailText: { fontSize: 14, color: COLORS.text, marginLeft: 8 },
    locationText: { fontSize: 13, color: COLORS.textSub, marginLeft: 24, marginTop: -4, marginBottom: 8 },
    cardActions: { flexDirection: "row", gap: 12 },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    declineBtn: { backgroundColor: "#FEE2E2" },
    acceptBtn: { backgroundColor: COLORS.primary },
    declineBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.error },
    acceptBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.white },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    status_pending: { backgroundColor: "#FEF3C7" },
    status_accepted: { backgroundColor: "#D1FAE5" },
    status_declined: { backgroundColor: "#FEE2E2" },
    status_expired: { backgroundColor: "#F3F4F6" },
    status_waitlist: { backgroundColor: "#E0E7FF" },
    statusText: { fontSize: 12, fontWeight: "600", color: COLORS.text, textTransform: "capitalize" },
    emptyState: { alignItems: "center", paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text, marginTop: 16 },
    emptyText: { fontSize: 14, color: COLORS.textSub, textAlign: "center", marginTop: 8, paddingHorizontal: 32 },
});
