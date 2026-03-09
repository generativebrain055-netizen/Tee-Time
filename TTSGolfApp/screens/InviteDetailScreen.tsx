/**
 * Invite Detail Screen
 * Shows full details of a tee time invite with ability to respond
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
} from "react-native";
import {
    Calendar,
    MapPin,
    Clock,
    Check,
    X,
    Users,
    Timer,
} from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { useColors } from "../ui/theme/ThemeContext";
import { useToast } from "../ui/feedback";
import { useUser } from "../contexts/UserContext";
import { inviteApi, Invite } from "../services/api";
import { useAuthStore } from "../stores";
import logger from "../utils/logger";

interface InviteDetailScreenProps {
    navigation?: any;
    route?: any;
}

export default function InviteDetailScreen({ navigation, route }: InviteDetailScreenProps) {
    const { inviteId } = route?.params || {};
    const colors = useColors();
    const { fetchProfile } = useUser();
    const toast = useToast();
    const currentUserId = useAuthStore((s) => s.user?.id);
    
    const [invite, setInvite] = useState<Invite & { participants?: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [responding, setResponding] = useState(false);
    const [countdown, setCountdown] = useState<{ days: number; hours: number; mins: number; secs: number } | null>(null);
    const [isUrgent, setIsUrgent] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (inviteId) {
            loadInvite();
        } else {
            Alert.alert("Error", "Invalid invite ID");
            navigation?.goBack();
        }
    }, [inviteId]);

    // Real-time countdown timer
    useEffect(() => {
        if (!invite?.expiresAt) {
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
    }, [invite?.expiresAt]);

    const loadInvite = async () => {
        try {
            setLoading(true);
            const response = await inviteApi.getInviteById(inviteId);
            if (response.success && response.invite) {
                setInvite(response.invite);
            } else {
                Alert.alert("Error", "Failed to load invite details");
                navigation?.goBack();
            }
        } catch (error: any) {
            logger.error("Failed to load invite:", error);
            Alert.alert("Error", error.message || "Failed to load invite details");
            navigation?.goBack();
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadInvite();
        setRefreshing(false);
    }, [inviteId]);

    const handleRespond = async (response: "accepted" | "declined") => {
        if (!invite) {
            console.warn("🔴 [InviteDetailScreen] No invite object, cannot respond");
            return;
        }
        
        console.log("🔵 [InviteDetailScreen] handleRespond CALLED", { inviteId: invite.id, response });
        setResponding(true);
        try {
            console.log("🔵 [InviteDetailScreen] About to call inviteApi.respondToInvite", { inviteId: invite.id, response });
            logger.info("[InviteDetailScreen] Attempting to respond to invite", {
                inviteId: invite.id,
                response,
            });
            
            const result = await inviteApi.respondToInvite(invite.id, response);
            
            console.log("🟢 [InviteDetailScreen] inviteApi.respondToInvite SUCCESS", { inviteId: invite.id, response, result });
            logger.info("[InviteDetailScreen] Invite response received", {
                inviteId: invite.id,
                response,
                success: result.success,
            });
            
            if (result.success) {
                const delta = result.socialRateDelta;
                const newScore = result.newSocialRate;
                if (delta != null && delta !== 0 && typeof fetchProfile === "function") {
                    await fetchProfile(true);
                    const sign = delta > 0 ? "+" : "";
                    const msg = newScore != null ? `${sign}${delta} Social Rate (${newScore})` : `${sign}${delta} Social Rate`;
                    toast?.show({ message: msg, type: delta > 0 ? "success" : "info" });
                }
                // Navigate back immediately to remove from view
                navigation?.goBack();
                
                Alert.alert(
                    response === "accepted" ? "Accepted!" : "Declined",
                    response === "accepted"
                        ? "You've been added to the tee time!"
                        : "You've declined the invite."
                );
            } else {
                console.warn("🟡 [InviteDetailScreen] Response not successful", { inviteId: invite.id, response, result });
                logger.warn("[InviteDetailScreen] Invite response was not successful", {
                    inviteId: invite.id,
                    response,
                    result,
                });
                Alert.alert("Error", "Failed to respond to invite. Please try again.");
            }
        } catch (error: any) {
            console.error("🔴 [InviteDetailScreen] ERROR in handleRespond", {
                inviteId: invite.id,
                response,
                error: error.message,
                code: error.code,
                statusCode: error.statusCode,
                stack: error.stack,
            });
            logger.error("[InviteDetailScreen] Error responding to invite", {
                inviteId: invite.id,
                response,
                error: error.message,
                stack: error.stack,
                code: error.code,
                statusCode: error.statusCode,
            });
            Alert.alert(
                "Error",
                error.message || "Failed to respond to invite. Please check your connection and try again."
            );
        } finally {
            setResponding(false);
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

    const padZero = (num: number) => num.toString().padStart(2, '0');

    const getInitials = (firstName?: string, lastName?: string) => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    if (loading) {
        return (
            <ScreenShell>
                <AppHeader title="Invite Details" onBack={() => navigation?.goBack()} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenShell>
        );
    }

    if (!invite) {
        return (
            <ScreenShell>
                <AppHeader title="Invite Details" onBack={() => navigation?.goBack()} />
                <View style={styles.centerContainer}>
                    <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                        Invite not found
                    </Text>
                </View>
            </ScreenShell>
        );
    }

    const isInvitee = invite.invitee?.userId === currentUserId;
    const canRespond = isInvitee && invite.status === "pending" && !isExpired;

    return (
        <ScreenShell>
            <AppHeader title="Invite Details" onBack={() => navigation?.goBack()} />
            
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Inviter Section */}
                <View style={styles.section}>
                    <View style={styles.inviterHeader}>
                        {invite.inviter?.avatar ? (
                            <Image
                                source={{ uri: invite.inviter.avatar }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                                <Text style={styles.avatarText}>
                                    {getInitials(invite.inviter?.firstName, invite.inviter?.lastName)}
                                </Text>
                            </View>
                        )}
                        <View style={styles.inviterInfo}>
                            <Text style={[styles.inviterName, { color: colors.text }]}>
                                {invite.inviter?.firstName} {invite.inviter?.lastName}
                            </Text>
                            <Text style={[styles.inviterLabel, { color: colors.textSecondary }]}>
                                {isInvitee ? "invited you to play" : "invited someone to play"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Tee Time Details */}
                <View style={styles.section}>
                    <View style={[styles.detailsCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.detailRow}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
                                <MapPin size={20} color={colors.primary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>COURSE</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>{invite.courseName}</Text>
                                {invite.courseLocation && (
                                    <Text style={[styles.detailSubtext, { color: colors.textSecondary }]}>
                                        {invite.courseLocation}
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <View style={styles.detailRow}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
                                <Calendar size={20} color={colors.primary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>DATE</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {formatDate(invite.teeDate)}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <View style={styles.detailRow}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
                                <Clock size={20} color={colors.primary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>TIME</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>{invite.teeTime}</Text>
                            </View>
                        </View>

                        {invite.maxPlayers && (
                            <>
                                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                                <View style={styles.detailRow}>
                                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
                                        <Users size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.detailContent}>
                                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>GROUP SIZE</Text>
                                        <Text style={[styles.detailValue, { color: colors.text }]}>
                                            {invite.participants?.length || 0} / {invite.maxPlayers} players
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Countdown Timer */}
                {invite.expiresAt && (
                    <View style={styles.section}>
                        <View style={[
                            styles.countdownCard,
                            {
                                backgroundColor: isUrgent ? "#FEF2F2" : "#FFFBEB",
                                borderColor: isUrgent ? "#FECACA" : "#FDE68A",
                            }
                        ]}>
                            <View style={styles.countdownHeader}>
                                <Timer size={18} color={isUrgent ? "#DC2626" : "#D97706"} />
                                <Text style={[
                                    styles.countdownTitle,
                                    { color: isUrgent ? "#DC2626" : "#D97706" }
                                ]}>
                                    {isExpired ? "Invite Expired" : "Time Remaining"}
                                </Text>
                            </View>

                            {!isExpired && countdown && (
                                <View style={styles.countdownContainer}>
                                    {countdown.days > 0 && (
                                        <>
                                            <View style={[
                                                styles.countdownBox,
                                                { backgroundColor: isUrgent ? "#FEE2E2" : "#FEF3C7" }
                                            ]}>
                                                <Text style={[
                                                    styles.countdownNumber,
                                                    { color: isUrgent ? "#DC2626" : "#D97706" }
                                                ]}>
                                                    {countdown.days}
                                                </Text>
                                                <Text style={[
                                                    styles.countdownLabel,
                                                    { color: isUrgent ? "#991B1B" : "#92400E" }
                                                ]}>
                                                    DAY{countdown.days > 1 ? 'S' : ''}
                                                </Text>
                                            </View>
                                            <Text style={[
                                                styles.countdownSeparator,
                                                { color: isUrgent ? "#DC2626" : "#D97706" }
                                            ]}>:</Text>
                                        </>
                                    )}
                                    <View style={[
                                        styles.countdownBox,
                                        { backgroundColor: isUrgent ? "#FEE2E2" : "#FEF3C7" }
                                    ]}>
                                        <Text style={[
                                            styles.countdownNumber,
                                            { color: isUrgent ? "#DC2626" : "#D97706" }
                                        ]}>
                                            {padZero(countdown.hours)}
                                        </Text>
                                        <Text style={[
                                            styles.countdownLabel,
                                            { color: isUrgent ? "#991B1B" : "#92400E" }
                                        ]}>HRS</Text>
                                    </View>
                                    <Text style={[
                                        styles.countdownSeparator,
                                        { color: isUrgent ? "#DC2626" : "#D97706" }
                                    ]}>:</Text>
                                    <View style={[
                                        styles.countdownBox,
                                        { backgroundColor: isUrgent ? "#FEE2E2" : "#FEF3C7" }
                                    ]}>
                                        <Text style={[
                                            styles.countdownNumber,
                                            { color: isUrgent ? "#DC2626" : "#D97706" }
                                        ]}>
                                            {padZero(countdown.mins)}
                                        </Text>
                                        <Text style={[
                                            styles.countdownLabel,
                                            { color: isUrgent ? "#991B1B" : "#92400E" }
                                        ]}>MIN</Text>
                                    </View>
                                    <Text style={[
                                        styles.countdownSeparator,
                                        { color: isUrgent ? "#DC2626" : "#D97706" }
                                    ]}>:</Text>
                                    <View style={[
                                        styles.countdownBox,
                                        { backgroundColor: isUrgent ? "#FEE2E2" : "#FEF3C7" }
                                    ]}>
                                        <Text style={[
                                            styles.countdownNumber,
                                            { color: isUrgent ? "#DC2626" : "#D97706" }
                                        ]}>
                                            {padZero(countdown.secs)}
                                        </Text>
                                        <Text style={[
                                            styles.countdownLabel,
                                            { color: isUrgent ? "#991B1B" : "#92400E" }
                                        ]}>SEC</Text>
                                    </View>
                                </View>
                            )}

                            {isExpired && (
                                <Text style={[styles.expiredText, { color: "#991B1B" }]}>
                                    This invite has expired. The spot may have been offered to someone else.
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Participants Section */}
                {invite.participants && invite.participants.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Participants</Text>
                        <View style={[styles.participantsCard, { backgroundColor: colors.surface }]}>
                            {invite.participants.map((participant, index) => (
                                <View key={participant.id || index} style={styles.participantRow}>
                                    {participant.avatar_url ? (
                                        <Image
                                            source={{ uri: participant.avatar_url }}
                                            style={styles.participantAvatar}
                                        />
                                    ) : (
                                        <View style={[styles.participantAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                                            <Text style={styles.participantAvatarText}>
                                                {getInitials(participant.first_name, participant.last_name)}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.participantInfo}>
                                        <Text style={[styles.participantName, { color: colors.text }]}>
                                            {participant.first_name} {participant.last_name}
                                        </Text>
                                        {participant.is_creator && (
                                            <Text style={[styles.participantRole, { color: colors.textSecondary }]}>
                                                Organizer
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                {canRespond && (
                    <View style={styles.section}>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.declineButton, { backgroundColor: "#FEE2E2" }]}
                                onPress={() => handleRespond("declined")}
                                disabled={responding}
                            >
                                {responding ? (
                                    <ActivityIndicator size="small" color="#DC2626" />
                                ) : (
                                    <>
                                        <X size={18} color="#DC2626" />
                                        <Text style={styles.declineButtonText}>Decline</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.acceptButton, { backgroundColor: colors.primary }]}
                                onPress={() => handleRespond("accepted")}
                                disabled={responding}
                            >
                                {responding ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Check size={18} color="#FFFFFF" />
                                        <Text style={styles.acceptButtonText}>Accept</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Status Badge for non-pending invites */}
                {invite.status !== "pending" && (
                    <View style={styles.section}>
                        <View style={[
                            styles.statusBadge,
                            {
                                backgroundColor: invite.status === "accepted" ? "#D1FAE5" : "#FEE2E2",
                            }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: invite.status === "accepted" ? "#065F46" : "#991B1B" }
                            ]}>
                                {invite.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        fontSize: 16,
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    inviterHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontSize: 20,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    inviterInfo: {
        flex: 1,
    },
    inviterName: {
        fontSize: 18,
        fontWeight: "600",
    },
    inviterLabel: {
        fontSize: 14,
        marginTop: 2,
    },
    detailsCard: {
        borderRadius: 12,
        padding: 16,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: "600",
    },
    detailSubtext: {
        fontSize: 14,
        marginTop: 2,
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    countdownCard: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
    },
    countdownHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    countdownTitle: {
        fontSize: 13,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginLeft: 8,
    },
    countdownContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    countdownBox: {
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        minWidth: 52,
        alignItems: "center",
    },
    countdownNumber: {
        fontSize: 26,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    countdownLabel: {
        fontSize: 9,
        fontWeight: "600",
        marginTop: 2,
        letterSpacing: 0.5,
    },
    countdownSeparator: {
        fontSize: 26,
        fontWeight: "700",
        marginHorizontal: 4,
        marginBottom: 16,
    },
    expiredText: {
        fontSize: 13,
        textAlign: "center",
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
    },
    participantsCard: {
        borderRadius: 12,
        padding: 16,
    },
    participantRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    participantAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    participantAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    participantAvatarText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    participantInfo: {
        flex: 1,
    },
    participantName: {
        fontSize: 15,
        fontWeight: "600",
    },
    participantRole: {
        fontSize: 13,
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
    },
    declineButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
    },
    declineButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#DC2626",
    },
    acceptButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
    },
    acceptButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    statusBadge: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
    },
    statusText: {
        fontSize: 14,
        fontWeight: "600",
    },
});
