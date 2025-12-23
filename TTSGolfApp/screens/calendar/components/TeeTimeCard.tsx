import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Clock, MapPin, Users } from "lucide-react-native";
import { TeeTime } from "../types";
import { CALENDAR_COLORS } from "../constants";

interface TeeTimeCardProps {
    teeTime: TeeTime;
}

const TeeTimeCard = memo(({ teeTime }: TeeTimeCardProps) => {
    const isConfirmed = teeTime.status === "confirmed";

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.timeRow}>
                    <Clock size={16} color={CALENDAR_COLORS.textSecondary} />
                    <Text style={styles.timeText}>{teeTime.time}</Text>
                </View>
                <View style={[styles.badge, isConfirmed ? styles.confirmedBadge : styles.pendingBadge]}>
                    <Text style={[styles.badgeText, isConfirmed ? styles.confirmedText : styles.pendingText]}>
                        {isConfirmed ? "✓ Confirmed" : "⏱ Pending"}
                    </Text>
                </View>
            </View>

            <View style={styles.locationRow}>
                <MapPin size={16} color={CALENDAR_COLORS.textSecondary} />
                <View style={styles.locationText}>
                    <Text style={styles.courseName}>{teeTime.course}</Text>
                    <Text style={styles.address}>{teeTime.location}</Text>
                </View>
            </View>

            <View style={styles.playersRow}>
                <Users size={16} color={CALENDAR_COLORS.textSecondary} />
                <Text style={styles.playersText}>{teeTime.players} players</Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: CALENDAR_COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    timeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    timeText: {
        fontSize: 16,
        fontWeight: "600",
        color: CALENDAR_COLORS.text,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    confirmedBadge: {
        backgroundColor: CALENDAR_COLORS.confirmedBg,
    },
    pendingBadge: {
        backgroundColor: CALENDAR_COLORS.pendingBg,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
    },
    confirmedText: {
        color: CALENDAR_COLORS.confirmedText,
    },
    pendingText: {
        color: CALENDAR_COLORS.pendingText,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 12,
    },
    locationText: {
        flex: 1,
    },
    courseName: {
        fontSize: 15,
        fontWeight: "600",
        color: CALENDAR_COLORS.text,
    },
    address: {
        fontSize: 13,
        color: CALENDAR_COLORS.textSecondary,
        marginTop: 2,
    },
    playersRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    playersText: {
        fontSize: 14,
        color: CALENDAR_COLORS.textSecondary,
    },
});

export default TeeTimeCard;
