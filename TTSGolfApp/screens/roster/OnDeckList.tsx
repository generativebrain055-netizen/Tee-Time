import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    RefreshControl,
    Alert,
} from "react-native";
import { Star, X, MessageSquare, Calendar } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { rosterApi, RosterContact } from "../../services/api";

export default function OnDeckList() {
    const [onDeck, setOnDeck] = useState<RosterContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadOnDeck();
    }, []);

    const loadOnDeck = async () => {
        try {
            const response = await rosterApi.getOnDeck();
            if (response.success) {
                setOnDeck(response.onDeck);
            }
        } catch (error) {
            console.error("Failed to load on-deck:", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadOnDeck();
        setRefreshing(false);
    }, []);

    const handleRemoveFromOnDeck = async (rosterId: string) => {
        Alert.alert(
            "Remove from On Deck",
            "Are you sure you want to remove this player from On Deck?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await rosterApi.toggleOnDeck(rosterId, false);
                            setOnDeck((prev) => prev.filter((r) => r.id !== rosterId));
                        } catch (error) {
                            Alert.alert("Error", "Failed to remove from on-deck");
                        }
                    },
                },
            ]
        );
    };

    const OnDeckItem = ({ item }: { item: RosterContact }) => (
        <View style={styles.item}>
            <View style={styles.itemLeft}>
                <View style={styles.avatarContainer}>
                    {item.contact.avatar ? (
                        <Image source={{ uri: item.contact.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>{item.contact.name?.charAt(0) || "?"}</Text>
                        </View>
                    )}
                    <View style={styles.starBadge}>
                        <Star size={10} color="#F59E0B" fill="#F59E0B" />
                    </View>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.contact.name}</Text>
                    <Text style={styles.sub}>
                        {item.contact.handicap ? `Handicap: ${item.contact.handicap}` : item.contact.phone}
                    </Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtnGreen}>
                    <Calendar size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnBlue}>
                    <MessageSquare size={18} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionBtnRed}
                    onPress={() => handleRemoveFromOnDeck(item.id)}
                >
                    <X size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Star size={20} color="#F59E0B" fill="#F59E0B" />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>On Deck Players</Text>
                    <Text style={styles.headerSubtitle}>
                        These players are your backup list for tee times
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {onDeck.map((item) => (
                    <OnDeckItem key={item.id} item={item} />
                ))}

                {onDeck.length === 0 && !loading && (
                    <View style={styles.emptyState}>
                        <Star size={48} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No On Deck Players</Text>
                        <Text style={styles.emptyText}>
                            Mark players as "On Deck" from your roster to add them here.
                            They'll be your go-to backups when spots open up.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {onDeck.length > 0 && (
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        💡 On Deck players are automatically invited when someone declines
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#FFFBEB",
        borderBottomWidth: 1,
        borderBottomColor: "#FEF3C7",
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FEF3C7",
        justifyContent: "center",
        alignItems: "center",
    },
    headerText: { marginLeft: 12, flex: 1 },
    headerTitle: { fontSize: 16, fontWeight: "bold", color: "#92400E" },
    headerSubtitle: { fontSize: 13, color: "#B45309", marginTop: 2 },
    list: { flex: 1, paddingHorizontal: 16 },
    item: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    itemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    avatarContainer: { position: "relative" },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E5E7EB" },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitial: { fontSize: 18, fontWeight: "bold", color: COLORS.white },
    starBadge: {
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#FEF3C7",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    info: { marginLeft: 12, flex: 1 },
    name: { fontSize: 15, fontWeight: "600", color: COLORS.textMain },
    sub: { fontSize: 13, color: COLORS.textSub, marginTop: 2 },
    actions: { flexDirection: "row", gap: 6 },
    actionBtnGreen: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#E8F5E9",
        justifyContent: "center",
        alignItems: "center",
    },
    actionBtnBlue: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#E3F2FD",
        justifyContent: "center",
        alignItems: "center",
    },
    actionBtnRed: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.textMain, marginTop: 16 },
    emptyText: { fontSize: 14, color: COLORS.textSub, textAlign: "center", marginTop: 8, lineHeight: 20 },
    footer: {
        padding: 16,
        backgroundColor: "#F0FDF4",
        borderTopWidth: 1,
        borderTopColor: "#D1FAE5",
    },
    footerText: { fontSize: 13, color: "#166534", textAlign: "center" },
});
