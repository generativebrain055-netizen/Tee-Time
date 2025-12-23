import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/colors";

interface StatBoxProps {
    value: string | number;
    label: string;
    color: string;
}

export const StatBox = memo(({ value, label, color }: StatBoxProps) => (
    <View style={[styles.statBox, { backgroundColor: color }]}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
));

interface ProfileStatsProps {
    roundsPlayed: number;
    coursesPlayed: number;
    socialScore: string;
}

const ProfileStats = memo(({ roundsPlayed, coursesPlayed, socialScore }: ProfileStatsProps) => (
    <View style={styles.statsRow}>
        <StatBox value={roundsPlayed} label="Rounds" color="#E3F2FD" />
        <StatBox value={coursesPlayed} label="Courses" color="#E8F5E9" />
        <StatBox value={socialScore} label="Social Score" color="#F3E5F5" />
    </View>
));

const styles = StyleSheet.create({
    statsRow: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    statValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSub,
        fontWeight: "500",
    },
});

export default ProfileStats;
