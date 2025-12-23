import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { CalendarDay } from "../types";
import { CALENDAR_COLORS, DAY_CELL_WIDTH, DAYS_OF_WEEK, MONTHS } from "../constants";

interface DayCellProps {
    item: CalendarDay;
    onPress: (day: number | "") => void;
}

const DayCell = memo(({ item, onPress }: DayCellProps) => {
    const handlePress = useCallback(() => onPress(item.day), [item.day, onPress]);

    if (item.day === "") {
        return <View style={styles.dayCell} />;
    }

    const cellStyle = [
        styles.dayCellInner,
        item.isSelected && styles.selectedDayBg,
        !item.isSelected && item.isToday && styles.todayBg,
        !item.isSelected && !item.isToday && item.hasEvent && styles.eventDayBg,
    ];

    const textStyle = [
        styles.dayText,
        item.isSelected && styles.selectedDayText,
        !item.isSelected && item.isToday && styles.todayText,
    ];

    return (
        <TouchableOpacity style={styles.dayCell} onPress={handlePress}>
            <View style={cellStyle}>
                <Text style={textStyle}>{item.day}</Text>
                {item.hasEvent && !item.isSelected && <View style={styles.eventDot} />}
            </View>
        </TouchableOpacity>
    );
});

interface CalendarGridProps {
    currentMonth: number;
    currentYear: number;
    calendarDays: CalendarDay[];
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onDayPress: (day: number | "") => void;
}

const CalendarGrid = memo(({
    currentMonth,
    currentYear,
    calendarDays,
    onPrevMonth,
    onNextMonth,
    onDayPress,
}: CalendarGridProps) => (
    <View style={styles.calendarCard}>
        {/* Month Navigation */}
        <View style={styles.monthHeader}>
            <TouchableOpacity onPress={onPrevMonth}>
                <ChevronLeft color={CALENDAR_COLORS.textSecondary} size={24} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
                {MONTHS[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={onNextMonth}>
                <ChevronRight color={CALENDAR_COLORS.textSecondary} size={24} />
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
            {calendarDays.map((item) => (
                <DayCell key={item.id} item={item} onPress={onDayPress} />
            ))}
        </View>
    </View>
));

const styles = StyleSheet.create({
    calendarCard: {
        backgroundColor: CALENDAR_COLORS.white,
        marginHorizontal: 20,
        marginTop: 20,
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
    monthTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: CALENDAR_COLORS.text,
    },
    weekRow: {
        flexDirection: "row",
        justifyContent: "flex-start",
        marginBottom: 10,
    },
    weekDayText: {
        width: DAY_CELL_WIDTH,
        textAlign: "center",
        color: CALENDAR_COLORS.textSecondary,
        fontSize: 14,
        fontWeight: "500",
    },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
    },
    dayCell: {
        width: DAY_CELL_WIDTH,
        height: 50,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    dayCellInner: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    dayText: {
        fontSize: 15,
        color: CALENDAR_COLORS.text,
        fontWeight: "500",
    },
    selectedDayBg: {
        backgroundColor: CALENDAR_COLORS.primary,
    },
    selectedDayText: {
        color: CALENDAR_COLORS.white,
        fontWeight: "bold",
    },
    todayBg: {
        borderWidth: 2,
        borderColor: CALENDAR_COLORS.primary,
    },
    todayText: {
        color: CALENDAR_COLORS.primary,
        fontWeight: "bold",
    },
    eventDayBg: {
        backgroundColor: CALENDAR_COLORS.grayCircle,
        borderRadius: 18,
    },
    eventDot: {
        position: "absolute",
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: CALENDAR_COLORS.primary,
    },
});

export default CalendarGrid;
