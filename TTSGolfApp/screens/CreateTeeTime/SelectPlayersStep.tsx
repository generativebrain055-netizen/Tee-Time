import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
} from "react-native";
import { Check } from "lucide-react-native";
import { COLORS } from "./constants";
import { Friend } from "../../services/api";

interface SelectPlayersStepProps {
    friends: Friend[];
    selectedPlayers: string[];
    groupSize: number;
    onTogglePlayer: (id: string) => void;
}

export default function SelectPlayersStep({
    friends,
    selectedPlayers,
    groupSize,
    onTogglePlayer,
}: SelectPlayersStepProps) {
    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    return (
        <View style={styles.content}>
            <Text style={styles.stepTitle}>
                Select players ({selectedPlayers.length}/{groupSize - 1})
            </Text>
            <ScrollView style={styles.playerList} showsVerticalScrollIndicator={false}>
                {friends.map((friend) => {
                    const isSelected = selectedPlayers.includes(friend.id);
                    return (
                        <TouchableOpacity
                            key={friend.id}
                            style={[styles.playerItem, isSelected && styles.playerItemSelected]}
                            onPress={() => onTogglePlayer(friend.id)}
                        >
                            <View style={styles.avatarContainer}>
                                {friend.avatar ? (
                                    <Image source={{ uri: friend.avatar }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitials}>
                                            {getInitials(friend.firstName, friend.lastName)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.playerInfo}>
                                <Text style={styles.playerName}>
                                    {friend.firstName} {friend.lastName}
                                </Text>
                                <Text style={styles.playerSub}>
                                    {friend.handicap ? `HCP ${friend.handicap}` : friend.homeCourse || "Golf buddy"}
                                </Text>
                            </View>
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
                {friends.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>No friends yet</Text>
                        <Text style={styles.emptyText}>
                            Add friends from the Availability screen to invite them to tee times
                        </Text>
                    </View>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
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
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 20,
    },
    playerList: {
        flex: 1,
    },
    playerItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: "#F9FAFB",
    },
    playerItemSelected: {
        backgroundColor: "#DCFCE7",
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.white,
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
    },
    playerSub: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        paddingHorizontal: 20,
    },
});
