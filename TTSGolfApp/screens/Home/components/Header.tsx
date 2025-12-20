import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import { COLORS } from "../constants";

interface HeaderProps {
    onNotificationPress: () => void;
}

export default function Header({ onNotificationPress }: HeaderProps) {
    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.logoMain}>TEE TIME</Text>
                <Text style={styles.logoSub}>Social</Text>
            </View>
            <TouchableOpacity style={styles.bellButton} onPress={onNotificationPress}>
                <Bell size={24} color={COLORS.text} strokeWidth={1.5} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    logoMain: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.text,
        letterSpacing: 1,
    },
    logoSub: {
        fontSize: 18,
        fontWeight: "500",
        fontStyle: "italic",
        color: COLORS.primary,
        marginTop: -4,
    },
    bellButton: {
        padding: 8,
    },
});
