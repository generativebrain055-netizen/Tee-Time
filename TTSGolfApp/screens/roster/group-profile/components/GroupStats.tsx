import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../../../constants/colors";

interface StatBoxProps {
    value: string | number;
    label: string;
    color: string;
}

const StatBox = memo(({ value, label, color }: StatBoxProps) => (
    <View style={[styles.box, { backgroundColor: color }]}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
    </View>
));

interface Props {
    memberCount: number;
    avgHandicap: string;
    upcomingCount: number;
}

const GroupStats = memo(({ memberCount, avgHandicap, upcomingCount }: Props) => (
    <View style={styles.container}>
        <StatBox value={memberCount} label="Members" color="#E3F2FD" />
        <StatBox value={avgHandicap} label="Avg Handicap" color="#E8F5E9" />
        <StatBox value={upcomingCount} label="Upcoming" color="#F3E5F5" />
    </View>
));

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    box: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    value: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 4,
    },
    label: {
        fontSize: 12,
        color: COLORS.textSub,
        fontWeight: "500",
    },
});

export default GroupStats;
