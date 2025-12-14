import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { X, ChevronLeft, ChevronRight } from "lucide-react-native";
import { COLORS, MONTHS, DAYS, SCREEN_WIDTH } from "./constants";

interface DatePickerModalProps {
    visible: boolean;
    onClose: () => void;
    calendarMonth: number;
    calendarYear: number;
    selectedDate: Date | null;
    onSelectDate: (day: number) => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
}

export default function DatePickerModal({
    visible,
    onClose,
    calendarMonth,
    calendarYear,
    selectedDate,
    onSelectDate,
    onPrevMonth,
    onNextMonth,
}: DatePickerModalProps) {
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const generateCalendarDays = () => {
        const days: (number | null)[] = [];
        const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
        const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);
        return days;
    };

    const today = new Date();
    const isToday = (day: number) =>
        today.getDate() === day &&
        today.getMonth() === calendarMonth &&
        today.getFullYear() === calendarYear;

    const isSelected = (day: number) =>
        selectedDate?.getDate() === day &&
        selectedDate?.getMonth() === calendarMonth &&
        selectedDate?.getFullYear() === calendarYear;

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.calendarModal}>
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <View style={styles.calendarNav}>
                            <TouchableOpacity onPress={onPrevMonth}>
                                <ChevronLeft size={24} color={COLORS.text} />
                            </TouchableOpacity>
                            <Text style={styles.calendarTitle}>
                                {MONTHS[calendarMonth]} {calendarYear}
                            </Text>
                            <TouchableOpacity onPress={onNextMonth}>
                                <ChevronRight size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.calendarDaysHeader}>
                        {DAYS.map((d, i) => (
                            <Text key={i} style={styles.calendarDayLabel}>{d}</Text>
                        ))}
                    </View>

                    <View style={styles.calendarGrid}>
                        {generateCalendarDays().map((day, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[
                                    styles.calendarDay,
                                    day !== null && isToday(day) ? styles.calendarDayToday : undefined,
                                    day !== null && isSelected(day) ? styles.calendarDaySelected : undefined,
                                ]}
                                onPress={() => day !== null && onSelectDate(day)}
                                disabled={day === null}
                            >
                                <Text
                                    style={[
                                        styles.calendarDayText,
                                        day !== null && isToday(day) ? styles.calendarDayTodayText : undefined,
                                        day !== null && isSelected(day) ? styles.calendarDaySelectedText : undefined,
                                    ]}
                                >
                                    {day !== null ? day : ""}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    calendarModal: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    calendarHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    calendarNav: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
    calendarTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text, minWidth: 100, textAlign: "center" },
    calendarDaysHeader: { flexDirection: "row", marginBottom: 10 },
    calendarDayLabel: { flex: 1, textAlign: "center", fontSize: 14, fontWeight: "500", color: COLORS.textSub },
    calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
    calendarDay: {
        width: (SCREEN_WIDTH - 40) / 7,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    calendarDayToday: { backgroundColor: "#F3F4F6", borderRadius: 22 },
    calendarDaySelected: { backgroundColor: COLORS.primary, borderRadius: 22 },
    calendarDayText: { fontSize: 15, color: COLORS.text },
    calendarDayTodayText: { fontWeight: "600" },
    calendarDaySelectedText: { color: COLORS.white, fontWeight: "600" },
});
