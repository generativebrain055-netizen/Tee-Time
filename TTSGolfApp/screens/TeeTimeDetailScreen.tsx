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
    Modal,
    FlatList,
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
    X,
    CheckCircle,
    AlertCircle,
    SkipForward,
    Hourglass,
    Flag,
    ChevronLeft,
    MoreHorizontal,
    Navigation,
    UserPlus,
} from "lucide-react-native";
import { teeTimeApi, rosterApi, inviteApi, friendApi } from "../services/api";
import { useAuthStore } from "../stores";
import { LinearGradient } from "expo-linear-gradient";

const COLORS = {
    primary: "#5DB075",
    primaryDark: "#4A9660",
    bg: "#F8FAFC",
    white: "#FFFFFF",
    text: "#1C1C1E",
    textSub: "#6B7280",
    textLight: "#9CA3AF",
    border: "#E5E7EB",
    confirmed: "#059669",
    confirmedBg: "#D1FAE5",
    pending: "#D97706",
    pendingBg: "#FEF3C7",
    declined: "#DC2626",
    declinedBg: "#FEE2E2",
    completed: "#6B7280",
    completedBg: "#F3F4F6",
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
            return { label: "Confirmed", color: COLORS.confirmed, bg: COLORS.confirmedBg, icon: CheckCircle };
        case "completed":
            return { label: "Completed", color: COLORS.completed, bg: COLORS.completedBg, icon: CheckCircle };
        case "cancelled":
            return { label: "Cancelled", color: COLORS.declined, bg: COLORS.declinedBg, icon: X };
        default:
            return { label: "Pending", color: COLORS.pending, bg: COLORS.pendingBg, icon: Clock };
    }
};

const getInviteTypeLabel = (type: string) => {
    switch (type) {
        case "fcfs": return "First Come First Serve";
        case "roster": return "Roster Order";
        case "manual": return "Manual Selection";
        default: return type || "Standard";
    }
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: date.getDate(),
        month: date.toLocaleDateString("en-US", { month: "short" }),
        year: date.getFullYear(),
        full: date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    };
};

const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

