import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Users, Clock } from "lucide-react-native";
import { COLORS } from "../constants/colors";
import { Header } from "../components/common";
import { rosterApi, teeTimeApi } from "../services/api";

interface OnDeckPlayer {
    id: string;
    odId: string;
    odUserId: string | null;
    contact: {
        userId: string | null;
        name: string;
        phone: string | null;
        handicap: number | null;
        avatar: string | null;
        socialRate: number | null;
    };
}

interface SelectOnDeckScreenProps {
    navigation: any;
    route: {
        params: {
            teeTimeId: string;
            spotsRemaining: number;
            courseName?: string;
        };
    };
}

const PlayerItem = memo(({
    player,
    isSelected,
    onToggle,
    disabled
}: {
    player: OnDeckPlayer;
    isSelected: boolean;
    onToggle: () => void;
    disabled: boolean;
}) => {
    const name = player.contact.name || "Unknown";
    const initial = name.charAt(0).toUpperCase();

    return (
        <TouchableOpacity
            style={[
                styles.playerItem,
                isSelected && styles.playerItemSelected,
                disabled && !isSelected && styles.playerItemDisabled
            ]}
            onPress={onToggle}
            disabled={disabled && !isSelected}
            activeOpacity={0.7}
        >
            <View style={styles.playerAvatar}>
                {player.contact.avatar ? (
                    <Image source={{ uri: player.contact.avatar }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarInitial}>{initial}</Text>
                )}
            </View>
            <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{name}</Text>
                <View style={styles.playerMeta}>
                    {player.contact.handicap !== null && (
                        <Text style={styles.playerHandicap}>
                            HCP {player.contact.handicap}
                        </Text>
                    )}
                    {player.contact.socialRate !== null && (
                        <Text style={styles.playerSocialRate}>
                            SR {player.contact.socialRate}
                        </Text>
                    )}
                </View>
            </View>
            <View style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected
            ]}>
                {isSelected && <Check size={16} color={COLORS.white} />}
            </View>
        </TouchableOpacity>
    );
});

export default function SelectOnDeckScreen({ navigation, route }: SelectOnDeckScreenProps) {
    const insets = useSafeAreaInsets();
    const { teeTimeId, spotsRemaining, courseName } = route.params;

    const [onDeckPlayers, setOnDeckPlayers] = useState<OnDeckPlayer[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadOnDeckPlayers();
    }, []);

    const loadOnDeckPlayers = async () => {
        try {
            const response = await rosterApi.getOnDeck();
            if (response.success) {
                setOnDeckPlayers(response.onDeck);
            }
        } catch (error) {
            console.error("Error loading on-deck players:", error);
            Alert.alert("Error", "Failed to load On-Deck players");
        } finally {
            setLoading(false);
        }
    };

    const togglePlayer = useCallback((playerId: string) => {
        setSelectedIds(prev => {
            if (prev.includes(playerId)) {
                return prev.filter(id => id !== playerId);
            }
            if (prev.length < spotsRemaining) {
                return [...prev, playerId];
            }
            return prev;
        });
    }, [spotsRemaining]);

    const handleSendInvites = async () => {
        if (selectedIds.length === 0) {
            Alert.alert("Select Players", "Please select at least one On-Deck player to invite.");
            return;
        }

        setSubmitting(true);
        try {
            const response = await teeTimeApi.sendOnDeckInvites(teeTimeId, selectedIds);

            if (response.success) {
                Alert.alert(
                    "Invites Sent!",
                    `${selectedIds.length} On-Deck player${selectedIds.length > 1 ? 's have' : ' has'} been invited. First to respond will be added!`,
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            } else {
                throw new Error(response.message || "Failed to send invites");
            }
        } catch (error: any) {
            console.error("Error sending on-deck invites:", error);
            Alert.alert("Error", error.message || "Failed to send invites");
        } finally {
            setSubmitting(false);
        }
    };

    const renderPlayer = useCallback(({ item }: { item: OnDeckPlayer }) => (
        <PlayerItem
            player={item}
            isSelected={selectedIds.includes(item.id)}
            onToggle={() => togglePlayer(item.id)}
            disabled={selectedIds.length >= spotsRemaining}
        />
    ), [selectedIds, spotsRemaining, togglePlayer]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Users size={48} color={COLORS.textSub} strokeWidth={1} />
            <Text style={styles.emptyTitle}>No On-Deck Players</Text>
            <Text style={styles.emptyText}>
                You don't have any On-Deck players in your roster. Add players to On-Deck from your roster to use this feature.
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <Header
                title="Select On-Deck Players"
                onBack={() => navigation.goBack()}
            />

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Clock size={18} color={COLORS.requested} />
                <View style={styles.infoBannerText}>
                    <Text style={styles.infoBannerTitle}>
                        {spotsRemaining} spot{spotsRemaining > 1 ? 's' : ''} remaining
                    </Text>
                    <Text style={styles.infoBannerSubtitle}>
                        {courseName || 'Your tee time'} • First Come First Served
                    </Text>
                </View>
            </View>

            {/* Player List */}
            <View style={styles.listContainer}>
                <FlashList
                    data={onDeckPlayers}
                    renderItem={renderPlayer}
                    estimatedItemSize={72}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmpty}
                    ListHeaderComponent={
                        onDeckPlayers.length > 0 ? (
                            <Text style={styles.listHeader}>
                                Select up to {spotsRemaining} player{spotsRemaining > 1 ? 's' : ''} to invite
                            </Text>
                        ) : null
                    }
                />
            </View>

            {/* Footer */}
            {onDeckPlayers.length > 0 && (
                <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                    <Text style={styles.selectedCount}>
                        {selectedIds.length} of {spotsRemaining} selected
                    </Text>
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (selectedIds.length === 0 || submitting) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSendInvites}
                        disabled={selectedIds.length === 0 || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                            <Text style={styles.sendButtonText}>
                                Send FCFS Invites
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    infoBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    infoBannerText: {
        flex: 1,
    },
    infoBannerTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    infoBannerSubtitle: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 20,
    },
    listHeader: {
        fontSize: 14,
        color: COLORS.textSub,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    playerItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    playerItemSelected: {
        backgroundColor: "#F0FDF4",
    },
    playerItemDisabled: {
        opacity: 0.5,
    },
    playerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.border,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarInitial: {
        fontSize: 20,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    playerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    playerName: {
        fontSize: 16,
        fontWeight: "500",
        color: COLORS.textMain,
    },
    playerMeta: {
        flexDirection: "row",
        gap: 12,
        marginTop: 4,
    },
    playerHandicap: {
        fontSize: 13,
        color: COLORS.textSub,
    },
    playerSocialRate: {
        fontSize: 13,
        color: COLORS.primary,
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
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textMain,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        lineHeight: 20,
    },
    footer: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    selectedCount: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        marginBottom: 12,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "600",
    },
});
