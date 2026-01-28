import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Calendar, ChevronRight } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { TeeTime } from "../../../../services/api";
import { formatTeeTimeDate } from "../utils";

interface TeeTimeCardProps {
    teeTime: TeeTime;
}

const TeeTimeCard = memo(({ teeTime }: TeeTimeCardProps) => (
    <View style={styles.card}>
        <View style={styles.icon}>
            <Calendar size={20} color={COLORS.primary} />
        </View>
        <View style={styles.info}>
            <Text style={styles.title}>{teeTime.courseName}</Text>
            <Text style={styles.date}>{formatTeeTimeDate(teeTime.teeDate)} • {teeTime.teeTime}</Text>
        </View>
        <ChevronRight size={20} color={COLORS.textSub} />
    </View>
));

interface Props {
    teeTimes: TeeTime[];
    onAddTeeTime: () => void;
}

const TeeTimesList = memo(({ teeTimes, onAddTeeTime }: Props) => (
    <View style={styles.section}>
        <View style={styles.header}>
            <Text style={styles.sectionTitle}>Upcoming tee times</Text>
            <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
        </View>

        {teeTimes.length > 0 ? (
            teeTimes.map((teeTime) => (
                <TeeTimeCard key={teeTime.id} teeTime={teeTime} />
            ))
        ) : (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>No upcoming tee times</Text>
                <TouchableOpacity style={styles.createButton} onPress={onAddTeeTime}>
                    <Text style={styles.createButtonText}>Create one now</Text>
                </TouchableOpacity>
            </View>
        )}
    </View>
));

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    header: {
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
    seeAll: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.primary,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    icon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryLight,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
        marginBottom: 2,
    },
    date: {
        fontSize: 13,
        color: COLORS.textSub,
    },
    empty: {
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
    createButton: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    createButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
    },
});

export default TeeTimesList;
