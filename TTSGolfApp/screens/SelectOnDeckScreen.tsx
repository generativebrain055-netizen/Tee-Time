import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Check, Users, Clock } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { useColors } from "../ui/theme/ThemeContext";
import { rosterApi, teeTimeApi } from "../services/api";
import { logger } from "../utils/logger";

const COLORS = {
    primary: "#5EBC68",
    white: "#FFFFFF",
    textSub: "#6B7280",
    requested: "#D97706",
};

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
            teeDate?: string;
            teeTime?: string;
            unfilledSlotAlert?: boolean;
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
            className={`flex-row items-center bg-white px-4 py-3 border-b border-gray-200 ${isSelected ? 'bg-green-50' : ''} ${disabled && !isSelected ? 'opacity-50' : ''}`}
            onPress={onToggle}
            disabled={disabled && !isSelected}
            activeOpacity={0.7}
        >
            <View className="w-12 h-12 rounded-full bg-gray-200 justify-center items-center overflow-hidden">
                {player.contact.avatar ? (
                    <Image source={{ uri: player.contact.avatar }} className="w-12 h-12 rounded-full" />
                ) : (
                    <Text className="text-xl font-semibold text-gray-500">{initial}</Text>
                )}
            </View>
            <View className="flex-1 ml-3">
                <Text className="text-base font-medium text-gray-900">{name}</Text>
                <View className="flex-row gap-3 mt-1">
                    {player.contact.handicap !== null && (
                        <Text className="text-sm text-gray-500">
                            HCP {player.contact.handicap}
                        </Text>
                    )}
                    {player.contact.socialRate !== null && (
                        <Text className="text-sm text-primary">
                            SR {player.contact.socialRate}
                        </Text>
                    )}
                </View>
            </View>
            <View
                className={`w-6 h-6 rounded-full border-2 justify-center items-center ${isSelected ? 'bg-primary border-primary' : 'border-gray-200'}`}
            >
                {isSelected && <Check size={16} color={COLORS.white} />}
            </View>
        </TouchableOpacity>
    );
});

export default function SelectOnDeckScreen({ navigation, route }: SelectOnDeckScreenProps) {
    const insets = useSafeAreaInsets();
    const { teeTimeId, spotsRemaining, courseName, teeDate, teeTime, unfilledSlotAlert } = route.params;

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
                setOnDeckPlayers(response.onDeck as any);
            }
        } catch (error) {
            logger.error("[SelectOnDeckScreen] Error loading on-deck players", error);
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
            logger.error("[SelectOnDeckScreen] Error sending on-deck invites", error);
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
        <View className="flex-1 justify-center items-center px-10 pt-16">
            <Users size={48} color={COLORS.textSub} strokeWidth={1} />
            <Text className="text-lg font-semibold text-gray-900 mt-4 mb-2">No On-Deck Players</Text>
            <Text className="text-sm text-gray-500 text-center leading-5">
                You don't have any On-Deck players in your roster. Add players to On-Deck from your roster to use this feature.
            </Text>
        </View>
    );

    if (loading) {
        return (
            <ScreenShell>
                <AppHeader
                    title={unfilledSlotAlert ? "Unfilled Slot Alert" : "Select On-Deck Players"}
                    onBack={() => navigation.goBack()}
                />
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </ScreenShell>
        );
    }

    const dateTimeLine = [teeDate, teeTime].filter(Boolean).join(" • ") || null;

    return (
        <ScreenShell>
            <AppHeader
                title={unfilledSlotAlert ? "Unfilled Slot Alert" : "Select On-Deck Players"}
                onBack={() => navigation.goBack()}
            />

            {unfilledSlotAlert && (
                <View className="px-4 pt-1 pb-2">
                    <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Fill your open spots from On-Deck
                    </Text>
                </View>
            )}

            {/* Info Banner */}
            <View className="flex-row items-center bg-amber-100 px-4 py-3 gap-3">
                <Clock size={18} color={COLORS.requested} />
                <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-gray-900">
                        {spotsRemaining} spot{spotsRemaining > 1 ? 's' : ''} remaining
                    </Text>
                    <Text className="text-sm text-gray-500 mt-0.5">
                        {[courseName || "Your tee time", dateTimeLine].filter(Boolean).join(" • ") || "Your tee time"} • First Come First Served
                    </Text>
                </View>
            </View>

            {/* Player List */}
            <View className="flex-1">
                <FlashList
                    data={onDeckPlayers}
                    renderItem={renderPlayer}
                    // @ts-expect-error - FlashList types mismatch
                    estimatedItemSize={72}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={renderEmpty}
                    ListHeaderComponent={
                        onDeckPlayers.length > 0 ? (
                            <Text className="text-sm text-gray-500 px-4 py-3">
                                Select up to {spotsRemaining} player{spotsRemaining > 1 ? 's' : ''} to invite
                            </Text>
                        ) : null
                    }
                />
            </View>

            {/* Footer */}
            {onDeckPlayers.length > 0 && (
                <View className="bg-white px-4 pt-4 border-t border-gray-200" style={{ paddingBottom: insets.bottom + 16 }}>
                    <Text className="text-sm text-gray-500 text-center mb-3">
                        {selectedIds.length} of {spotsRemaining} selected
                    </Text>
                    <TouchableOpacity
                        className={`bg-primary rounded-md py-4 items-center ${(selectedIds.length === 0 || submitting) ? 'opacity-50' : ''}`}
                        onPress={handleSendInvites}
                        disabled={selectedIds.length === 0 || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                            <Text className="text-white text-base font-semibold">
                                Send FCFS Invites
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </ScreenShell>
    );
}
