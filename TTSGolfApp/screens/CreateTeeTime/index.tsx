import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { teeTimeApi, inviteApi, rosterApi, RosterContact } from "../../services/api";
import { COLORS } from "./constants";
import DatePickerModal from "./DatePickerModal";
import InviteDetailsStep from "./InviteDetailsStep";
import InviteTypeStep from "./InviteTypeStep";
import SelectPlayersStep from "./SelectPlayersStep";

type InviteType = "roster" | "fcfs" | "open";

export default function CreateTeeTimeScreen({ navigation }: any) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form state
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [location, setLocation] = useState("");
    const [groupSize, setGroupSize] = useState(4);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Calendar state
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

    // Step 2 & 3 state
    const [inviteType, setInviteType] = useState<InviteType>("roster");
    const [roster, setRoster] = useState<RosterContact[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

    const formatDateDisplay = (date: Date | null) => {
        if (!date) return "YYYY-MM-DD";
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        const d = date.getDate().toString().padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const handleContinue = async () => {
        if (step === 1) {
            if (!selectedDate || !selectedTime || !location) {
                Alert.alert("Missing Info", "Please fill in date, time, and location");
                return;
            }
            try {
                const response = await rosterApi.getRoster();
                if (response.success) setRoster(response.roster);
            } catch (e) {
                console.log("Failed to load roster");
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
            const teeDate = formatDateDisplay(selectedDate);
            const teeTime = selectedTime?.replace(" AM", "").replace(" PM", "") || "08:00";

            const response = await teeTimeApi.createTeeTime({
                courseName: location.split(",")[0].trim(),
                courseLocation: location,
                teeDate,
                teeTime,
                maxPlayers: groupSize,
                inviteType,
            });

            if (response.success && inviteType === "roster" && selectedPlayers.length > 0) {
                await inviteApi.createFromRoster(response.teeTime.id, selectedPlayers);
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

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : navigation?.goBack())}>
                    <ArrowLeft size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite Details</Text>
                <View style={{ width: 24 }} />
            </View>

            {step === 1 && (
                <InviteDetailsStep
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    location={location}
                    groupSize={groupSize}
                    onOpenDatePicker={() => setShowDatePicker(true)}
                    onSelectTime={setSelectedTime}
                    onLocationChange={setLocation}
                    onGroupSizeChange={setGroupSize}
                />
            )}
            {step === 2 && <InviteTypeStep inviteType={inviteType} onSelectType={setInviteType} />}
            {step === 3 && (
                <SelectPlayersStep
                    roster={roster}
                    selectedPlayers={selectedPlayers}
                    groupSize={groupSize}
                    onTogglePlayer={togglePlayer}
                />
            )}

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

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
                    onPress={handleContinue}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.continueBtnText}>
                            {step === 3 || (step === 2 && inviteType !== "roster") ? "Create Invite" : "Continue"}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: COLORS.white,
    },
    headerTitle: { fontSize: 17, fontWeight: "600", color: COLORS.text },
    footer: { padding: 20, paddingBottom: 34, backgroundColor: COLORS.white },
    continueBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
    },
    continueBtnDisabled: { opacity: 0.6 },
    continueBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
});
