import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { CALENDAR_COLORS } from "../constants";

interface CalendarHeaderProps {
    onBack: () => void;
}

const CalendarHeader = memo(({ onBack }: CalendarHeaderProps) => (
    <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ArrowLeft size={24} color={CALENDAR_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={styles.spacer} />
    </View>
));

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
        backgroundColor: CALENDAR_COLORS.white,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: CALENDAR_COLORS.text,
    },
    spacer: {
        width: 40,
    },
});

export default CalendarHeader;
