import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { teeTimeApi, inviteApi, friendApi, Friend } from "../../services/api";
import { COLORS } from "./constants";
import DatePickerModal from "./DatePickerModal";
import TimePickerModal from "./TimePickerModal";
import InviteDetailsStep from "./InviteDetailsStep";
import InviteTypeStep from "./InviteTypeStep";
import SelectPlayersStep from "./SelectPlayersStep";

type InviteType = "roster" | "fcfs" | "open";

export default function CreateTeeTimeScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form state
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>("10:00 AM");
    const [location, setLocation] = useState("");
    const [groupSize, setGroupSize] = useState(2);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Calendar state
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

    // Step 2 & 3 state
    const [inviteType, setInviteType] = useState<InviteType>("roster");
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

    const formatDateForApi = (date: Date | null) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        const d = date.getDate().toString().padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const formatTimeForApi = (time: string) => {
        // Convert "10:00 AM" to "10:00" or "8:30 PM" to "20:30"
        const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return "10:00";
        let hour = parseInt(match[1]);
        const minute = match[2];
        const period = match[3].toUpperCase();
        if (period === "PM" && hour !== 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;
        return `${hour.toString().padStart(2, "0")}:${minute}`;
    };

    const handleContinue = async () => {
        if (step === 1) {
            if (!selectedDate || !location) {
                Alert.alert("Missing Info", "Please fill in date and location");
                return;
            }
            try {
                const response = await friendApi.getFriends();
                if (response.success) setFriends(response.friends);
            } catch (e) {
                console.log("Failed to load friends");
            }
            setStep(2);
        } else if (step === 2) {
            if (inviteType === "roster") {
                setStep(3);
            } else {
                await handleCreate();
            }
        } else {
            await handleCreate();
        }
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            const response = await teeTimeApi.createTeeTime({
                courseName: location.split(",")[0].trim(),
                courseLocation: location,
                teeDate: formatDateForApi(selectedDate),
                teeTime: formatTimeForApi(selectedTime),
                maxPlayers: groupSize,
                inviteType,
            });

            if (response.success && inviteType === "roster" && selectedPlayers.length > 0) {
                // Create invites for selected friends
                const invitees = selectedPlayers.map(id => {
                    const friend = friends.find(f => f.id === id);
                    return { userId: id, name: friend ? `${friend.firstName} ${friend.lastName}` : undefined };
                });
                await inviteApi.createInvites(response.teeTime.id, invitees);
            }

            Alert.alert("Success", "Tee time created!", [
                { text: "OK", onPress: () => navigation?.goBack() },
            ]);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to create tee time");
        } finally {
            setLoading(false);
        }
    };

    const togglePlayer = (id: string) => {
        setSelectedPlayers((prev) =>
            prev.includes(id)
                ? prev.filter((p) => p !== id)
                : prev.length < groupSize - 1
                    ? [...prev, id]
                    : prev
        );
    };

    const handleSelectDate = (day: number) => {
        setSelectedDate(new Date(calendarYear, calendarMonth, day));
        setShowDatePicker(false);
    };

    const prevMonth = () => {
        if (calendarMonth === 0) {
            setCalendarMonth(11);
            setCalendarYear(calendarYear - 1);
        } else {
            setCalendarMonth(calendarMonth - 1);
        }
    };

    const nextMonth = () => {
        if (calendarMonth === 11) {
            setCalendarMonth(0);
            setCalendarYear(calendarYear + 1);
        } else {
            setCalendarMonth(calendarMonth + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            navigation?.goBack();
        }
    };

    const getButtonText = () => {
        if (step === 3 || (step === 2 && inviteType !== "roster")) {
            return "Create Invite";
        }
        return "Continue";
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <ArrowLeft size={24} color={COLORS.text} strokeWidth={1.5} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite Details</Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.divider} />

            {/* Content */}
            {step === 1 && (
                <InviteDetailsStep
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    location={location}
                    groupSize={groupSize}
                    onOpenDatePicker={() => setShowDatePicker(true)}
                    onOpenTimePicker={() => setShowTimePicker(true)}
                    onLocationChange={setLocation}
                    onGroupSizeChange={setGroupSize}
                />
            )}
            {step === 2 && (
                <InviteTypeStep inviteType={inviteType} onSelectType={setInviteType} />
            )}
            {step === 3 && (
                <SelectPlayersStep
                    friends={friends}
                    selectedPlayers={selectedPlayers}
                    groupSize={groupSize}
                    onTogglePlayer={togglePlayer}
                />
            )}

            {/* Modals */}
            <DatePickerModal
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                calendarMonth={calendarMonth}
                calendarYear={calendarYear}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
            />

            <TimePickerModal
                visible={showTimePicker}
                onClose={() => setShowTimePicker(false)}
                onSelect={setSelectedTime}
                initialTime={selectedTime}
            />

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
                    onPress={handleContinue}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.continueBtnText}>{getButtonText()}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
        width: 40,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: COLORS.text,
    },
    headerSpacer: {
        width: 40,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
    },
    footer: {
        padding: 20,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    continueBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
    },
    continueBtnDisabled: {
        opacity: 0.6,
    },
    continueBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "600",
    },
});
