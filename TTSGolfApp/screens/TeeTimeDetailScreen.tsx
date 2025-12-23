import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    Calendar,
    Clock,
    MapPin,
    Users,
    UserCheck,
    UserX,
    Share2,
    X,
    CheckCircle,
    AlertCircle,
    SkipForward,
    Hourglass,
} from "lucide-react-native";
import { Header } from "../components/common";
import { teeTimeApi } from "../services/api";
import { useAuthStore } from "../stores";

const COLORS = {
    primary: "#5DB075",
    bg: "#F6F6F6",
    white: "#FFFFFF",
    text: "#1C1C1E",
    textSub: "#8A8A8E",
    border: "#E5E5EA",
    confirmed: "#2E7D32",
    confirmedBg: "#E8F5E9",
    pending: "#E65100",
    pendingBg: "#FFF3E0",
    declined: "#C62828",
    declinedBg: "#FFEBEE",
    completed: "#616161",
    completedBg: "#E0E0E0",
};

interface Participant {
    id: string;
    userId: string;
    name: string;
    avatar?: string;
    handicap?: number;
    isCreator: boolean;
}

interface Invite {
    id: string;
    status: string;
    invitee: {
        userId?: string;
        phone?: string;
        name: string;
        avatar?: string;
    };
    position: number;
    expiresAt?: string;
}

interface TeeTimeDetail {
    id: string;
    courseName: string;
    courseLocation?: string;
    teeDate: string;
    teeTime: string;
    maxPlayers: number;
    inviteType: string;
    status: string;
    notes?: string;
    creator: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
    };
    participants: Participant[];
    invites: Invite[];
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case "confirmed":
            return { label: "Confirmed", color: COLORS.confirmed, bg: COLORS.confirmedBg };
        case "completed":
            return { label: "Completed", color: COLORS.completed, bg: COLORS.completedBg };
        case "cancelled":
            return { label: "Cancelled", color: COLORS.declined, bg: COLORS.declinedBg };
        default:
            return { label: "Pending", color: COLORS.pending, bg: COLORS.pendingBg };
    }
};

const getInviteTypeLabel = (type: string) => {
    switch (type) {
        case "fcfs":
            return "First Come First Serve";
        case "roster":
            return "Roster Order";
        case "manual":
            return "Manual Selection";
        default:
            return type || "Standard";
    }
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
};

const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

