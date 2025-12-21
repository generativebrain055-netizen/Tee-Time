import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Clock, Zap, List } from "lucide-react-native";
import { COLORS } from "./constants";

export type InviteType = "roster" | "fcfs" | "manual";

interface InviteTypeStepProps {
    inviteType: InviteType;
    onSelectType: (type: InviteType) => void;
}

const OPTIONS = [
    {
        type: "roster" as const,
        title: "Roster Invite",
        desc: "Players are invited one by one in roster order until all spots are filled.",
        icon: Clock,
        iconBg: "#E0F2FE",
        iconColor: "#0284C7",
    },
    {
        type: "fcfs" as const,
        title: "First Come First Serve",
        desc: "Broadcast the invite to your roster or a group; the first to accept get the spots.",
        icon: Zap,
        iconBg: "#FEF3C7",
        iconColor: "#F59E0B",
    },
    {
        type: "manual" as const,
        title: "Manual Invite",
        desc: "Manually select invitees from your roster, on-deck list, or groups.",
        icon: List,
        iconBg: "#F3E8FF",
        iconColor: "#9333EA",
    },
];

export default function InviteTypeStep({ inviteType, onSelectType }: InviteTypeStepProps) {
    return (
        <View style={styles.content}>
            <Text style={styles.stepTitle}>Select Invite Type</Text>
            {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = inviteType === opt.type;
                return (
                    <TouchableOpacity
                        key={opt.type}
                        style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                        onPress={() => onSelectType(opt.type)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: opt.iconBg }]}>
                            <Icon size={20} color={opt.iconColor} />
                        </View>
                        <View style={styles.typeOptionContent}>
                            <Text style={styles.typeOptionTitle}>{opt.title}</Text>
                            <Text style={styles.typeOptionDesc}>{opt.desc}</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 20,
        textAlign: "center",
    },
    typeOption: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        marginBottom: 12,
        backgroundColor: COLORS.white,
    },
    typeOptionSelected: {
        borderColor: COLORS.primary,
        borderWidth: 2,
        backgroundColor: "#F0FDF4",
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    typeOptionContent: {
        flex: 1,
    },
    typeOptionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 4,
    },
    typeOptionDesc: {
        fontSize: 13,
        color: COLORS.textSub,
        lineHeight: 18,
    },
});
