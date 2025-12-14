import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { COLORS, DAY_CELL_WIDTH, DAYS_OF_WEEK, MONTHS } from "./constants";

interface CalendarDay {
    day: number | "";
    id: string;
    hasEvent?: boolean;
    isSelected?: boolean;
    isToday?: boolean;
}

interface CalendarSectionProps {
    currentMonth: number;
    currentYear: number;
    calendarDays: CalendarDay[];
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onDayPress: (day: number | "") => void;
    onViewFullCalendar: () => void;
}

export default function CalendarSection({
    currentMonth,
    currentYear,
    calendarDays,
    onPrevMonth,
    onNextMonth,
    onDayPress,
    onViewFullCalendar,
}: CalendarSectionProps) {
    return (
        <View style={styles.cardContainer}>
            {/* Month Navigation */}
            <View style={styles.monthHeader}>
                <TouchableOpacity onPress={onPrevMonth}>
                    <ChevronLeft color={COLORS.textSecondary} size={24} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                    {MONTHS[currentMonth]} {currentYear}
                </Text>
                <TouchableOpacity onPress={onNextMonth}>
                    <ChevronRight color={COLORS.textSecondary} size={24} />
                </TouchableOpacity>
            </View>

            {/* Days of Week */}
            <View style={styles.weekRow}>
                {DAYS_OF_WEEK.map((day) => (
                    <Text key={day} style={styles.weekDayText}>{day}</Text>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
                {calendarDays.map((item) => {
                    if (item.day === "") {
                        return <View key={item.id} style={styles.dayCell} />;
                    }

                    let cellStyle: ViewStyle[] = [styles.dayCellInner];
                    let textStyle: TextStyle[] = [styles.dayText];

                    if (item.isSelected) {
                        cellStyle.push(styles.selectedDayBg);
                        textStyle.push(styles.selectedDayText);
                    } else if (item.isToday) {
                        cellStyle.push(styles.todayBg);
                        textStyle.push(styles.todayText);
                    } else if (item.hasEvent) {
                        cellStyle.push(styles.eventDayBg);
                    }

                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.dayCell}
                            onPress={() => onDayPress(item.day)}
                        >
                            <View style={cellStyle}>
                                <Text style={textStyle}>{item.day}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TouchableOpacity style={styles.fullCalendarBtn} onPress={onViewFullCalendar}>
                <Text style={styles.fullCalendarBtnText}>View Full Calendar</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    monthHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    monthTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
    weekRow: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 10 },
    weekDayText: {
        width: DAY_CELL_WIDTH,
        textAlign: "center",
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: "500",
    },
    calendarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
    dayCell: {
        width: DAY_CELL_WIDTH,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    dayCellInner: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    dayText: { fontSize: 15, color: COLORS.text, fontWeight: "500" },
    selectedDayBg: { backgroundColor: COLORS.primary, borderRadius: 12 },
    selectedDayText: { color: COLORS.white, fontWeight: "bold" },
    todayBg: { borderWidth: 2, borderColor: COLORS.primary, borderRadius: 12 },
    todayText: { color: COLORS.primary, fontWeight: "bold" },
    eventDayBg: { backgroundColor: COLORS.grayCircle, borderRadius: 18 },
    fullCalendarBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 20,
    },
    fullCalendarBtnText: { color: COLORS.white, fontWeight: "600", fontSize: 16 },
});