const ParticipantItem = memo(({ participant, isCreator }: { participant: Participant; isCreator: boolean }) => (
    <View style={styles.participantItem}>
        <View style={styles.participantAvatar}>
            {participant.avatar ? (
                <Image source={{ uri: participant.avatar }} style={styles.avatarImage} />
            ) : (
                <Text style={styles.avatarInitial}>
                    {participant.name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
            )}
        </View>
        <View style={styles.participantInfo}>
            <Text style={styles.participantName}>{participant.name}</Text>
            {participant.handicap !== undefined && (
                <Text style={styles.participantHandicap}>HCP {participant.handicap}</Text>
            )}
        </View>
        {participant.isCreator && (
            <View style={styles.creatorBadge}>
                <Text style={styles.creatorBadgeText}>Organizer</Text>
            </View>
        )}
    </View>
));

const InviteItem = memo(({ invite, isCreator, onSkip }: { invite: Invite; isCreator: boolean; onSkip?: (inviteId: string) => void }) => {
    const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

    // Live countdown timer
    useEffect(() => {
        if (!invite.expiresAt || invite.status !== "pending") {
            setTimeRemaining(null);
            return;
        }

        const calculateTimeRemaining = () => {
            const expiresAt = new Date(invite.expiresAt!);
            const now = new Date();
            const diffMs = expiresAt.getTime() - now.getTime();

            if (diffMs <= 0) {
                setTimeRemaining("Expired");
                return;
            }

            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);

            if (diffMins < 1) {
                setTimeRemaining(`${diffSecs}s left`);
            } else if (diffMins < 60) {
                const secs = diffSecs % 60;
                setTimeRemaining(`${diffMins}m ${secs}s left`);
            } else {
                const mins = diffMins % 60;
                setTimeRemaining(`${diffHours}h ${mins}m left`);
            }
        };

        // Calculate immediately
        calculateTimeRemaining();

        // Update every second for accurate countdown
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [invite.expiresAt, invite.status]);

    const getInviteStatusIcon = () => {
        switch (invite.status) {
            case "accepted":
                return <UserCheck size={18} color={COLORS.confirmed} />;
            case "declined":
                return <UserX size={18} color={COLORS.declined} />;
            case "expired":
                return <AlertCircle size={18} color={COLORS.textSub} />;
            case "waitlist":
                return <Hourglass size={18} color={COLORS.pending} />;
            default:
                // Pending - show arrow/waiting indicator
                return <Clock size={18} color={COLORS.pending} />;
        }
    };

    const getInviteStatusColor = () => {
        switch (invite.status) {
            case "accepted":
                return COLORS.confirmed;
            case "declined":
                return COLORS.declined;
            case "expired":
                return COLORS.textSub;
            case "waitlist":
                return COLORS.pending;
            default:
                return COLORS.pending;
        }
    };

    const getStatusLabel = () => {
        switch (invite.status) {
            case "accepted":
                return "Accepted";
            case "declined":
                return "Declined";
            case "expired":
                return "Timed Out";
            case "waitlist":
                return "Waitlist";
            default:
                return "Waiting...";
        }
    };

    const isPending = invite.status === "pending";
    const canSkip = isCreator && isPending;

    return (
        <View style={styles.inviteItem}>
            <View style={[styles.statusIndicator, { backgroundColor: getInviteStatusColor() + "20" }]}>
                {getInviteStatusIcon()}
            </View>
            <View style={styles.participantAvatar}>
                {invite.invitee.avatar ? (
                    <Image source={{ uri: invite.invitee.avatar }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarInitial}>
                        {invite.invitee.name?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                )}
            </View>
            <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{invite.invitee.name}</Text>
                <View style={styles.inviteStatusRow}>
                    <Text style={[styles.inviteStatus, { color: getInviteStatusColor() }]}>
                        {getStatusLabel()}
                    </Text>
                    {timeRemaining && (
                        <Text style={styles.timeRemaining}>• {timeRemaining}</Text>
                    )}
                </View>
            </View>
            {canSkip && onSkip && (
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => onSkip(invite.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <SkipForward size={16} color={COLORS.pending} />
                    <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
            )}
        </View>
    );
});

export default function TeeTimeDetailScreen({ route, navigation }: any) {
    const { teeTimeId } = route.params;
    const insets = useSafeAreaInsets();
    const currentUser = useAuthStore((state) => state.user);

    const [teeTime, setTeeTime] = useState<TeeTimeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadTeeTime = useCallback(async () => {
        try {
            const response = await teeTimeApi.getTeeTime(teeTimeId);
            if (response.success) {
                setTeeTime(response.teeTime);
            }
        } catch (error) {
            console.error("Failed to load tee time:", error);
            Alert.alert("Error", "Failed to load tee time details");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teeTimeId]);

    useEffect(() => {
        loadTeeTime();
    }, [loadTeeTime]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadTeeTime();
    }, [loadTeeTime]);

    const handleCancel = useCallback(async () => {
        Alert.alert(
            "Cancel Tee Time",
            "Are you sure you want to cancel this tee time? All participants will be notified.",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await teeTimeApi.cancelTeeTime(teeTimeId);
                            if (response.success) {
                                Alert.alert("Cancelled", "Tee time has been cancelled");
                                navigation.goBack();
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to cancel tee time");
                        }
                    },
                },
            ]
        );
    }, [teeTimeId, navigation]);

    const handleCheckIn = useCallback(() => {
        if (!teeTime) return;
        navigation.navigate("CheckIn", {
            teeTimeId: teeTime.id,
            courseName: teeTime.courseName,
        });
    }, [navigation, teeTime]);

    const handleSkipInvite = useCallback(async (inviteId: string) => {
        if (!teeTime) return;

        const invitee = teeTime.invites.find(i => i.id === inviteId)?.invitee.name || "this person";

        Alert.alert(
            "Skip Invite",
            `Skip ${invitee} and advance to the next roster member?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Skip",
                    onPress: async () => {
                        try {
                            const response = await teeTimeApi.skipInvite(teeTime.id, inviteId);
                            if (response.success) {
                                // Update local state with new invites
                                setTeeTime(prev => prev ? {
                                    ...prev,
                                    invites: response.invites
                                } : null);

                                if (response.nextInvite) {
                                    Alert.alert("Skipped", `Now waiting for ${response.nextInvite.inviteeName}`);
                                } else {
                                    Alert.alert("Skipped", "No more roster members to invite");
                                }
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to skip invite");
                        }
                    },
                },
            ]
        );
    }, [teeTime]);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!teeTime) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Tee time not found</Text>
            </View>
        );
    }

    const statusConfig = getStatusConfig(teeTime.status);
    const isCreator = currentUser?.id === teeTime.creator.id;
    const canCancel = isCreator && teeTime.status !== "cancelled" && teeTime.status !== "completed";
    const canCheckIn = isCreator && (teeTime.status === "confirmed" || teeTime.status === "in_progress");

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Header title="Tee Time Details" onBack={() => navigation.goBack()} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
                }
            >
                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                        {statusConfig.label}
                    </Text>
                </View>

                {/* Course Info */}
                <View style={styles.section}>
                    <View style={styles.courseHeader}>
                        <MapPin size={24} color={COLORS.primary} />
                        <View style={styles.courseInfo}>
                            <Text style={styles.courseName}>{teeTime.courseName}</Text>
                            {teeTime.courseLocation && (
                                <Text style={styles.courseLocation}>{teeTime.courseLocation}</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Date & Time */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.infoItem}>
                            <Calendar size={20} color={COLORS.textSub} />
                            <Text style={styles.infoText}>{formatDate(teeTime.teeDate)}</Text>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.infoItem}>
                            <Clock size={20} color={COLORS.textSub} />
                            <Text style={styles.infoText}>{formatTime(teeTime.teeTime)}</Text>
                        </View>
                    </View>
                </View>

                {/* Invite Type & Group Size */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Invite Type</Text>
                        <Text style={styles.detailValue}>{getInviteTypeLabel(teeTime.inviteType)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Group Size</Text>
                        <Text style={styles.detailValue}>
                            {teeTime.participants.length} / {teeTime.maxPlayers} players
                        </Text>
                    </View>
                    {teeTime.notes && (
                        <View style={styles.notesContainer}>
                            <Text style={styles.detailLabel}>Notes</Text>
                            <Text style={styles.notesText}>{teeTime.notes}</Text>
                        </View>
                    )}
                </View>

                {/* Participants */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Participants ({teeTime.participants.length})
                    </Text>
                    {teeTime.participants.map((participant) => (
                        <ParticipantItem
                            key={participant.id}
                            participant={participant}
                            isCreator={participant.isCreator}
                        />
                    ))}
                </View>

                {/* Pending Invites */}
                {teeTime.invites.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Invites ({teeTime.invites.length})
                        </Text>
                        {teeTime.invites.map((invite) => (
                            <InviteItem
                                key={invite.id}
                                invite={invite}
                                isCreator={isCreator}
                                onSkip={handleSkipInvite}
                            />
                        ))}
                    </View>
                )}

                {/* Organizer */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Organized by</Text>
                    <View style={styles.organizerRow}>
                        <View style={styles.participantAvatar}>
                            {teeTime.creator.avatar ? (
                                <Image source={{ uri: teeTime.creator.avatar }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarInitial}>
                                    {teeTime.creator.firstName?.charAt(0)?.toUpperCase() || "?"}
                                </Text>
                            )}
                        </View>
                        <Text style={styles.organizerName}>
                            {teeTime.creator.firstName} {teeTime.creator.lastName}
                        </Text>
                    </View>
                </View>

                {/* Check-In Button */}
                {canCheckIn && (
                    <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
                        <CheckCircle size={20} color={COLORS.white} />
                        <Text style={styles.checkInButtonText}>Check In Players</Text>
                    </TouchableOpacity>
                )}

                {/* Cancel Button */}
                {canCancel && (
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                        <X size={20} color={COLORS.declined} />
                        <Text style={styles.cancelButtonText}>Cancel Tee Time</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
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
    scrollContent: {
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.textSub,
    },
    statusBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 20,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "600",
    },
    section: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 12,
    },
    courseHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    courseInfo: {
        flex: 1,
        marginLeft: 12,
    },
    courseName: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },
    courseLocation: {
        fontSize: 14,
        color: COLORS.textSub,
        marginTop: 4,
    },
    row: {
        marginBottom: 12,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    infoText: {
        fontSize: 15,
        color: COLORS.text,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    detailLabel: {
        fontSize: 14,
        color: COLORS.textSub,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.text,
    },
    notesContainer: {
        marginTop: 12,
    },
    notesText: {
        fontSize: 14,
        color: COLORS.text,
        marginTop: 4,
        lineHeight: 20,
    },
    participantItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    inviteItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    statusIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    inviteStatusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    timeRemaining: {
        fontSize: 12,
        color: COLORS.textSub,
    },
    skipButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: COLORS.pendingBg,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    skipButtonText: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.pending,
    },
    participantAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarInitial: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.white,
    },
    participantInfo: {
        flex: 1,
        marginLeft: 12,
    },
    participantName: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.text,
    },
    participantHandicap: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    inviteStatus: {
        fontSize: 13,
        marginTop: 2,
    },
    creatorBadge: {
        backgroundColor: COLORS.confirmedBg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    creatorBadgeText: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.confirmed,
    },
    organizerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    organizerName: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.text,
        marginLeft: 12,
    },
    checkInButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
        marginBottom: 12,
    },
    checkInButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },
    cancelButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.declinedBg,
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.declined,
    },
});
