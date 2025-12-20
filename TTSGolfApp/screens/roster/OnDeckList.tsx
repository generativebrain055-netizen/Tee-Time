import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Calendar, MessageCircle, Star } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { rosterApi, RosterContact } from "../../services/api";

interface OnDeckListProps {
    navigation: any;
}

export default function OnDeckList({ navigation }: OnDeckListProps) {
    const [onDeck, setOnDeck] = useState<RosterContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadOnDeck = useCallback(async () => {
        try {
            const response = await rosterApi.getOnDeck();
            if (response.success) {
                setOnDeck(response.onDeck);
            }
        } catch (error) {
            console.error("Failed to load on-deck:", error);
            setOnDeck([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadOnDeck();
    }, [loadOnDeck]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadOnDeck();
    }, [loadOnDeck]);

    const handleMoveToRoster = async (item: RosterContact) => {
        try {
            await rosterApi.moveMember(item.id, { isOnDeck: false });
            setOnDeck((prev) => prev.filter((r) => r.id !== item.id));
            Alert.alert("Success", "Moved to roster");
        } catch (error) {
            Alert.alert("Error", "Failed to move to roster");
        }
    };

    const getInitials = (name: string): string => {
        const parts = name.split(" ");
        return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={COLORS.primary}
                />
            }
        >
            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                    Reserve players that can be manually selected if your roster fails to fill a tee time
                </Text>
            </View>

            {onDeck.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Star size={48} color={COLORS.textSub} strokeWidth={1} />
                    <Text style={styles.emptyTitle}>No players on deck</Text>
                    <Text style={styles.emptySubtext}>
                        Move players here as backup options for tee times
                    </Text>
                </View>
            ) : (
                onDeck.map((item, index) => (
                    <View key={item.id} style={styles.rosterItem}>
                        <Text style={styles.rankNumber}>{index + 1}</Text>

                        <View style={styles.avatarContainer}>
                            {item.contact.avatar ? (
                                <Image source={{ uri: item.contact.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>
                                        {getInitials(item.contact.name)}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.infoContainer}>
                            <Text style={styles.name}>{item.contact.name}</Text>
                            <Text style={styles.subText}>
                                {item.contact.handicap ? `HCP ${item.contact.handicap}` : "On Deck"}
                            </Text>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.starButton}
                                onPress={() => handleMoveToRoster(item)}
                            >
                                <Star size={18} color="#F59E0B" fill="#F59E0B" strokeWidth={1.5} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Calendar size={18} color={COLORS.primary} strokeWidth={1.5} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <MessageCircle size={18} color={COLORS.primary} strokeWidth={1.5} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    infoBanner: {
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 8,
    },
    infoText: {
        fontSize: 13,
        color: "#92400E",
        lineHeight: 18,
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textMain,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
    },
    rosterItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    rankNumber: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textMain,
        width: 24,
    },
    avatarContainer: {
        marginLeft: 8,
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
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    subText: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    actions: {
        flexDirection: "row",
        gap: 8,
    },
    starButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#FEF3C7",
        justifyContent: "center",
        alignItems: "center",
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#E8F5E9",
        justifyContent: "center",
        alignItems: "center",
    },
});
