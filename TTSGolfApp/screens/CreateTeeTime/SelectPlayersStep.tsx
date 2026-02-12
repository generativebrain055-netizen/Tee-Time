import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    StyleSheet,
} from "react-native";
import { Check, Search } from "lucide-react-native";
import { COLORS, FIGMA_YOUR_PLAYERS } from "./constants";
import { Friend } from "../../services/api";

interface SelectPlayersStepProps {
    friends: Friend[];
    selectedPlayers: string[];
    groupSize: number;
    onTogglePlayer: (id: string) => void;
}

/** Figma 1269-3055, 1269-3123, 1269-3370: Your players list with optional search */
export default function SelectPlayersStep({
    friends,
    selectedPlayers,
    groupSize,
    onTogglePlayer,
}: SelectPlayersStepProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const getInitials = (firstName: string, lastName: string): string =>
        `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

    const filteredFriends = useMemo(() => {
        if (!searchQuery.trim()) return friends;
        const q = searchQuery.trim().toLowerCase();
        return friends.filter(
            (f) =>
                `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) ||
                (f.username || "").toLowerCase().includes(q)
        );
    }, [friends, searchQuery]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{FIGMA_YOUR_PLAYERS.title}</Text>
            <View style={styles.searchWrap}>
                <Search size={18} color="#9CA3AF" strokeWidth={2} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={FIGMA_YOUR_PLAYERS.searchPlaceholder}
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {filteredFriends.map((friend) => {
                    const isSelected = selectedPlayers.includes(friend.id);
                    return (
                        <TouchableOpacity
                            key={friend.id}
                            style={[styles.row, isSelected && styles.rowSelected]}
                            onPress={() => onTogglePlayer(friend.id)}
                            activeOpacity={0.7}
                        >
                            {friend.avatar ? (
                                <Image source={{ uri: friend.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarInitials}>
                                        {getInitials(friend.firstName, friend.lastName)}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.nameBlock}>
                                <Text style={styles.name}>
                                    {friend.firstName} {friend.lastName}
                                </Text>
                            </View>
                            <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                                {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
                {friends.length === 0 && (
                    <View style={styles.empty}>
                        <Text style={styles.emptyTitle}>No friends yet</Text>
                        <Text style={styles.emptySub}>
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
    container: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
    title: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 15,
        color: FIGMA_YOUR_PLAYERS.nameColor,
        marginBottom: 12,
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderRadius: FIGMA_YOUR_PLAYERS.inputBorderRadius,
        borderWidth: 1,
        borderColor: FIGMA_YOUR_PLAYERS.inputBorderColor,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontFamily: "Inter_400Regular",
        fontSize: 16,
        color: "#111827",
        padding: 0,
    },
    scroll: { flex: 1 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: FIGMA_YOUR_PLAYERS.rowPaddingVertical,
        paddingHorizontal: FIGMA_YOUR_PLAYERS.rowPaddingHorizontal,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    rowSelected: { backgroundColor: "#F0FDF4" },
    avatar: {
        width: FIGMA_YOUR_PLAYERS.avatarSize,
        height: FIGMA_YOUR_PLAYERS.avatarSize,
        borderRadius: FIGMA_YOUR_PLAYERS.avatarSize / 2,
        marginRight: 12,
    },
    avatarPlaceholder: {
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 15,
        color: "#FFFFFF",
    },
    nameBlock: { flex: 1 },
    name: {
        fontFamily: "Inter_500Medium",
        fontSize: FIGMA_YOUR_PLAYERS.nameFontSize,
        color: FIGMA_YOUR_PLAYERS.nameColor,
    },
    checkCircle: {
        width: FIGMA_YOUR_PLAYERS.checkSize,
        height: FIGMA_YOUR_PLAYERS.checkSize,
        borderRadius: FIGMA_YOUR_PLAYERS.checkSize / 2,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        justifyContent: "center",
        alignItems: "center",
    },
    checkCircleSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    empty: { alignItems: "center", paddingVertical: 40 },
    emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#1F2937", marginBottom: 8 },
    emptySub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#9CA3AF", textAlign: "center", paddingHorizontal: 20 },
});
