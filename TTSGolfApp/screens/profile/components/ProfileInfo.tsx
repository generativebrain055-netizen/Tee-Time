import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";

interface ProfileInfoProps {
    fullName: string;
    location?: string;
    handicap?: number | string;
}

const ProfileInfo = memo(({ fullName, location, handicap }: ProfileInfoProps) => (
    <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{fullName}</Text>
        {location && (
            <View style={styles.locationRow}>
                <MapPin size={14} color={COLORS.textSub} />
                <Text style={styles.locationText}>{location}</Text>
            </View>
        )}
        {handicap != null && (
            <Text style={styles.handicapText}>Handicap: {handicap}</Text>
        )}
    </View>
));

const styles = StyleSheet.create({
    profileInfo: {
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    profileName: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 4,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 4,
    },
    locationText: {
        fontSize: 14,
        color: COLORS.textSub,
    },
    handicapText: {
        fontSize: 14,
        color: COLORS.textSub,
        fontWeight: "500",
    },
});

export default ProfileInfo;
