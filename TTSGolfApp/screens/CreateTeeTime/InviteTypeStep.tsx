import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from "./constants";

type InviteType = "roster" | "fcfs" | "open";

interface InviteTypeStepProps {
    inviteType: InviteType;
    onSelectType: (type: InviteType) => void;
}

const OPTIONS = [
    { type: "roster" as const, title: "From Roster", desc: "Select specific players" },
    { type: "fcfs" as const, title: "First Come First Serve", desc: "First to respond gets spot" },
    { type: "open" as const, title: "Open Invite", desc: "Anyone can join" },
];

export default function InviteTypeStep({ inviteType, onSelectType }: InviteTypeStepProps) {
    return (
        <View style={styles.content}>
            <Text style={styles.stepTitle}>How do you want to invite?</Text>
            {OPTIONS.map((opt) => (
                <TouchableOpacity
                    key={opt.type}
                    style={[styles.typeOption, inviteType === opt.type && styles.typeOptionSelected]}
                    onPress={() => onSelectType(opt.type)}
                >
                    <View style={styles.typeOptionContent}>
                        <Text style={styles.typeOptionTitle}>{opt.title}</Text>
                        <Text style={styles.typeOptionDesc}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radio, inviteType === opt.type && styles.radioSelected]} />
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
    stepTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 20 },
    typeOption: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        marginBottom: 12,
    },
    typeOptionSelected: { borderColor: COLORS.primary, borderWidth: 2 },
    typeOptionContent: { flex: 1 },
    typeOptionTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
    typeOptionDesc: { fontSize: 13, color: COLORS.textSub, marginTop: 2 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border },
    radioSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
});
