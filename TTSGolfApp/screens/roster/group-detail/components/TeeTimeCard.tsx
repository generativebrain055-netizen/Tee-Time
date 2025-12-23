import React, { memo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Calendar, MapPin, CheckCircle2 } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { TeeTime } from "../../../../services/api";
import { formatDate } from "../utils";

interface TeeTimeCardProps {
    teeTime: TeeTime;
}

export const TeeTimeCard = memo(({ teeTime }: TeeTimeCardProps) => (
    <View style={styles.teeTimeCard}>
        <View style={styles.teeTimeRow}>
            <Calendar size={18} color={COLORS.textSub} />
            <View style={styles.teeTimeInfo}>
                <Text style={styles.teeTimeTitle}>{formatDate(teeTime.teeDate)}</Text>
                <Text style={styles.teeTimeSub}>{teeTime.teeTime}</Text>
            </View>
        </View>
        <View style={styles.teeTimeRow}>
            <MapPin size={18} color={COLORS.textSub} />
            <View style={styles.teeTimeInfo}>
                <Text style={styles.teeTimeTitle}>{teeTime.courseName}</Text>
                {teeTime.courseLocation && (
                    <Text style={styles.teeTimeSub}>{teeTime.courseLocation}</Text>
                )}
            </View>
        </View>
        <View style={styles.attendees}>
            <View style={styles.avatarStack}>
                {(teeTime.participants || []).slice(0, 4).map((p, idx) => (
                    <View key={p.id} style={[styles.stackedAvatar, { marginLeft: idx > 0 ? -8 : 0 }]}>
                        {p.avatar ? (
                            <Image source={{ uri: p.avatar }} style={styles.smallAvatar} />
                        ) : (
                            <View style={[styles.smallAvatar, styles.smallAvatarPlaceholder]}>
                                <Text style={styles.smallAvatarText}>
                                    {p.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </Text>
                            </View>
                        )}
                        <View style={styles.confirmedBadge}>
                            <CheckCircle2 size={8} color="white" />
                        </View>
                    </View>
                ))}
            </View>
            {teeTime.participantCount > 4 && (
                <Text style={styles.othersText}>+{teeTime.participantCount - 4} others</Text>
            )}
        </View>
    </View>
));

const styles = StyleSheet.create({
    teeTimeCard: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    teeTimeRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    teeTimeInfo: {
        flex: 1,
    },
    teeTimeTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    teeTimeSub: {
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 2,
    },
    attendees: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#F9FAFB",
    },
    avatarStack: {
        flexDirection: "row",
    },
    stackedAvatar: {
        position: "relative",
    },
    smallAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: COLORS.white,
        backgroundColor: COLORS.divider,
    },
    smallAvatarPlaceholder: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#E5E7EB",
    },
    smallAvatarText: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    confirmedBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#10B981",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.white,
        width: 12,
        height: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    othersText: {
        fontSize: 12,
        color: COLORS.textSub,
        marginLeft: 8,
    },
});
