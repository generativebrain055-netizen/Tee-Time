import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/colors";

interface Props {
    homeCourse?: string;
}

const HomeCourseCard = memo(({ homeCourse }: Props) => {
    if (!homeCourse) return null;

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Home course</Text>
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={styles.icon}>
                        <Text style={styles.iconText}>⛳</Text>
                    </View>
                    <Text style={styles.text}>{homeCourse}</Text>
                </View>
            </View>
        </View>
    );
});

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
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    icon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#D1FAE5",
        justifyContent: "center",
        alignItems: "center",
    },
    iconText: {
        fontSize: 18,
    },
    text: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textMain,
    },
});

export default HomeCourseCard;
