import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Image,
} from "react-native";
import { Check, X, Users, AlertTriangle } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { useColors } from "../ui/theme/ThemeContext";
import { attendanceApi, AttendanceRecord } from "../services/api";

const COLORS = {
    primary: "#5EBC68",
    white: "#FFFFFF",
    danger: "#EF4444",
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
        className={`flex-row items-center justify-between p-4 rounded-md mb-2.5 ${
            isSelected ? "bg-red-100 border-2 border-red-500" : "bg-white"
        }`}
        onPress={onToggle}
        activeOpacity={0.7}
    >
        <View className="flex-row items-center flex-1">
            <View className="w-11 h-11 rounded-full bg-primary justify-center items-center mr-3 overflow-hidden">
                {participant.avatar ? (
                    <Image source={{ uri: participant.avatar }} className="w-11 h-11 rounded-full" />
                ) : (
                    <Text className="text-lg font-semibold text-white">
                        {participant.name?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                )}
            </View>
            <View className="flex-1">
                <Text className="text-base font-semibold text-text-primary">{participant.name}</Text>
                {participant.isCreator && (
                    <Text className="text-xs text-primary mt-0.5">Organizer</Text>
                )}
            </View>
        </View>
        <View className={`w-7 h-7 rounded-full border-2 justify-center items-center ${
            isSelected ? "bg-red-500 border-red-500" : "border-[#E5E5EA]"
        }`}>
            {isSelected && <Check size={16} color={COLORS.white} strokeWidth={3} />}
        </View>
    </TouchableOpacity>
));

export default function CheckInScreen({ route, navigation }: CheckInScreenProps) {
    const { teeTimeId, courseName } = route.params;

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
            <ScreenShell>
                <AppHeader title="Check-In" onBack={() => navigation.goBack()} />
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
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
                <View className="flex-1 p-5">
                    {/* Question */}
                    <View className="items-center py-10">
                        <Users size={48} color={COLORS.primary} />
                        <Text className="text-3xl font-bold text-text-primary mt-5 mb-2">Is Everyone Here?</Text>
                        {courseName && (
                            <Text className="text-base text-[#8A8A8E] mb-1">{courseName}</Text>
                        )}
                        <Text className="text-[15px] text-[#8A8A8E]">
                            {participants.length} player{participants.length !== 1 ? 's' : ''} confirmed
                        </Text>
                    </View>

                    {!checkInAvailable && checkInMessage && (
                        <View className="flex-row items-center bg-amber-100 p-3 rounded-md mb-5 gap-2.5">
                            <AlertTriangle size={20} color="#F59E0B" />
                            <Text className="flex-1 text-sm text-amber-800">{checkInMessage}</Text>
                        </View>
                    )}

                    {/* Buttons */}
                    <View className="gap-4 mt-5">
                        <TouchableOpacity
                            className="flex-row items-center justify-center py-[18px] rounded-md gap-3 bg-primary"
                            onPress={handleYesEveryone}
                            disabled={submitting || !checkInAvailable}
                            activeOpacity={0.8}
                        >
                            <Check size={24} color={COLORS.white} />
                            <Text className="text-lg font-semibold text-white">
                                {submitting ? "Checking In..." : "Yes, Everyone's Here"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-row items-center justify-center py-[18px] rounded-md gap-3 bg-white border-2 border-red-500"
                            onPress={handleNoSomeonesBailed}
                            disabled={submitting || !checkInAvailable}
                            activeOpacity={0.8}
                        >
                            <X size={24} color={COLORS.danger} />
                            <Text className="text-lg font-semibold text-red-500">No, Someone Bailed</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info text */}
                    <Text className="text-[13px] text-[#8A8A8E] text-center mt-6">
                        Players marked as no-show will receive a -10 Social Rate penalty
                    </Text>
                </View>
            ) : (
                <View className="flex-1 p-5">
                    {/* Who Bailed Header */}
                    <View className="items-center py-6 border-b border-[#E5E5EA] mb-4">
                        <AlertTriangle size={32} color={COLORS.danger} />
                        <Text className="text-2xl font-bold text-text-primary mt-3">Select No-Shows</Text>
                        <Text className="text-sm text-[#8A8A8E] text-center mt-2 leading-5">
                            Tap to select players who didn't show up.{"\n"}
                            They will receive a -10 point penalty.
                        </Text>
                    </View>

                    {/* Participant List */}
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
                        <View className="bg-red-100 p-3 rounded-md mt-3">
                            <Text className="text-sm font-medium text-red-500 text-center">
                                {selectedNoShows.size} player{selectedNoShows.size !== 1 ? 's' : ''} selected as no-show
                            </Text>
                        </View>
                    )}

                    {/* Confirm Button */}
                    <View className="pt-4 pb-5">
                        <TouchableOpacity
                            className={`bg-red-500 py-4 rounded-md items-center ${
                                selectedNoShows.size === 0 ? "opacity-50" : ""
                            }`}
                            onPress={handleConfirmNoShows}
                            disabled={submitting}
                            activeOpacity={0.8}
                        >
                            <Text className="text-base font-semibold text-white">
                                {submitting ? "Processing..." : "Confirm & Apply Penalties"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScreenShell>
    );
}
