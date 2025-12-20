import React, { memo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Clock, MapPin, Users, Check } from "lucide-react-native";
import { COLORS } from "../constants";
import { UpcomingTeeTime } from "../types";

interface NextTeeTimeProps {
    teeTime: UpcomingTeeTime | null;
    currentUserId?: string;
}

// Pure helper functions - outside component
const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
};

const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

const getDateSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
};

const formatDateWithSuffix = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}${getDateSuffix(day)}`;
};

const getInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const getShortName = (name: string): string => {
    const parts = name.split(" ");
    const firstName = parts[0] || "";
    const lastInitial = parts[1] ? parts[1][0] : "";
    const shortName = lastInitial ? `${firstName} ${lastInitial}` : firstName;
    return shortName.length > 6 ? `${shortName.substring(0, 5)}...` : shortName;
};

function NextTeeTime({ teeTime, currentUserId }: NextTeeTimeProps) {
    if (!teeTime) {
        return (
            <View style={styles.container}>
                <Text style={styles.sectionTitle}>Next tee time</Text>
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No upcoming tee times</Text>
                    <Text style={styles.emptySubtext}>Create one to get started!</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Next tee time ({formatDateWithSuffix(teeTime.teeDate)})</Text>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.dateText}>{formatDate(teeTime.teeDate)}</Text>
                    <View style={styles.statusBadge}>
                        <Check size={12} color={COLORS.confirmedText} strokeWidth={2.5} />
                        <Text style={styles.statusText}>
                            {teeTime.status.charAt(0).toUpperCase() + teeTime.status.slice(1)}
                        </Text>
                    </View>
                </View>

                <View style={styles.timeRow}>
                    <Clock size={16} color={COLORS.textSecondary} strokeWidth={1.5} />
                    <Text style={styles.timeText}>{formatTime(teeTime.teeTime)}</Text>
                </View>

                <View style={styles.locationRow}>
                    <MapPin size={16} color={COLORS.textSecondary} strokeWidth={1.5} />
                    <View style={styles.locationInfo}>
                        <Text style={styles.courseName}>{teeTime.courseName}</Text>
                        {teeTime.courseLocation && (
                            <Text style={styles.courseLocation}>{teeTime.courseLocation}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.participantsSection}>
                    <Users size={16} color={COLORS.textSecondary} strokeWidth={1.5} />
                    <View style={styles.participantsList}>
                        {teeTime.participants.map((p, index) => {
                            const isCurrentUser = p.userId === currentUserId;
                            return (
                                <View key={p.id || index} style={styles.participantItem}>
                                    <View style={styles.avatarContainer}>
                                        {p.avatar ? (
                                            <Image source={{ uri: p.avatar }} style={styles.avatar} />
                                        ) : (
                                            <View style={styles.avatarPlaceholder}>
                                                <Text style={styles.avatarInitials}>{getInitials(p.name)}</Text>
                                            </View>
                                        )}
                                        <View style={styles.checkBadge}>
                                            <Check size={8} color={COLORS.white} strokeWidth={3} />
                                        </View>
                                    </View>
                                    <Text style={styles.participantName}>
                                        {isCurrentUser ? "You" : getShortName(p.name)}
                                    </Text>
                                    {p.isCreator && !isCurrentUser && (
                                        <Text style={styles.hostLabel}>(host)</Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.white,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    dateText: {
        fontSize: 17,
        fontWeight: "600",
        color: COLORS.text,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.confirmedBg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.confirmedText,
    },
    timeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
    },
    timeText: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.text,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 16,
    },
    locationInfo: {
        flex: 1,
    },
    courseName: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
    },
    courseLocation: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    participantsSection: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    participantsList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        flex: 1,
    },
    participantItem: {
        alignItems: "center",
    },
    avatarContainer: {
        position: "relative",
        marginBottom: 4,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E5E5EA",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    checkBadge: {
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: COLORS.greenAccent,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    participantName: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.text,
        textAlign: "center",
    },
    hostLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginTop: -2,
    },
    emptyCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 32,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
});

export default memo(NextTeeTime);
