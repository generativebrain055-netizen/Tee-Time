import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, X, Users, AlertTriangle } from "lucide-react-native";
import { Header } from "../components/common";
import { attendanceApi, AttendanceRecord } from "../services/api";

const COLORS = {
    primary: "#5DB075",
    bg: "#F6F6F6",
    white: "#FFFFFF",
    text: "#1C1C1E",
    textSub: "#8A8A8E",
    border: "#E5E5EA",
    danger: "#EF4444",
    dangerBg: "#FEE2E2",
    success: "#10B981",
    successBg: "#D1FAE5",
};

interface CheckInScreenProps {
    route: { params: { teeTimeId: string; courseName?: string } };
    navigation: any;
}

type ScreenMode = "initial" | "who_bailed";

const ParticipantCheckbox = memo(({
    participant,
    isSelected,
    onToggle,
}: {
    participant: AttendanceRecord;
    isSelected: boolean;
    onToggle: () => void;
}) => (
    <TouchableOpacity
        style={[styles.participantRow, isSelected && styles.participantRowSelected]}
        onPress={onToggle}
        activeOpacity={0.7}
    >
        <View style={styles.participantInfo}>
            <View style={styles.avatar}>
                {participant.avatar ? (
                    <Image source={{ uri: participant.avatar }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarInitial}>
                        {participant.name?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                )}
            </View>
            <View style={styles.participantDetails}>
                <Text style={styles.participantName}>{participant.name}</Text>
                {participant.isCreator && (
                    <Text style={styles.organizerLabel}>Organizer</Text>
                )}
            </View>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Check size={16} color={COLORS.white} strokeWidth={3} />}
        </View>
    </TouchableOpacity>
));

