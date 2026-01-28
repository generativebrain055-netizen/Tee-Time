import React, { memo } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../../../../constants/colors";

interface ActionButtonProps {
    icon: any;
    label: string;
    onPress: () => void;
}

export const ActionButton = memo(({ icon: Icon, label, onPress }: ActionButtonProps) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
        <Icon size={20} color={COLORS.textMain} />
        <Text style={styles.actionButtonText}>{label}</Text>
    </TouchableOpacity>
));

const styles = StyleSheet.create({
    actionButton: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.secondary,
        borderRadius: 12,
        width: 96,
        height: 80,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textSub,
        textAlign: "center",
        paddingHorizontal: 4,
    },
});
