import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";
import { TeeTime } from "../../../services/api";

interface RecentRoundCardProps {
    teeTime: TeeTime;
}

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getInitials = (name: string): string => {
    return name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "??";
};

export const RecentRoundCard = memo(({ teeTime }: RecentRoundCardProps) => (
    <View style={styles.roundCard}>
        <View style={styles.roundCardImage}>
            <Text style={styles.roundCardInitials}>{getInitials(teeTime.courseName)}</Text>
        </View>
        <View style={styles.roundCardInfo}>
            <Text style={styles.roundCardTitle} numberOfLines={1}>{teeTime.courseName}</Text>
            <Text style={styles.roundCardDate}>{formatDate(teeTime.teeDate)}</Text>
        </View>
        <ChevronRight size={20} color={COLORS.textSub} />
    </View>
));

interface RecentRoundsProps {
    rounds: TeeTime[];
    onSeeAll?: () => void;
}

const RecentRounds = memo(({ rounds, onSeeAll }: RecentRoundsProps) => (
    <View style={styles.section}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent rounds</Text>
            {onSeeAll && (
                <TouchableOpacity onPress={onSeeAll}>
                    <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
            )}
        </View>
        {rounds.length > 0 ? (
            rounds.map((round) => <RecentRoundCard key={round.id} teeTime={round} />)
        ) : (
            <View style={styles.emptyRounds}>
                <Text style={styles.emptyText}>No recent rounds</Text>
                <Text style={styles.emptySubtext}>Your completed rounds will appear here</Text>
            </View>
        )}
    </View>
));

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.primary,
    },
    roundCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    roundCardImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: COLORS.primaryLight,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    roundCardInitials: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.primary,
    },
    roundCardInfo: {
        flex: 1,
    },
    roundCardTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
        marginBottom: 2,
    },
    roundCardDate: {
        fontSize: 13,
        color: COLORS.textSub,
    },
    emptyRounds: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
    },
    emptySubtext: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 4,
    },
});

export default RecentRounds;
