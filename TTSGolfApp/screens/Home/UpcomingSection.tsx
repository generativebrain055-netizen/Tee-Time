import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Clock, MapPin, Users, Calendar as CalendarIcon } from "lucide-react-native";
import { COLORS } from "./constants";
import { TeeTime } from "../../services/api";

interface UpcomingSectionProps {
    teeTimes: TeeTime[];
}

const formatTeeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
    });
};

export default function UpcomingSection({ teeTimes }: UpcomingSectionProps) {
    return (
        <View style={styles.upcomingContainer}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Tee Times</Text>
                <Text style={styles.sectionSubtitle}>{teeTimes.length} rounds</Text>
            </View>

            {teeTimes.length > 0 ? (
                teeTimes.slice(0, 3).map((teeTime) => (
                    <View key={teeTime.id} style={styles.teeTimeCard}>
                        <View style={styles.cardRow}>
                            <Text style={styles.cardDate}>{formatTeeDate(teeTime.teeDate)}</Text>
                            <View style={[styles.statusBadge, teeTime.status === "confirmed" && styles.statusConfirmed]}>
                                <Text style={styles.statusText}>
                                    {teeTime.status === "confirmed" ? "✓ Confirmed" : "⏱ Pending"}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.cardDetailRow}>
                            <Clock size={16} color={COLORS.textSecondary} />
                            <Text style={styles.cardDetailText}>{teeTime.teeTime}</Text>
                        </View>
                        <View style={styles.cardDetailRow}>
                            <MapPin size={16} color={COLORS.textSecondary} />
                            <View>
                                <Text style={styles.cardDetailTextMain}>{teeTime.courseName}</Text>
                                {teeTime.courseLocation && (
                                    <Text style={styles.cardDetailTextSub}>{teeTime.courseLocation}</Text>
                                )}
                            </View>
                        </View>
                        <View style={styles.cardDetailRow}>
                            <Users size={16} color={COLORS.textSecondary} />
                            <Text style={styles.cardDetailText}>
                                {teeTime.participantCount}/{teeTime.maxPlayers} players
                            </Text>
                        </View>
                    </View>
                ))
            ) : (
                <View style={styles.emptyCard}>
                    <CalendarIcon size={32} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>No upcoming tee times</Text>
                    <Text style={styles.emptySubtext}>Tap + to create one!</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    upcomingContainer: { paddingHorizontal: 20, marginTop: 25 },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 15,
    },
    sectionTitle: { fontSize: 20, fontWeight: "bold", color: COLORS.text },
    sectionSubtitle: { fontSize: 14, color: COLORS.textSecondary },
    teeTimeCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    cardDate: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
    statusBadge: {
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusConfirmed: { backgroundColor: COLORS.confirmedBg },
    statusText: { color: COLORS.confirmedText, fontWeight: "600", fontSize: 12 },
    emptyCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 30,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyText: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginTop: 12 },
    emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
    cardDetailRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
    cardDetailText: { marginLeft: 10, color: COLORS.text, fontSize: 15 },
    cardDetailTextMain: { marginLeft: 10, color: COLORS.text, fontWeight: "600", fontSize: 15 },
    cardDetailTextSub: { marginLeft: 10, color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
});
