import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    LayoutAnimation,
    Platform,
    Modal,
} from "react-native";
import { Star, ChevronDown, ChevronUp, SlidersHorizontal, Check, X, GripVertical } from "lucide-react-native";
import DraggableFlatList, { ScaleDecorator, ShadowDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { COLORS } from "../../constants/colors";
import { rosterApi, type RosterContact } from "../../services/api";
import { logger } from "../../utils/logger";

type SortOption = "position" | "socialRate" | "handicap" | "name" | "distance" | "membership";

interface RosterMember {
    id: string;
    rosterId?: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    isOnDeck: boolean;
    position: number;
    friendId: string;
    socialRate?: number;
    handicap?: number;
    distance?: number;
    membership?: string;
}

function rosterRowIdForApi(m: RosterMember): string | undefined {
    return m.rosterId ?? (m.id !== m.friendId ? m.id : undefined);
}

type RosterListRow = RosterContact & {
    distanceToCourse?: number;
    membership?: string;
    contact: RosterContact["contact"] & { socialRate?: number };
};

function mapRosterRowToMember(r: RosterListRow, idx: number, isOnDeck: boolean): RosterMember {
    const contact = r.contact;
    const name = (contact.name || "").trim();
    const firstName = name.split(/\s+/)[0] || "";
    const lastName = name.split(/\s+/).slice(1).join(" ");
    const uid = contact.userId;
    return {
        id: r.id,
        rosterId: r.id,
        firstName,
        lastName,
        avatar: contact.avatar,
        isOnDeck,
        position: r.position ?? idx,
        friendId: uid || r.id,
        socialRate: contact.socialRate,
        handicap: contact.handicap,
        distance: r.distanceToCourse,
        membership: r.membership,
    };
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
    { key: "position", label: "Manual Order" },
    { key: "socialRate", label: "Social Rate" },
    { key: "handicap", label: "Handicap" },
    { key: "distance", label: "Distance to Course" },
    { key: "membership", label: "Club Membership" },
    { key: "name", label: "Name (A-Z)" },
];

const getInitials = (firstName: string, lastName: string): string =>
    `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

const formatSortValue = (item: RosterMember, sortBy: SortOption): string => {
    switch (sortBy) {
        case "socialRate": return item.socialRate !== undefined ? `${item.socialRate} SR` : "—";
        case "handicap":   return item.handicap  !== undefined ? `HCP ${item.handicap}` : "—";
        case "distance":   return item.distance  !== undefined ? `${item.distance} mi`  : "—";
        case "membership": return item.membership || "—";
        default:           return "";
    }
};

// ─── Roster Item ──────────────────────────────────────────────────────────────
interface RosterItemProps {
    item: RosterMember;
    index: number;
    drag: () => void;
    isActive: boolean;
    onToggleSection: () => void;
    onPress: () => void;
    isOnDeck: boolean;
    sortBy: SortOption;
}

const RosterItem = memo(({ item, index, drag, isActive, onToggleSection, onPress, isOnDeck, sortBy }: RosterItemProps) => {
    const sortValue = formatSortValue(item, sortBy);
    const showDragHandle = sortBy === "position";

    return (
        <TouchableOpacity
            className="flex-row items-center py-3 px-3 bg-white border-b border-gray-100"
            style={isActive ? { backgroundColor: "#F9FAFB", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 } : undefined}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Drag handle — shown only in manual order mode */}
            {showDragHandle ? (
                <TouchableOpacity
                    onPressIn={drag}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    className="mr-1 p-1.5"
                >
                    <GripVertical size={20} color={COLORS.textSub} />
                </TouchableOpacity>
            ) : (
                <View className="w-8" />
            )}

            <Text className="text-sm font-semibold text-gray-500 w-6 text-center">{index + 1}</Text>

            <View className="ml-2">
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} className="w-11 h-11 rounded-full" />
                ) : (
                    <View className="w-11 h-11 rounded-full bg-gray-200 justify-center items-center">
                        <Text className="text-sm font-semibold text-gray-500">
                            {getInitials(item.firstName, item.lastName)}
                        </Text>
                    </View>
                )}
            </View>

            <View className="flex-1 ml-3">
                <Text className="text-[15px] font-semibold text-gray-900">
                    {item.firstName} {item.lastName}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                    {sortBy !== "position" && sortValue ? sortValue : (isOnDeck ? "On Deck" : "Roster")}
                </Text>
            </View>

            {/* Move to other section */}
            <TouchableOpacity
                className={`w-10 h-10 rounded-md justify-center items-center ${isOnDeck ? "bg-green-50" : "bg-amber-100"}`}
                onPress={(e) => { e.stopPropagation(); onToggleSection(); }}
            >
                <Star
                    size={18}
                    color={isOnDeck ? COLORS.primary : "#F59E0B"}
                    fill={isOnDeck ? "transparent" : "#F59E0B"}
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );
});

RosterItem.displayName = "RosterItem";

// ─── Sort Modal ───────────────────────────────────────────────────────────────
interface SortModalProps {
    visible: boolean;
    onClose: () => void;
    currentSort: SortOption;
    onSelectSort: (sort: SortOption) => void;
}

const SortModal = memo(({ visible, onClose, currentSort, onSelectSort }: SortModalProps) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity className="flex-1 bg-black/50 justify-center items-center px-5" activeOpacity={1} onPress={onClose}>
            <View className="bg-white rounded-md w-full max-w-[340px] overflow-hidden">
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                    <Text className="text-lg font-semibold text-gray-900">Sort Roster By</Text>
                    <TouchableOpacity onPress={onClose} className="p-1">
                        <X size={20} color={COLORS.textMain} />
                    </TouchableOpacity>
                </View>
                {SORT_OPTIONS.map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        className={`flex-row items-center justify-between px-5 py-3.5 border-b border-gray-100 ${currentSort === option.key ? "bg-green-50" : ""}`}
                        onPress={() => { onSelectSort(option.key); onClose(); }}
                    >
                        <Text
                            className={`text-[15px] ${currentSort === option.key ? "font-semibold" : "text-gray-900"}`}
                            style={currentSort === option.key ? { color: COLORS.primary } : {}}
                        >
                            {option.label}
                        </Text>
                        {currentSort === option.key && <Check size={18} color={COLORS.primary} />}
                    </TouchableOpacity>
                ))}
            </View>
        </TouchableOpacity>
    </Modal>
));

SortModal.displayName = "SortModal";

// ─── Section Header ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
    title: string;
    count: number;
    isExpanded: boolean;
    onToggle: () => void;
    color: string;
    showSortButton?: boolean;
    onSortPress?: () => void;
    currentSort?: SortOption;
}

const SectionHeader = memo(({ title, count, isExpanded, onToggle, color, showSortButton, onSortPress, currentSort }: SectionHeaderProps) => (
    <View className="flex-row items-center justify-between px-4 py-2.5 bg-gray-50 border-l-4 mt-2" style={{ borderLeftColor: color }}>
        <TouchableOpacity className="flex-row items-center flex-1" onPress={onToggle}>
            <View className="flex-row items-center gap-2.5 flex-1">
                <Text className="text-base font-semibold text-gray-900">{title}</Text>
                <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: color }}>
                    <Text className="text-xs font-semibold text-white">{count}</Text>
                </View>
            </View>
            {isExpanded ? <ChevronUp size={20} color={COLORS.textSub} /> : <ChevronDown size={20} color={COLORS.textSub} />}
        </TouchableOpacity>
        {showSortButton && (
            <TouchableOpacity className="flex-row items-center gap-1.5 px-2.5 py-1.5 bg-green-50 rounded-md" onPress={onSortPress}>
                <SlidersHorizontal size={18} color={COLORS.primary} />
                <Text className="text-xs font-medium" style={{ color: COLORS.primary }}>
                    {SORT_OPTIONS.find(o => o.key === currentSort)?.label || "Sort"}
                </Text>
            </TouchableOpacity>
        )}
    </View>
));

SectionHeader.displayName = "SectionHeader";

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DraggableRosterScreen({ navigation }: { navigation: any }) {
    const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);
    const [onDeckMembers, setOnDeckMembers] = useState<RosterMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rosterExpanded, setRosterExpanded] = useState(true);
    const [onDeckExpanded, setOnDeckExpanded] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>("position");
    const [showSortModal, setShowSortModal] = useState(false);

    const sortMembers = useCallback((members: RosterMember[], sort: SortOption): RosterMember[] => {
        const sorted = [...members];
        switch (sort) {
            case "socialRate":  return sorted.sort((a, b) => (b.socialRate ?? -1) - (a.socialRate ?? -1));
            case "handicap":    return sorted.sort((a, b) => (a.handicap ?? 999) - (b.handicap ?? 999));
            case "distance":    return sorted.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
            case "membership":  return sorted.sort((a, b) => (a.membership || "zzz").localeCompare(b.membership || "zzz"));
            case "name":        return sorted.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
            case "position":
            default:            return sorted.sort((a, b) => a.position - b.position);
        }
    }, []);

    const loadData = useCallback(async (sort: SortOption = "position") => {
        try {
            const [rosterRes, onDeckRes] = await Promise.all([
                rosterApi.getRoster(sort),
                rosterApi.getOnDeck(),
            ]);

            const rosterEntries = rosterRes.success ? rosterRes.roster || [] : [];
            const onDeckEntries = onDeckRes.success ? onDeckRes.onDeck || [] : [];

            if (!rosterRes.success) logger.error("[DraggableRosterScreen] Failed to load roster");
            if (!onDeckRes.success) logger.error("[DraggableRosterScreen] Failed to load on-deck");

            const roster: RosterMember[] = rosterEntries.map((r, idx) =>
                mapRosterRowToMember(r as RosterListRow, idx, false),
            );
            const onDeck: RosterMember[] = onDeckEntries.map((r, idx) =>
                mapRosterRowToMember(r as RosterListRow, idx, true),
            );

            setRosterMembers(sortMembers(roster, sort));
            setOnDeckMembers(sortMembers(onDeck, sort));
        } catch (error) {
            logger.error("[DraggableRosterScreen] Failed to load roster data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sortMembers]);

    useEffect(() => { loadData(sortBy); }, [loadData, sortBy]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData(sortBy);
    }, [loadData, sortBy]);

    const handleSortChange = useCallback((newSort: SortOption) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSortBy(newSort);
        setRosterMembers(prev => sortMembers(prev, newSort));
        setOnDeckMembers(prev => sortMembers(prev, newSort));
    }, [sortMembers]);

    // Called when a drag ends — reorders the list and syncs to the API.
    const handleRosterDragEnd = useCallback(async ({ data }: { data: RosterMember[] }) => {
        const reordered = data.map((item, idx) => ({ ...item, position: idx }));
        setRosterMembers(reordered);
        try {
            await rosterApi.reorderRoster(
                reordered.map(rosterRowIdForApi).filter((id): id is string => !!id),
            );
        } catch (error) {
            logger.error("[DraggableRosterScreen] Failed to sync roster reorder", error);
        }
    }, []);

    const handleOnDeckDragEnd = useCallback(async ({ data }: { data: RosterMember[] }) => {
        const reordered = data.map((item, idx) => ({ ...item, position: idx }));
        setOnDeckMembers(reordered);
        try {
            await rosterApi.reorderRoster(
                reordered.map(rosterRowIdForApi).filter((id): id is string => !!id),
            );
        } catch (error) {
            logger.error("[DraggableRosterScreen] Failed to sync on-deck reorder", error);
        }
    }, []);

    const toggleSection = useCallback(async (item: RosterMember) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        const movingToOnDeck = !item.isOnDeck;
        const rosterRowId = rosterRowIdForApi(item);

        if (movingToOnDeck) {
            setRosterMembers(prev => prev.filter(m => m.id !== item.id));
            setOnDeckMembers(prev => sortMembers([...prev, { ...item, isOnDeck: true, position: prev.length }], sortBy));
        } else {
            setOnDeckMembers(prev => prev.filter(m => m.id !== item.id));
            setRosterMembers(prev => sortMembers([...prev, { ...item, isOnDeck: false, position: prev.length }], sortBy));
        }

        try {
            if (rosterRowId) {
                await rosterApi.moveMember(rosterRowId, {
                    isOnDeck: movingToOnDeck,
                    newPosition: movingToOnDeck ? onDeckMembers.length : rosterMembers.length,
                });
            } else {
                const addResult = await rosterApi.addToRoster({ contactUserId: item.friendId });
                if (addResult.success && addResult.entry?.id) {
                    await rosterApi.moveMember(addResult.entry.id, {
                        isOnDeck: movingToOnDeck,
                        newPosition: movingToOnDeck ? onDeckMembers.length : rosterMembers.length,
                    });
                }
            }
        } catch (error: any) {
            logger.error("[DraggableRosterScreen] Failed to move member", error);
            loadData(sortBy);
        }
    }, [rosterMembers, onDeckMembers, loadData, sortBy, sortMembers]);

    const toggleRosterExpanded = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setRosterExpanded(prev => !prev);
    }, []);

    const toggleOnDeckExpanded = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOnDeckExpanded(prev => !prev);
    }, []);

    const handleViewProfile = useCallback((item: RosterMember) => {
        navigation?.navigate("RosterProfile", {
            rosterId: item.rosterId || item.id,
            person: {
                id: item.rosterId || item.id,
                name: `${item.firstName} ${item.lastName}`,
                img: item.avatar,
            },
        });
    }, [navigation]);

    const renderRosterItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<RosterMember>) => {
        const index = getIndex() ?? 0;
        return (
            <ShadowDecorator>
                <ScaleDecorator>
                    <RosterItem
                        item={item}
                        index={index}
                        drag={drag}
                        isActive={isActive}
                        onToggleSection={() => toggleSection(item)}
                        onPress={() => handleViewProfile(item)}
                        isOnDeck={false}
                        sortBy={sortBy}
                    />
                </ScaleDecorator>
            </ShadowDecorator>
        );
    }, [toggleSection, handleViewProfile, sortBy]);

    const renderOnDeckItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<RosterMember>) => {
        const index = getIndex() ?? 0;
        return (
            <ShadowDecorator>
                <ScaleDecorator>
                    <RosterItem
                        item={item}
                        index={index}
                        drag={drag}
                        isActive={isActive}
                        onToggleSection={() => toggleSection(item)}
                        onPress={() => handleViewProfile(item)}
                        isOnDeck={true}
                        sortBy={sortBy}
                    />
                </ScaleDecorator>
            </ShadowDecorator>
        );
    }, [toggleSection, handleViewProfile, sortBy]);

    const keyExtractor = useCallback((item: RosterMember) => item.id, []);

    if (loading) {
        return (
            <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
                <View className="px-4 py-3">
                    <View className="w-32 h-5 bg-gray-200 rounded mb-4" />
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <View key={i} className="flex-row items-center py-3 border-b border-gray-100">
                            <View className="w-6 h-6 bg-gray-200 rounded mr-2" />
                            <View className="w-11 h-11 rounded-full bg-gray-200 ml-2" />
                            <View className="flex-1 ml-3">
                                <View className="w-32 h-4 bg-gray-200 rounded mb-2" />
                                <View className="w-20 h-3 bg-gray-200 rounded" />
                            </View>
                            <View className="w-10 h-10 bg-gray-200 rounded-md" />
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ScrollView
                className="flex-1 bg-white"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                }
            >
                {/* Info banner */}
                <View className="bg-green-50 px-4 py-3 mx-4 mt-4 mb-2 rounded-md">
                    <Text className="text-[13px] text-green-800 leading-[18px]">
                        {sortBy === "position"
                            ? "Hold and drag \u2630 to reorder. Tap the star to move between Roster and On Deck."
                            : "Sorted by " + SORT_OPTIONS.find(o => o.key === sortBy)?.label + ". Switch to Manual Order to reorder."}
                    </Text>
                </View>

                {/* Roster Section */}
                <SectionHeader
                    title="Roster"
                    count={rosterMembers.length}
                    isExpanded={rosterExpanded}
                    onToggle={toggleRosterExpanded}
                    color={COLORS.primary}
                    showSortButton
                    onSortPress={() => setShowSortModal(true)}
                    currentSort={sortBy}
                />

                {rosterExpanded && (
                    <View className="bg-white">
                        {rosterMembers.length === 0 ? (
                            <View className="items-center py-8 px-5">
                                <Text className="text-[15px] font-medium text-gray-900 mt-3">No players in roster</Text>
                                <Text className="text-[13px] text-gray-500 mt-1">Find players to add them to your roster</Text>
                            </View>
                        ) : (
                            <DraggableFlatList
                                data={rosterMembers}
                                renderItem={renderRosterItem}
                                keyExtractor={keyExtractor}
                                onDragEnd={handleRosterDragEnd}
                                scrollEnabled={false}
                                activationDistance={sortBy === "position" ? 5 : 999}
                            />
                        )}
                    </View>
                )}

                {/* On Deck Section */}
                <SectionHeader
                    title="On Deck"
                    count={onDeckMembers.length}
                    isExpanded={onDeckExpanded}
                    onToggle={toggleOnDeckExpanded}
                    color="#F59E0B"
                />

                {onDeckExpanded && (
                    <View className="bg-white">
                        <View className="bg-amber-100 px-4 py-2.5 mx-4 mt-3 rounded-md">
                            <Text className="text-xs text-amber-900 leading-4">
                                Reserve players that can be manually selected if Roster fails to fill tee time
                            </Text>
                        </View>

                        {onDeckMembers.length === 0 ? (
                            <View className="items-center py-8 px-5">
                                <Star size={32} color={COLORS.textSub} />
                                <Text className="text-[15px] font-medium text-gray-900 mt-3">No players on deck</Text>
                                <Text className="text-[13px] text-gray-500 mt-1">Move players here as backup options</Text>
                            </View>
                        ) : (
                            <DraggableFlatList
                                data={onDeckMembers}
                                renderItem={renderOnDeckItem}
                                keyExtractor={keyExtractor}
                                onDragEnd={handleOnDeckDragEnd}
                                scrollEnabled={false}
                                activationDistance={sortBy === "position" ? 5 : 999}
                            />
                        )}
                    </View>
                )}

                <View className="h-[40px]" />
            </ScrollView>

            <SortModal
                visible={showSortModal}
                onClose={() => setShowSortModal(false)}
                currentSort={sortBy}
                onSelectSort={handleSortChange}
            />
        </GestureHandlerRootView>
    );
}
