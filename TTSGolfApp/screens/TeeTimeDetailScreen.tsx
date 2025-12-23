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

const InviteItem = memo(({ invite }: { invite: Invite }) => {
    const getInviteStatusIcon = () => {
        switch (invite.status) {
            case "accepted":
                return <UserCheck size={16} color={COLORS.confirmed} />;
            case "declined":
                return <UserX size={16} color={COLORS.declined} />;
            default:
                return <Clock size={16} color={COLORS.pending} />;
        }
    };

    const getInviteStatusColor = () => {
        switch (invite.status) {
            case "accepted":
                return COLORS.confirmed;
            case "declined":
                return COLORS.declined;
            default:
                return COLORS.pending;
        }
    };

    return (
        <View style={styles.inviteItem}>
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
                <Text style={[styles.inviteStatus, { color: getInviteStatusColor() }]}>
                    {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                </Text>
            </View>
            {getInviteStatusIcon()}
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

    const handleCheckIn = useCallback(() => {
        navigation.navigate("CheckIn", {
            teeTimeId: teeTime.id,
            courseName: teeTime.courseName,
        });
    }, [navigation, teeTime]);

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
                            <InviteItem key={invite.id} invite={invite} />
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
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
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
