import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/colors";

interface PreferenceRowProps {
    label: string;
    value: string;
}

const PreferenceRow = memo(({ label, value }: PreferenceRowProps) => (
    <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
    </View>
));

interface Props {
    teeTimePreference: string;
    walkOrRide: string;
}

const PreferencesCard = memo(({ teeTimePreference, walkOrRide }: Props) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>Playing preferences</Text>
        <View style={styles.card}>
            <PreferenceRow label="TEE TIME PREFERENCE" value={teeTimePreference} />
            <View style={styles.divider} />
            <PreferenceRow label="RIDE OR WALK" value={walkOrRide} />
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
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
    },
    row: {
        paddingVertical: 8,
    },
    label: {
        fontSize: 11,
        fontWeight: "600",
        color: COLORS.textSub,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    value: {
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
