/**
 * Pre Tee Time Check-In Screen (Figma 437-321)
 * Allows organizer to check in all participants or mark no-shows
 */
import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Image,
    StyleSheet,
} from "react-native";
import { Check, X, Users, AlertTriangle } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { useColors, useTheme } from "../ui/theme";
import { attendanceApi, AttendanceRecord } from "../services/api";
import { spacing, fontSize, fontFamily, radii } from "../ui/theme/tokens";
import { logger } from "../utils/logger";

interface CheckInScreenProps {
    route: { params: { teeTimeId: string; courseName?: string } };
    navigation: any;
}

type ScreenMode = "initial" | "who_bailed";

const ParticipantCheckbox = memo(({
    participant,
    isSelected,
    onToggle,
    colors,
}: {
    participant: AttendanceRecord;
    isSelected: boolean;
    onToggle: () => void;
    colors: ReturnType<typeof useColors>;
}) => {
    const initials = participant.name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?';

    return (
        <TouchableOpacity
            style={[
                styles.participantRow,
                isSelected && { backgroundColor: colors.errorContainer, borderColor: colors.error, borderWidth: 2 },
                !isSelected && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
            onPress={onToggle}
            activeOpacity={0.7}
        >
            <View style={styles.participantInfo}>
                {participant.avatar ? (
                    <Image source={{ uri: participant.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{initials}</Text>
                    </View>
                )}
                <View style={styles.participantDetails}>
                    <Text style={[styles.participantName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {participant.name}
                    </Text>
                    {participant.isCreator && (
                        <Text style={[styles.organizerLabel, { color: colors.primary }]}>Organizer</Text>
                    )}
                </View>
            </View>
            <View style={[
                styles.checkbox,
                isSelected && { backgroundColor: colors.error, borderColor: colors.error },
                !isSelected && { borderColor: colors.border },
            ]}>
                {isSelected && <Check size={16} color={colors.onError} strokeWidth={3} />}
            </View>
        </TouchableOpacity>
    );
});

export default function CheckInScreen({ route, navigation }: CheckInScreenProps) {
    const { teeTimeId, courseName } = route.params;
    const colors = useColors();
    const theme = useTheme();

    const [mode, setMode] = useState<ScreenMode>("initial");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [participants, setParticipants] = useState<AttendanceRecord[]>([]);
    const [selectedNoShows, setSelectedNoShows] = useState<Set<string>>(new Set());
    const [checkInAvailable, setCheckInAvailable] = useState(true);
    const [checkInMessage, setCheckInMessage] = useState<string | undefined>();

    const loadAttendance = useCallback(async () => {
        try {
            setLoading(true);
            const response = await attendanceApi.getAttendance(teeTimeId);
            if (response.success) {
                // Filter out cancelled participants and the organizer for no-show selection
                const activeParticipants = response.attendance.filter(
                    p => p.status !== 'cancelled'
                );
                setParticipants(activeParticipants);
                setCheckInAvailable(response.checkInAvailable);
                setCheckInMessage(response.checkInMessage);
            }
        } catch (error) {
            logger.error("[CheckInScreen] Failed to load attendance", error);
            Alert.alert("Error", "Failed to load attendance data");
        } finally {
            setLoading(false);
        }
    }, [teeTimeId]);

    useEffect(() => {
        loadAttendance();
    }, [loadAttendance]);

    const handleYesEveryone = useCallback(async () => {
        setSubmitting(true);
        try {
            const response = await attendanceApi.checkInAll(teeTimeId);
            if (response.success) {
                Alert.alert(
                    "Check-In Complete ✓",
                    `All ${response.checkedIn} players have been checked in. Have a great round!`,
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            }
        } catch (error: any) {
            Alert.alert("Error", error?.message || "Failed to check in players");
        } finally {
            setSubmitting(false);
        }
    }, [teeTimeId, navigation]);

    const handleNoSomeonesBailed = useCallback(() => {
        setMode("who_bailed");
    }, []);

    const toggleNoShow = useCallback((participantId: string) => {
        setSelectedNoShows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(participantId)) {
                newSet.delete(participantId);
            } else {
                newSet.add(participantId);
            }
            return newSet;
        });
    }, []);

    const handleConfirmNoShows = useCallback(async () => {
        if (selectedNoShows.size === 0) {
            Alert.alert("No Selection", "Please select the players who didn't show up, or go back and select 'Yes' if everyone is here.");
            return;
        }

        const noShowNames = participants
            .filter(p => selectedNoShows.has(p.id))
            .map(p => p.name)
            .join(", ");

        Alert.alert(
            "Confirm No-Shows",
            `The following players will be marked as no-shows and receive a -10 point penalty:\n\n${noShowNames}\n\nAre you sure?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    style: "destructive",
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            // Prepare batch updates: selected as no-shows, others as present
                            const updates = participants
                                .filter(p => !p.isCreator) // Skip organizer
                                .map(p => ({
                                    attendanceId: p.id,
                                    status: (selectedNoShows.has(p.id) ? 'no_show' : 'present') as 'present' | 'no_show',
                                }));

                            // Use batch update endpoint which also completes check-in
                            const response = await attendanceApi.batchUpdateAttendance(teeTimeId, updates);
                            
                            if (response.success) {
                                const message = response.noShow > 0
                                    ? `${response.noShow} player(s) marked as no-show. Penalties have been applied.`
                                    : 'All players checked in successfully.';
                                
                                Alert.alert(
                                    "Check-In Complete",
                                    message,
                                    [{ text: "OK", onPress: () => navigation.goBack() }]
                                );
                            } else {
                                throw new Error(response.message || "Failed to update attendance");
                            }
                        } catch (error: any) {
                            Alert.alert("Error", error?.message || "Failed to update attendance");
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            ]
        );
    }, [selectedNoShows, participants, teeTimeId, navigation]);

    if (loading) {
        return (
            <ScreenShell>
                <AppHeader title="Check-In" onBack={() => navigation.goBack()} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenShell>
        );
    }

    // Filter out organizer for no-show selection (organizer can't be marked as no-show)
    const selectableParticipants = participants.filter(p => !p.isCreator);

    return (
        <ScreenShell>
            <AppHeader
                title={mode === "initial" ? "Check-In" : "Who Bailed?"}
                onBack={() => mode === "who_bailed" ? setMode("initial") : navigation.goBack()}
            />

            {mode === "initial" ? (
                <View style={styles.container}>
                    {/* Question Section */}
                    <View style={styles.questionSection}>
                        <Users size={48} color={colors.primary} strokeWidth={2} />
                        <Text style={[styles.questionTitle, { color: colors.textPrimary }]}>
                            Is Everyone Here?
                        </Text>
                        {courseName && (
                            <Text style={[styles.courseName, { color: colors.textSecondary }]}>
                                {courseName}
                            </Text>
                        )}
                        <Text style={[styles.participantCount, { color: colors.textSecondary }]}>
                            {participants.length} player{participants.length !== 1 ? 's' : ''} confirmed
                        </Text>
                    </View>

                    {/* Warning Message */}
                    {!checkInAvailable && checkInMessage && (
                        <View style={[styles.warningBanner, { backgroundColor: colors.warningContainer }]}>
                            <AlertTriangle size={20} color={colors.warning} />
                            <Text style={[styles.warningText, { color: colors.onWarningContainer }]}>
                                {checkInMessage}
                            </Text>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                { backgroundColor: colors.primary },
                                (submitting || !checkInAvailable) && styles.buttonDisabled,
                            ]}
                            onPress={handleYesEveryone}
                            disabled={submitting || !checkInAvailable}
                            activeOpacity={0.8}
                        >
                            <Check size={24} color={colors.onPrimary} strokeWidth={2.5} />
                            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                                {submitting ? "Checking In..." : "Yes, Everyone's Here"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.secondaryButton,
                                { backgroundColor: colors.surface, borderColor: colors.error },
                                (submitting || !checkInAvailable) && styles.buttonDisabled,
                            ]}
                            onPress={handleNoSomeonesBailed}
                            disabled={submitting || !checkInAvailable}
                            activeOpacity={0.8}
                        >
                            <X size={24} color={colors.error} strokeWidth={2.5} />
                            <Text style={[styles.buttonTextSecondary, { color: colors.error }]}>
                                No, Someone Bailed
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Text */}
                    <Text style={[styles.infoText, { color: colors.textMuted }]}>
                        Players marked as no-show will receive a -10 Social Rate penalty
                    </Text>
                </View>
            ) : (
                <View style={styles.container}>
                    {/* Who Bailed Header */}
                    <View style={[styles.headerSection, { borderBottomColor: colors.border }]}>
                        <AlertTriangle size={32} color={colors.error} strokeWidth={2} />
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                            Select No-Shows
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                            Tap to select players who didn't show up.{"\n"}
                            They will receive a -10 point penalty.
                        </Text>
                    </View>

                    {/* Participant List */}
                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        {selectableParticipants.map(participant => (
                            <ParticipantCheckbox
                                key={participant.id}
                                participant={participant}
                                isSelected={selectedNoShows.has(participant.id)}
                                onToggle={() => toggleNoShow(participant.id)}
                                colors={colors}
                            />
                        ))}
                    </ScrollView>

                    {/* Selection Summary */}
                    {selectedNoShows.size > 0 && (
                        <View style={[styles.summaryBanner, { backgroundColor: colors.errorContainer }]}>
                            <Text style={[styles.summaryText, { color: colors.onErrorContainer }]}>
                                {selectedNoShows.size} player{selectedNoShows.size !== 1 ? 's' : ''} selected as no-show
                            </Text>
                        </View>
                    )}

                    {/* Confirm Button */}
                    <View style={styles.confirmButtonContainer}>
                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                { backgroundColor: colors.error },
                                selectedNoShows.size === 0 && styles.buttonDisabled,
                            ]}
                            onPress={handleConfirmNoShows}
                            disabled={submitting || selectedNoShows.size === 0}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.confirmButtonText, { color: colors.onError }]}>
                                {submitting ? "Processing..." : "Confirm & Apply Penalties"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        padding: spacing.lg,
    },
    questionSection: {
        alignItems: 'center',
        paddingVertical: spacing['4xl'],
    },
    questionTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize['3xl'],
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    courseName: {
        fontFamily: fontFamily.medium,
        fontSize: fontSize.base,
        marginBottom: spacing.xs,
    },
    participantCount: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.base,
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        marginBottom: spacing.xl,
        gap: spacing.sm,
    },
    warningText: {
        flex: 1,
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
    },
    buttonContainer: {
        gap: spacing.lg,
        marginTop: spacing.xl,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        gap: spacing.md,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 2,
        gap: spacing.md,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.lg,
    },
    buttonTextSecondary: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.lg,
    },
    infoText: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        textAlign: 'center',
        marginTop: spacing['2xl'],
    },
    headerSection: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        borderBottomWidth: 1,
        marginBottom: spacing.lg,
    },
    headerTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize['2xl'],
        marginTop: spacing.md,
    },
    headerSubtitle: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        textAlign: 'center',
        marginTop: spacing.sm,
        lineHeight: fontSize.base * 1.25,
    },
    scrollView: {
        flex: 1,
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderRadius: radii.md,
        marginBottom: spacing.sm,
    },
    participantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: radii.full,
        marginRight: spacing.md,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: radii.full,
        marginRight: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
    },
    participantDetails: {
        flex: 1,
        minWidth: 0,
    },
    participantName: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
    },
    organizerLabel: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.xs,
        marginTop: spacing['2xs'],
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: radii.full,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryBanner: {
        padding: spacing.md,
        borderRadius: radii.md,
        marginTop: spacing.md,
    },
    summaryText: {
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
        textAlign: 'center',
    },
    confirmButtonContainer: {
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
    },
    confirmButton: {
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
    },
});
