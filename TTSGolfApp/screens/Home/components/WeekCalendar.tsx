import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { COLORS, DAYS_SHORT } from "../constants";
import { WeekDay } from "../types";

interface WeekCalendarProps {
    weekDays: WeekDay[];
    onViewSchedule: () => void;
}

export default function WeekCalendar({ weekDays, onViewSchedule }: WeekCalendarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>This week</Text>
                <TouchableOpacity style={styles.viewSchedule} onPress={onViewSchedule}>
                    <Text style={styles.viewScheduleText}>View schedule</Text>
                    <ChevronRight size={16} color={COLORS.primary} />
                </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
                {weekDays.map((day, index) => (
                    <View key={index} style={styles.dayColumn}>
                        <Text style={styles.dayName}>{day.dayName}</Text>
                        <View style={[styles.dayCircle, day.isToday && styles.todayCircle]}>
                            <Text style={[styles.dayNumber, day.isToday && styles.todayNumber]}>
                                {day.dayNumber}
                            </Text>
                        </View>
                        {day.hasEvent && <View style={styles.eventDot} />}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    viewSchedule: {
        flexDirection: "row",
        alignItems: "center",
    },
    viewScheduleText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.primary,
    },
    weekRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    dayColumn: {
        alignItems: "center",
        flex: 1,
    },
    dayName: {
        fontSize: 13,
        fontWeight: "500",
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    todayCircle: {
        backgroundColor: COLORS.primary,
    },
    dayNumber: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    todayNumber: {
        color: COLORS.white,
    },
    eventDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
        marginTop: 4,
    },
});