// Avatar component
const Avatar = memo(({ uri, name, size = 44 }: { uri?: string; name: string; size?: number }) => {
    const initial = name?.charAt(0)?.toUpperCase() || "?";
    return uri ? (
        <Image source={{ uri }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />
    ) : (
        <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>{initial}</Text>
        </View>
    );
});

// Participant Card
const ParticipantCard = memo(({ participant }: { participant: Participant }) => (
    <View style={styles.participantCard}>
        <Avatar uri={participant.avatar} name={participant.name} size={48} />
        <View style={styles.participantInfo}>
            <Text style={styles.participantName}>{participant.name}</Text>
            <View style={styles.participantMeta}>
                {participant.handicap !== undefined && (
                    <View style={styles.handicapBadge}>
                        <Text style={styles.handicapText}>HCP {participant.handicap}</Text>
                    </View>
                )}
                {participant.isCreator && (
                    <View style={styles.organizerBadge}>
                        <Text style={styles.organizerText}>Organizer</Text>
                    </View>
                )}
            </View>
        </View>
        <UserCheck size={20} color={COLORS.confirmed} />
    </View>
));

// Invite Card with countdown
const InviteCard = memo(({ invite, isCreator, onSkip }: { invite: Invite; isCreator: boolean; onSkip?: (id: string) => void }) => {
    const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

    useEffect(() => {
        if (!invite.expiresAt || invite.status !== "pending") {
            setTimeRemaining(null);
            return;
        }

        const calculate = () => {
            const diff = new Date(invite.expiresAt!).getTime() - Date.now();
            if (diff <= 0) { setTimeRemaining("Expired"); return; }
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(mins / 60);
            setTimeRemaining(hours >= 1 ? `${hours}h ${mins % 60}m` : `${mins}m`);
        };

        calculate();
        const interval = setInterval(calculate, 60000);
        return () => clearInterval(interval);
    }, [invite.expiresAt, invite.status]);

    const getStatusStyle = () => {
        switch (invite.status) {
            case "accepted": return { color: COLORS.confirmed, bg: COLORS.confirmedBg, icon: UserCheck, label: "Accepted" };
            case "declined": return { color: COLORS.declined, bg: COLORS.declinedBg, icon: UserX, label: "Declined" };
            case "expired": return { color: COLORS.textSub, bg: COLORS.completedBg, icon: AlertCircle, label: "Expired" };
            case "waitlist": return { color: COLORS.pending, bg: COLORS.pendingBg, icon: Hourglass, label: "Waitlist" };
            default: return { color: COLORS.pending, bg: COLORS.pendingBg, icon: Clock, label: "Pending" };
        }
    };

    const status = getStatusStyle();
    const StatusIcon = status.icon;

    return (
        <View style={styles.inviteCard}>
            <View style={[styles.inviteStatusDot, { backgroundColor: status.bg }]}>
                <StatusIcon size={16} color={status.color} />
            </View>
            <Avatar uri={invite.invitee.avatar} name={invite.invitee.name} size={44} />
            <View style={styles.inviteInfo}>
                <Text style={styles.inviteName}>{invite.invitee.name}</Text>
                <View style={styles.inviteStatusRow}>
                    <Text style={[styles.inviteStatusText, { color: status.color }]}>{status.label}</Text>
                    {timeRemaining && <Text style={styles.inviteTime}>• {timeRemaining}</Text>}
                </View>
            </View>
            {isCreator && invite.status === "pending" && onSkip && (
                <TouchableOpacity style={styles.skipBtn} onPress={() => onSkip(invite.id)}>
                    <SkipForward size={14} color={COLORS.pending} />
                    <Text style={styles.skipBtnText}>Skip</Text>
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

    // Add Players Modal state
    const [showAddPlayersModal, setShowAddPlayersModal] = useState(false);
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [inviting, setInviting] = useState(false);

    const loadTeeTime = useCallback(async () => {
        try {
            const response = await teeTimeApi.getTeeTime(teeTimeId);
            if (response.success) setTeeTime(response.teeTime);
        } catch (error) {
            console.error("Failed to load tee time:", error);
            Alert.alert("Error", "Failed to load tee time details");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teeTimeId]);

    useEffect(() => { loadTeeTime(); }, [loadTeeTime]);

    const handleRefresh = useCallback(() => { setRefreshing(true); loadTeeTime(); }, [loadTeeTime]);

    const handleCancel = useCallback(async () => {
        Alert.alert("Cancel Tee Time", "Are you sure? All participants will be notified.", [
            { text: "No", style: "cancel" },
            {
                text: "Yes, Cancel", style: "destructive",
                onPress: async () => {
                    try {
                        const response = await teeTimeApi.cancelTeeTime(teeTimeId);
                        if (response.success) { Alert.alert("Cancelled", "Tee time has been cancelled"); navigation.goBack(); }
                    } catch { Alert.alert("Error", "Failed to cancel tee time"); }
                },
            },
        ]);
    }, [teeTimeId, navigation]);

    const handleCheckIn = useCallback(() => {
        if (!teeTime) return;
        navigation.navigate("CheckIn", { teeTimeId: teeTime.id, courseName: teeTime.courseName });
    }, [navigation, teeTime]);

    const handleSkipInvite = useCallback(async (inviteId: string) => {
        if (!teeTime) return;
        const invitee = teeTime.invites.find(i => i.id === inviteId)?.invitee.name || "this person";
        Alert.alert("Skip Invite", `Skip ${invitee} and advance to next?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Skip",
                onPress: async () => {
                    try {
                        const response = await teeTimeApi.skipInvite(teeTime.id, inviteId);
                        if (response.success) {
                            setTeeTime(prev => prev ? { ...prev, invites: response.invites } : null);
                            Alert.alert("Skipped", response.nextInvite ? `Now waiting for ${response.nextInvite.inviteeName}` : "No more roster members");
                        }
                    } catch { Alert.alert("Error", "Failed to skip invite"); }
                },
            },
        ]);
    }, [teeTime]);

    const loadAvailablePlayers = useCallback(async () => {
        setLoadingPlayers(true);
        try {
            const [rosterResponse, onDeckResponse, friendsResponse] = await Promise.all([
                rosterApi.getRoster(),
                rosterApi.getOnDeck(),
                friendApi.getFriends()
            ]);

            const allPlayers: any[] = [];
            const addedIds = new Set<string>();

            // Add friends first
            if (friendsResponse.success && friendsResponse.friends) {
                friendsResponse.friends.forEach((friend: any) => {
                    if (!addedIds.has(friend.id)) {
                        addedIds.add(friend.id);
                        allPlayers.push({
                            id: friend.id,
                            name: `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || 'Unknown',
                            avatar: friend.avatar,
                            handicap: friend.handicap,
                            phone: friend.phone,
                            source: 'friend'
                        });
                    }
                });
            }

            // Add roster contacts (may include non-friends)
            if (rosterResponse.success && rosterResponse.roster) {
                rosterResponse.roster.forEach((entry: any) => {
                    const id = entry.contact?.userId || entry.id;
                    if (id && !addedIds.has(id)) {
                        addedIds.add(id);
                        allPlayers.push({
                            id: id,
                            name: entry.contact?.name || 'Unknown',
                            avatar: entry.contact?.avatar,
                            handicap: entry.contact?.handicap,
                            phone: entry.contact?.phone,
                            source: 'roster'
                        });
                    }
                });
            }

            // Add on-deck players
            if (onDeckResponse.success && onDeckResponse.onDeck) {
                onDeckResponse.onDeck.forEach((entry: any) => {
                    const id = entry.contact?.userId || entry.id;
                    if (id && !addedIds.has(id)) {
                        addedIds.add(id);
                        allPlayers.push({
                            id: id,
                            name: entry.contact?.name || 'Unknown',
                            avatar: entry.contact?.avatar,
                            handicap: entry.contact?.handicap,
                            phone: entry.contact?.phone,
                            source: 'on-deck'
                        });
                    }
                });
            }

            // Filter out players already in tee time
            const existingPlayerIds = new Set([
                ...teeTime!.participants.map(p => p.userId),
                ...teeTime!.invites.filter(i => i.invitee.userId).map(i => i.invitee.userId)
            ]);

            const filtered = allPlayers.filter(p => p.id && !existingPlayerIds.has(p.id));
            setAvailablePlayers(filtered);
        } catch (error) {
            console.error("Failed to load players:", error);
            Alert.alert("Error", "Failed to load available players");
        } finally {
            setLoadingPlayers(false);
        }
    }, [teeTime]);

    const handleAddPlayers = useCallback(() => {
        setShowAddPlayersModal(true);
        setSelectedPlayerIds([]);
        loadAvailablePlayers();
    }, [loadAvailablePlayers]);

    const handleSendInvites = useCallback(async () => {
        if (selectedPlayerIds.length === 0) {
            Alert.alert("No Selection", "Please select at least one player to invite");
            return;
        }

        setInviting(true);
        try {
            const invitees = selectedPlayerIds.map(playerId => {
                const player = availablePlayers.find(p => p.id === playerId);
                return {
                    userId: player?.id,
                    phone: player?.phone,
                    name: player?.name
                };
            }).filter(inv => inv.userId || inv.phone);

            const response = await inviteApi.createInvites(teeTime!.id, invitees, "manual");

            if (response.success) {
                Alert.alert("Success", `Invited ${selectedPlayerIds.length} player(s)!`);
                setShowAddPlayersModal(false);
                setSelectedPlayerIds([]);
                loadTeeTime();
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to send invites");
        } finally {
            setInviting(false);
        }
    }, [selectedPlayerIds, availablePlayers, teeTime, loadTeeTime]);

    const togglePlayerSelection = useCallback((playerId: string) => {
        setSelectedPlayerIds(prev =>
            prev.includes(playerId)
                ? prev.filter(id => id !== playerId)
                : [...prev, playerId]
        );
    }, []);

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
    const StatusIcon = statusConfig.icon;
    const isCreator = currentUser?.id === teeTime.creator.id;
    const canCancel = isCreator && !["cancelled", "completed"].includes(teeTime.status);
    const canCheckIn = isCreator && ["confirmed", "in_progress"].includes(teeTime.status);
    const dateInfo = formatDate(teeTime.teeDate);
    const spotsLeft = teeTime.maxPlayers - teeTime.participants.length;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.white} />}
            >
                {/* Hero Header */}
                <View style={styles.heroSection}>
                    <LinearGradient colors={["#5DB075", "#3D8B55"]} style={styles.heroGradient}>
                        {/* Back Button */}
                        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
                            <ChevronLeft size={24} color={COLORS.white} />
                        </TouchableOpacity>

                        {/* Status Badge */}
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                            <StatusIcon size={14} color={statusConfig.color} />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                        </View>

                        {/* Course Info */}
                        <View style={styles.heroContent}>
                            <View style={styles.courseIconCircle}>
                                <Flag size={28} color={COLORS.white} />
                            </View>
                            <Text style={styles.courseName}>{teeTime.courseName || "Golf Course"}</Text>
                            {teeTime.courseLocation && (
                                <View style={styles.locationRow}>
                                    <MapPin size={14} color="rgba(255,255,255,0.8)" />
                                    <Text style={styles.locationText}>{teeTime.courseLocation}</Text>
                                </View>
                            )}
                        </View>

                        {/* Date/Time Cards */}
                        <View style={styles.dateTimeRow}>
                            <View style={styles.dateCard}>
                                <Calendar size={18} color={COLORS.primary} />
                                <View style={styles.dateCardText}>
                                    <Text style={styles.dateCardLabel}>Date</Text>
                                    <Text style={styles.dateCardValue}>{dateInfo.full}</Text>
                                </View>
                            </View>
                            <View style={styles.timeCard}>
                                <Clock size={18} color={COLORS.primary} />
                                <View style={styles.dateCardText}>
                                    <Text style={styles.dateCardLabel}>Tee Time</Text>
                                    <Text style={styles.dateCardValue}>{formatTime(teeTime.teeTime)}</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{teeTime.participants.length}/{teeTime.maxPlayers}</Text>
                        <Text style={styles.statLabel}>Players</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{spotsLeft}</Text>
                        <Text style={styles.statLabel}>Spots Left</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{getInviteTypeLabel(teeTime.inviteType).split(" ")[0]}</Text>
                        <Text style={styles.statLabel}>Invite Type</Text>
                    </View>
                </View>

                {/* Participants Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Users size={18} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Confirmed Players</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{teeTime.participants.length}</Text>
                        </View>
                    </View>
                    {teeTime.participants.map((p) => (
                        <ParticipantCard key={p.id} participant={p} />
                    ))}
                </View>

                {/* Invites Section */}
                {teeTime.invites.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Clock size={18} color={COLORS.pending} />
                            <Text style={styles.sectionTitle}>Pending Invites</Text>
                            <View style={[styles.countBadge, { backgroundColor: COLORS.pendingBg }]}>
                                <Text style={[styles.countText, { color: COLORS.pending }]}>{teeTime.invites.length}</Text>
                            </View>
                        </View>
                        {teeTime.invites.map((invite) => (
                            <InviteCard key={invite.id} invite={invite} isCreator={isCreator} onSkip={handleSkipInvite} />
                        ))}
                    </View>
                )}

                {/* Add More Players Button - Only for creator if spots available */}
                {isCreator && spotsLeft > 0 && (
                    <TouchableOpacity style={styles.addPlayersBtn} onPress={handleAddPlayers}>
                        <UserPlus size={20} color={COLORS.primary} />
                        <Text style={styles.addPlayersBtnText}>Invite More Players</Text>
                        <Text style={styles.addPlayersBtnSub}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} available</Text>
                    </TouchableOpacity>
                )}

                {/* Notes Section */}
                {teeTime.notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notes</Text>
                        <Text style={styles.notesText}>{teeTime.notes}</Text>
                    </View>
                )}

                {/* Organizer */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Organized by</Text>
                    <View style={styles.organizerCard}>
                        <Avatar uri={teeTime.creator.avatar} name={`${teeTime.creator.firstName} ${teeTime.creator.lastName}`} size={48} />
                        <Text style={styles.organizerName}>{teeTime.creator.firstName} {teeTime.creator.lastName}</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsSection}>
                    {canCheckIn && (
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleCheckIn}>
                            <CheckCircle size={20} color={COLORS.white} />
                            <Text style={styles.primaryBtnText}>Check In Players</Text>
                        </TouchableOpacity>
                    )}
                    {canCancel && (
                        <TouchableOpacity style={styles.dangerBtn} onPress={handleCancel}>
                            <X size={20} color={COLORS.declined} />
                            <Text style={styles.dangerBtnText}>Cancel Tee Time</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add Players Modal */}
            <Modal visible={showAddPlayersModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Invite Players</Text>
                            <TouchableOpacity onPress={() => setShowAddPlayersModal(false)} style={styles.modalCloseBtn}>
                                <X size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        {loadingPlayers ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={styles.modalLoadingText}>Loading players...</Text>
                            </View>
                        ) : availablePlayers.length === 0 ? (
                            <View style={styles.modalEmpty}>
                                <Users size={48} color={COLORS.textSub} />
                                <Text style={styles.modalEmptyText}>No available players</Text>
                                <Text style={styles.modalEmptySubtext}>All your roster and on-deck players are already invited or participating</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.modalSubtitle}>
                                    Select players from your roster or on-deck list ({selectedPlayerIds.length} selected)
                                </Text>
                                <FlatList
                                    data={availablePlayers}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => {
                                        const isSelected = selectedPlayerIds.includes(item.id);
                                        return (
                                            <TouchableOpacity
                                                style={[styles.playerItem, isSelected && styles.playerItemSelected]}
                                                onPress={() => togglePlayerSelection(item.id)}
                                            >
                                                <Avatar uri={item.avatar} name={item.name} size={44} />
                                                <View style={styles.playerItemInfo}>
                                                    <Text style={styles.playerItemName}>{item.name}</Text>
                                                    <View style={styles.playerItemMeta}>
                                                        {item.handicap !== undefined && (
                                                            <Text style={styles.playerItemHandicap}>HCP: {item.handicap}</Text>
                                                        )}
                                                        <Text style={styles.playerItemSource}>• {item.source}</Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                                    {isSelected && <CheckCircle size={20} color={COLORS.primary} />}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }}
                                    style={styles.playersList}
                                />
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={styles.modalCancelBtn}
                                        onPress={() => setShowAddPlayersModal(false)}
                                        disabled={inviting}
                                    >
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalSendBtn, selectedPlayerIds.length === 0 && styles.modalSendBtnDisabled]}
                                        onPress={handleSendInvites}
                                        disabled={inviting || selectedPlayerIds.length === 0}
                                    >
                                        {inviting ? (
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                        ) : (
                                            <>
                                                <UserPlus size={18} color={COLORS.white} />
                                                <Text style={styles.modalSendText}>
                                                    Send Invite{selectedPlayerIds.length !== 1 ? 's' : ''} ({selectedPlayerIds.length})
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    centered: { justifyContent: "center", alignItems: "center" },
    scrollView: { flex: 1 },
    errorText: { fontSize: 16, color: COLORS.textSub },

    // Hero Section
    heroSection: { marginBottom: -30 },
    heroGradient: { paddingTop: 100, paddingBottom: 50, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    backBtn: { position: "absolute", left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", zIndex: 10 },
    statusBadge: { flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
    statusText: { fontSize: 13, fontWeight: "600" },
    heroContent: { alignItems: "center", marginBottom: 24 },
    courseIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
    courseName: { fontSize: 24, fontWeight: "800", color: COLORS.white, textAlign: "center", marginBottom: 8 },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    locationText: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
    dateTimeRow: { flexDirection: "row", gap: 12 },
    dateCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.white, borderRadius: 14, padding: 14 },
    timeCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.white, borderRadius: 14, padding: 14 },
    dateCardText: { flex: 1 },
    dateCardLabel: { fontSize: 11, color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.5 },
    dateCardValue: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginTop: 2 },

    // Stats Row
    statsRow: { flexDirection: "row", backgroundColor: COLORS.white, marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    statItem: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 20, fontWeight: "700", color: COLORS.text },
    statLabel: { fontSize: 12, color: COLORS.textSub, marginTop: 4 },
    statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },

    // Sections
    section: { backgroundColor: COLORS.white, marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, flex: 1 },
    countBadge: { backgroundColor: COLORS.confirmedBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    countText: { fontSize: 13, fontWeight: "600", color: COLORS.confirmed },

    // Participant Card
    participantCard: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    participantInfo: { flex: 1, marginLeft: 12 },
    participantName: { fontSize: 15, fontWeight: "600", color: COLORS.text },
    participantMeta: { flexDirection: "row", gap: 8, marginTop: 4 },
    handicapBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    handicapText: { fontSize: 12, fontWeight: "500", color: COLORS.textSub },
    organizerBadge: { backgroundColor: COLORS.confirmedBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    organizerText: { fontSize: 12, fontWeight: "500", color: COLORS.confirmed },

    // Invite Card
    inviteCard: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    inviteStatusDot: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 8 },
    inviteInfo: { flex: 1, marginLeft: 12 },
    inviteName: { fontSize: 15, fontWeight: "600", color: COLORS.text },
    inviteStatusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
    inviteStatusText: { fontSize: 13, fontWeight: "500" },
    inviteTime: { fontSize: 12, color: COLORS.textSub },
    skipBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.pendingBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    skipBtnText: { fontSize: 12, fontWeight: "600", color: COLORS.pending },

    // Avatar
    avatar: { backgroundColor: COLORS.border },
    avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center" },
    avatarInitial: { fontWeight: "700", color: COLORS.white },

    // Notes
    notesText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },

    // Organizer
    organizerCard: { flexDirection: "row", alignItems: "center", gap: 12 },
    organizerName: { fontSize: 15, fontWeight: "600", color: COLORS.text },

    // Actions
    actionsSection: { paddingHorizontal: 20, marginTop: 20, gap: 12 },
    primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16 },
    primaryBtnText: { fontSize: 16, fontWeight: "600", color: COLORS.white },
    dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.declinedBg, borderRadius: 14, paddingVertical: 16 },
    dangerBtnText: { fontSize: 16, fontWeight: "600", color: COLORS.declined },

    // Add Players Button
    addPlayersBtn: { backgroundColor: COLORS.white, marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 2, borderColor: COLORS.primary, borderStyle: "dashed" },
    addPlayersBtnText: { fontSize: 16, fontWeight: "600", color: COLORS.primary, marginTop: 8 },
    addPlayersBtnSub: { fontSize: 13, color: COLORS.textSub, marginTop: 4 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", paddingHorizontal: 20 },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    modalTitle: { fontSize: 22, fontWeight: "700", color: COLORS.text },
    modalCloseBtn: { padding: 4 },
    modalSubtitle: { fontSize: 14, color: COLORS.textSub, marginBottom: 16 },
    modalLoading: { alignItems: "center", paddingVertical: 60 },
    modalLoadingText: { fontSize: 14, color: COLORS.textSub, marginTop: 12 },
    modalEmpty: { alignItems: "center", paddingVertical: 60 },
    modalEmptyText: { fontSize: 18, fontWeight: "600", color: COLORS.text, marginTop: 16 },
    modalEmptySubtext: { fontSize: 14, color: COLORS.textSub, marginTop: 8, textAlign: "center", paddingHorizontal: 20 },
    playersList: { maxHeight: 400, marginBottom: 16 },
    playerItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: COLORS.bg, borderWidth: 2, borderColor: "transparent" },
    playerItemSelected: { backgroundColor: "#E8F5E9", borderColor: COLORS.primary },
    playerItemInfo: { flex: 1, marginLeft: 12 },
    playerItemName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
    playerItemMeta: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 },
    playerItemHandicap: { fontSize: 13, color: COLORS.primary, fontWeight: "500" },
    playerItemSource: { fontSize: 13, color: COLORS.textSub },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, justifyContent: "center", alignItems: "center" },
    checkboxSelected: { borderColor: COLORS.primary, backgroundColor: "transparent" },
    modalActions: { flexDirection: "row", gap: 12, paddingTop: 16 },
    modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: COLORS.bg, alignItems: "center" },
    modalCancelText: { fontSize: 16, fontWeight: "600", color: COLORS.textSub },
    modalSendBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 12, backgroundColor: COLORS.primary },
    modalSendBtnDisabled: { backgroundColor: COLORS.textLight },
    modalSendText: { fontSize: 16, fontWeight: "600", color: COLORS.white },
});
