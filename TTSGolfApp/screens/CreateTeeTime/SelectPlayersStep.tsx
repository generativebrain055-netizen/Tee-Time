import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { COLORS } from "./constants";
import { RosterContact } from "../../services/api";

interface SelectPlayersStepProps {
    roster: RosterContact[];
    selectedPlayers: string[];
    groupSize: number;
    onTogglePlayer: (id: string) => void;
}

export default function SelectPlayersStep({
    roster,
    selectedPlayers,
    groupSize,
    onTogglePlayer,
}: SelectPlayersStepProps) {
    return (
        <View style={styles.content}>
            <Text style={styles.stepTitle}>
                Select players ({selectedPlayers.length}/{groupSize - 1})
            </Text>
            <ScrollView style={styles.playerList}>
                {roster.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.playerItem, selectedPlayers.includes(item.id) && styles.playerItemSelected]}
                        onPress={() => onTogglePlayer(item.id)}
                    >
                        <View style={styles.playerAvatar}>
                            <Text style={styles.playerInitial}>{item.contact.name?.charAt(0) || "?"}</Text>
                        </View>
                        <View style={styles.playerInfo}>
                            <Text style={styles.playerName}>{item.contact.name}</Text>
                            <Text style={styles.playerSub}>
                                {item.contact.phone || `Handicap: ${item.contact.handicap}`}
                            </Text>
                        </View>
                        <View style={[styles.checkbox, selectedPlayers.includes(item.id) && styles.checkboxSelected]}>
                            {selectedPlayers.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                    </TouchableOpacity>
                ))}
                {roster.length === 0 && (
                    <Text style={styles.emptyText}>No contacts in roster</Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
    stepTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 20 },
    playerList: { flex: 1 },
    playerItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: "#F9FAFB",
    },
    playerItemSelected: { backgroundColor: "#DCFCE7" },
    playerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    playerInitial: { fontSize: 18, fontWeight: "bold", color: COLORS.white },
    playerInfo: { flex: 1, marginLeft: 12 },
    playerName: { fontSize: 15, fontWeight: "600", color: COLORS.text },
    playerSub: { fontSize: 13, color: COLORS.textSub, marginTop: 2 },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    checkmark: { color: COLORS.white, fontSize: 14, fontWeight: "bold" },
    emptyText: { textAlign: "center", color: COLORS.textSub, marginTop: 40 },
});
