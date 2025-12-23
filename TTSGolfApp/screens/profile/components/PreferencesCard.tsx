import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/colors";

interface PreferenceRowProps {
    label: string;
    value: string;
}

export const PreferenceRow = memo(({ label, value }: PreferenceRowProps) => (
    <View style={styles.preferenceRow}>
        <Text style={styles.preferenceLabel}>{label}</Text>
        <Text style={styles.preferenceValue}>{value}</Text>
    </View>
));

interface PreferencesCardProps {
    teeTimePreference: string;
    walkOrRide: string;
    groupSize: string;
}

const PreferencesCard = memo(({ teeTimePreference, walkOrRide, groupSize }: PreferencesCardProps) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>Playing preferences</Text>
        <View style={styles.preferencesCard}>
            <PreferenceRow label="TEE TIME PREFERENCE" value={teeTimePreference} />
            <View style={styles.divider} />
            <PreferenceRow label="RIDE OR WALK" value={walkOrRide} />
            <View style={styles.divider} />
            <PreferenceRow label="GROUP SIZE" value={groupSize} />
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
    preferencesCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
    },
    preferenceRow: {
        paddingVertical: 8,
    },
    preferenceLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: COLORS.textSub,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    preferenceValue: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textMain,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.divider,
        marginVertical: 8,
    },
});

export default PreferencesCard;
