import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";

interface Props {
    fullName: string;
    username?: string;
    location?: string;
    handicap?: number | string | null;
}

const ProfileInfo = memo(({ fullName, username, location, handicap }: Props) => (
    <View style={styles.container}>
        <Text style={styles.name}>{fullName}</Text>
        {username && <Text style={styles.username}>@{username}</Text>}
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
    container: {
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    name: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 4,
    },
    username: {
        fontSize: 15,
        color: COLORS.textSub,
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
