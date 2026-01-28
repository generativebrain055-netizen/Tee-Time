import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/colors";

interface MembershipCardProps {
    homeCourse?: string;
}

const MembershipCard = memo(({ homeCourse }: MembershipCardProps) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active memberships</Text>
        <View style={styles.membershipCard}>
            {homeCourse ? (
                <View style={styles.membershipRow}>
                    <View style={styles.membershipIcon}>
                        <Text style={styles.membershipIconText}>⛳</Text>
                    </View>
                    <Text style={styles.membershipText}>{homeCourse}</Text>
                </View>
            ) : (
                <Text style={styles.emptyText}>No active memberships</Text>
            )}
        </View>
    </View>
));

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 12,
    },
    membershipCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
    },
    membershipRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    membershipIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        justifyContent: "center",
        alignItems: "center",
    },
    membershipIconText: {
        fontSize: 18,
    },
    membershipText: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textMain,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
    },
});

export default MembershipCard;
