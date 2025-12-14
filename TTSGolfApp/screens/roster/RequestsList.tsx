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
import { Calendar, MapPin, Clock, Check, X, Users } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { inviteApi, Invite } from "../../services/api";

export default function RequestsList() {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [responding, setResponding] = useState<string | null>(null);

    useEffect(() => {
        loadInvites();
    }, []);

    const loadInvites = async () => {
        try {
            const response = await inviteApi.getPendingInvites();
            if (response.success) {
                setInvites(response.invites);
            }
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

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    };

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
                    onPress={() => handleRespond(invite.id, "declined")}
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
                    onPress={() => handleRespond(invite.id, "accepted")}
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

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : invites.length > 0 ? (
                invites.map((invite) => <InviteCard key={invite.id} invite={invite} />)
            ) : (
                <View style={styles.emptyState}>
                    <Calendar size={48} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No Pending Requests</Text>
                    <Text style={styles.emptyText}>
                        When someone invites you to a tee time, it will appear here
                    </Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
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
    inviterInfo: { flexDirection: "row", alignItems: "center" },
    inviterAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    inviterText: { marginLeft: 10 },
    inviterName: { fontSize: 14, fontWeight: "bold", color: COLORS.textMain },
    inviteLabel: { fontSize: 12, color: COLORS.textSub },
    cardBody: { marginBottom: 12 },
    detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    detailText: { fontSize: 13, color: COLORS.textMain, marginLeft: 8 },
    cardActions: { flexDirection: "row", gap: 10 },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 8,
        gap: 4,
    },
    declineBtn: { backgroundColor: "#FEE2E2" },
    acceptBtn: { backgroundColor: COLORS.primary },
    declineBtnText: { fontSize: 13, fontWeight: "600", color: "#EF4444" },
    acceptBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.white },
    emptyState: { alignItems: "center", paddingVertical: 60 },
    emptyTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.textMain, marginTop: 16 },
    emptyText: {
        fontSize: 13,
        color: COLORS.textSub,
        textAlign: "center",
        marginTop: 8,
        paddingHorizontal: 24,
    },
});