export default function CheckInScreen({ route, navigation }: CheckInScreenProps) {
    const { teeTimeId, courseName } = route.params;
    const insets = useSafeAreaInsets();

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
            console.error("Failed to load attendance:", error);
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
                            // Mark selected as no-shows, others as present
                            for (const participant of participants) {
                                if (participant.isCreator) continue; // Skip organizer

                                const status = selectedNoShows.has(participant.id) ? 'no_show' : 'present';
                                await attendanceApi.updateAttendance(teeTimeId, participant.id, status);
                            }

                            Alert.alert(
                                "Check-In Complete",
                                `${selectedNoShows.size} player(s) marked as no-show. Penalties have been applied.`,
                                [{ text: "OK", onPress: () => navigation.goBack() }]
                            );
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
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Filter out organizer for no-show selection (organizer can't be marked as no-show)
    const selectableParticipants = participants.filter(p => !p.isCreator);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Header
                title={mode === "initial" ? "Check-In" : "Who Bailed?"}
                onBack={() => mode === "who_bailed" ? setMode("initial") : navigation.goBack()}
            />

            {mode === "initial" ? (
                <View style={styles.content}>
                    {/* Question */}
                    <View style={styles.questionContainer}>
                        <Users size={48} color={COLORS.primary} />
                        <Text style={styles.questionTitle}>Is Everyone Here?</Text>
                        {courseName && (
                            <Text style={styles.courseName}>{courseName}</Text>
                        )}
                        <Text style={styles.participantCount}>
                            {participants.length} player{participants.length !== 1 ? 's' : ''} confirmed
                        </Text>
                    </View>

                    {!checkInAvailable && checkInMessage && (
                        <View style={styles.warningBanner}>
                            <AlertTriangle size={20} color="#F59E0B" />
                            <Text style={styles.warningText}>{checkInMessage}</Text>
                        </View>
                    )}

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.yesButton]}
                            onPress={handleYesEveryone}
                            disabled={submitting || !checkInAvailable}
                            activeOpacity={0.8}
                        >
                            <Check size={24} color={COLORS.white} />
                            <Text style={styles.yesButtonText}>
                                {submitting ? "Checking In..." : "Yes, Everyone's Here"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.noButton]}
                            onPress={handleNoSomeonesBailed}
                            disabled={submitting || !checkInAvailable}
                            activeOpacity={0.8}
                        >
                            <X size={24} color={COLORS.danger} />
                            <Text style={styles.noButtonText}>No, Someone Bailed</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info text */}
                    <Text style={styles.infoText}>
                        Players marked as no-show will receive a -10 Social Rate penalty
                    </Text>
                </View>
            ) : (
                <View style={styles.content}>
                    {/* Who Bailed Header */}
                    <View style={styles.bailedHeader}>
                        <AlertTriangle size={32} color={COLORS.danger} />
                        <Text style={styles.bailedTitle}>Select No-Shows</Text>
                        <Text style={styles.bailedSubtitle}>
                            Tap to select players who didn't show up.{"\n"}
                            They will receive a -10 point penalty.
                        </Text>
                    </View>

                    {/* Participant List */}
                    <ScrollView style={styles.participantList} showsVerticalScrollIndicator={false}>
                        {selectableParticipants.map(participant => (
                            <ParticipantCheckbox
                                key={participant.id}
                                participant={participant}
                                isSelected={selectedNoShows.has(participant.id)}
                                onToggle={() => toggleNoShow(participant.id)}
                            />
                        ))}
                    </ScrollView>

                    {/* Selection Summary */}
                    {selectedNoShows.size > 0 && (
                        <View style={styles.selectionSummary}>
                            <Text style={styles.selectionText}>
                                {selectedNoShows.size} player{selectedNoShows.size !== 1 ? 's' : ''} selected as no-show
                            </Text>
                        </View>
                    )}

                    {/* Confirm Button */}
                    <View style={styles.confirmContainer}>
                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                selectedNoShows.size === 0 && styles.confirmButtonDisabled
                            ]}
                            onPress={handleConfirmNoShows}
                            disabled={submitting}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.confirmButtonText}>
                                {submitting ? "Processing..." : "Confirm & Apply Penalties"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
    content: {
        flex: 1,
        padding: 20,
    },
    questionContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    questionTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: COLORS.text,
        marginTop: 20,
        marginBottom: 8,
    },
    courseName: {
        fontSize: 16,
        color: COLORS.textSub,
        marginBottom: 4,
    },
    participantCount: {
        fontSize: 15,
        color: COLORS.textSub,
    },
    warningBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 10,
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        color: "#92400E",
    },
    buttonContainer: {
        gap: 16,
        marginTop: 20,
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 18,
        borderRadius: 16,
        gap: 12,
    },
    yesButton: {
        backgroundColor: COLORS.primary,
    },
    yesButtonText: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.white,
    },
    noButton: {
        backgroundColor: COLORS.white,
        borderWidth: 2,
        borderColor: COLORS.danger,
    },
    noButtonText: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.danger,
    },
    infoText: {
        fontSize: 13,
        color: COLORS.textSub,
        textAlign: "center",
        marginTop: 24,
    },
    bailedHeader: {
        alignItems: "center",
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        marginBottom: 16,
    },
    bailedTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: COLORS.text,
        marginTop: 12,
    },
    bailedSubtitle: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        marginTop: 8,
        lineHeight: 20,
    },
    participantList: {
        flex: 1,
    },
    participantRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
    },
    participantRowSelected: {
        backgroundColor: COLORS.dangerBg,
        borderWidth: 2,
        borderColor: COLORS.danger,
    },
    participantInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        overflow: "hidden",
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.white,
    },
    participantDetails: {
        flex: 1,
    },
    participantName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    organizerLabel: {
        fontSize: 12,
        color: COLORS.primary,
        marginTop: 2,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxSelected: {
        backgroundColor: COLORS.danger,
        borderColor: COLORS.danger,
    },
    selectionSummary: {
        backgroundColor: COLORS.dangerBg,
        padding: 12,
        borderRadius: 10,
        marginTop: 12,
    },
    selectionText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.danger,
        textAlign: "center",
    },
    confirmContainer: {
        paddingTop: 16,
        paddingBottom: 20,
    },
    confirmButton: {
        backgroundColor: COLORS.danger,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    confirmButtonDisabled: {
        opacity: 0.5,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.white,
    },
});
