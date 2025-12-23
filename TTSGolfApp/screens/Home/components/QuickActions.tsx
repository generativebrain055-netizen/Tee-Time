import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CalendarPlus, UserPlus, Search, QrCode } from "lucide-react-native";
import { COLORS } from "../constants";

interface QuickActionsProps {
    onCreateTeeTime: () => void;
    onInvitePlayers: () => void;
    onFindAvailability: () => void;
    onScanQR: () => void;
}

function QuickActions({
    onCreateTeeTime,
    onInvitePlayers,
    onFindAvailability,
    onScanQR,
}: QuickActionsProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Quick actions</Text>
            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionCard} onPress={onCreateTeeTime}>
                    <View style={styles.iconContainer}>
                        <CalendarPlus size={24} color={COLORS.primary} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.actionLabel}>Create</Text>
                    <Text style={styles.actionLabel}>tee time</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={onInvitePlayers}>
                    <View style={styles.iconContainer}>
                        <UserPlus size={24} color={COLORS.primary} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.actionLabel}>Invite</Text>
                    <Text style={styles.actionLabel}>Players</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={onScanQR}>
                    <View style={styles.iconContainer}>
                        <QrCode size={24} color={COLORS.primary} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.actionLabel}>Scan</Text>
                    <Text style={styles.actionLabel}>QR Code</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={onFindAvailability}>
                    <View style={styles.iconContainer}>
                        <Search size={24} color={COLORS.primary} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.actionLabel}>Find</Text>
                    <Text style={styles.actionLabel}>availability</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.cardBg,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 16,
    },
    actionsRow: {
        flexDirection: "row",
        gap: 12,
    },
    actionCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    iconContainer: {
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: "500",
        color: COLORS.text,
        textAlign: "center",
        lineHeight: 14,
    },
});

export default memo(QuickActions);
