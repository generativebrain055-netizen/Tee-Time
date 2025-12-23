import React, { memo } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Calendar } from "lucide-react-native";
import { TeeTime } from "../types";
import { CALENDAR_COLORS } from "../constants";
import { formatSelectedDate } from "../utils";
import TeeTimeCard from "./TeeTimeCard";

interface TeeTimesListProps {
    selectedDate: Date | null;
    teeTimes: TeeTime[];
    loading: boolean;
}

const EmptyState = memo(() => (
    <View style={styles.empty}>
        <Calendar size={48} color={CALENDAR_COLORS.textSecondary} />
        <Text style={styles.emptyText}>No tee times scheduled</Text>
    </View>
));

const TeeTimesList = memo(({ selectedDate, teeTimes, loading }: TeeTimesListProps) => {
    if (!selectedDate) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{formatSelectedDate(selectedDate)}</Text>

            {loading ? (
                <ActivityIndicator size="large" color={CALENDAR_COLORS.primary} style={styles.loader} />
            ) : teeTimes.length > 0 ? (
                teeTimes.map((teeTime) => <TeeTimeCard key={teeTime.id} teeTime={teeTime} />)
            ) : (
                <EmptyState />
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: CALENDAR_COLORS.text,
        marginBottom: 16,
    },
    loader: {
        marginTop: 20,
    },
    empty: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: CALENDAR_COLORS.textSecondary,
        marginTop: 12,
    },
});

export default TeeTimesList;
