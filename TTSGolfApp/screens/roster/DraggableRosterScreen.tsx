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
import { Star, ChevronDown, ChevronUp, ArrowUp, ArrowDown, SlidersHorizontal, Check, X } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { friendApi, rosterApi } from "../../services/api";
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
    // Additional fields for sorting
    socialRate?: number;
    handicap?: number;
    distance?: number;
    membership?: string;
}

/** Roster row UUID for API calls (row id vs contact user id). */
function rosterRowIdForApi(m: RosterMember): string | undefined {
    return m.rosterId ?? (m.id !== m.friendId ? m.id : undefined);
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
    { key: "position", label: "Manual Order" },
    { key: "socialRate", label: "Social Rate" },
    { key: "handicap", label: "Handicap" },
    { key: "distance", label: "Distance to Course" },
    { key: "membership", label: "Club Membership" },
    { key: "name", label: "Name (A-Z)" },
];

const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
};

const formatSortValue = (item: RosterMember, sortBy: SortOption): string => {
    switch (sortBy) {
        case "socialRate":
            return item.socialRate !== undefined ? `${item.socialRate} SR` : "—";
        case "handicap":
            return item.handicap !== undefined ? `HCP ${item.handicap}` : "—";
        case "distance":
            return item.distance !== undefined ? `${item.distance} mi` : "—";
        case "membership":
            return item.membership || "—";
        default:
            return "";
    }
};


// Memoized roster item component
interface RosterItemProps {
    item: RosterMember;
    index: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onToggleSection: () => void;
    onPress: () => void;
    isFirst: boolean;
    isLast: boolean;
    isOnDeck: boolean;
    sortBy: SortOption;
    showReorderButtons: boolean;
}

const RosterItem = memo(({ item, index, onMoveUp, onMoveDown, onToggleSection, onPress, isFirst, isLast, isOnDeck, sortBy, showReorderButtons }: RosterItemProps) => {
    const sortValue = formatSortValue(item, sortBy);

    return (
        <TouchableOpacity className="flex-row items-center py-3 px-3 bg-white border-b border-gray-100" onPress={onPress} activeOpacity={0.7}>
            {/* Reorder buttons - only show when sorting by position */}
            {showReorderButtons && (
                <View className="flex-col mr-2 gap-0.5">
                    <TouchableOpacity
                        className={`p-1 rounded bg-gray-100 ${isFirst ? 'opacity-30' : ''}`}
                        onPress={onMoveUp}
                        disabled={isFirst}
                    >
                        <ArrowUp size={16} color={isFirst ? COLORS.textSub : COLORS.textMain} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`p-1 rounded bg-gray-100 ${isLast ? 'opacity-30' : ''}`}
                        onPress={onMoveDown}
                        disabled={isLast}
                    >
                        <ArrowDown size={16} color={isLast ? COLORS.textSub : COLORS.textMain} />
                    </TouchableOpacity>
                </View>
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

            {/* Move to other section button */}
            <TouchableOpacity
                className={`w-10 h-10 rounded-md justify-center items-center ${isOnDeck ? 'bg-green-50' : 'bg-amber-100'}`}
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

// Sort Modal Component
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
                        className={`flex-row items-center justify-between px-5 py-3.5 border-b border-gray-100 ${currentSort === option.key ? 'bg-green-50' : ''}`}
                        onPress={() => {
                            onSelectSort(option.key);
                            onClose();
                        }}
                    >
                        <Text className={`text-[15px] ${currentSort === option.key ? 'font-semibold' : 'text-gray-900'}`}
                              style={currentSort === option.key ? { color: COLORS.primary } : {}}>
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


// Section header component with sort button
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
    <View className="flex-row items-center justify-between px-4 py-2.5 bg-gray-50 border-l-4 mt-2"
          style={{ borderLeftColor: color }}>
        <TouchableOpacity className="flex-row items-center flex-1" onPress={onToggle}>
            <View className="flex-row items-center gap-2.5 flex-1">
                <Text className="text-base font-semibold text-gray-900">{title}</Text>
                <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: color }}>
                    <Text className="text-xs font-semibold text-white">{count}</Text>
                </View>
            </View>
            {isExpanded ? (
                <ChevronUp size={20} color={COLORS.textSub} />
            ) : (
                <ChevronDown size={20} color={COLORS.textSub} />
            )}
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

export default function DraggableRosterScreen({ navigation }: { navigation: any }) {
    const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);
    const [onDeckMembers, setOnDeckMembers] = useState<RosterMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rosterExpanded, setRosterExpanded] = useState(true);
    const [onDeckExpanded, setOnDeckExpanded] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>("position");
    const [showSortModal, setShowSortModal] = useState(false);

    // Client-side sorting function
    const sortMembers = useCallback((members: RosterMember[], sort: SortOption): RosterMember[] => {
        const sorted = [...members];
        switch (sort) {
            case "socialRate":
                return sorted.sort((a, b) => (b.socialRate ?? -1) - (a.socialRate ?? -1));
            case "handicap":
                return sorted.sort((a, b) => (a.handicap ?? 999) - (b.handicap ?? 999));
            case "distance":
                return sorted.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
            case "membership":
                return sorted.sort((a, b) => (a.membership || "zzz").localeCompare(b.membership || "zzz"));
            case "name":
                return sorted.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
            case "position":
            default:
                return sorted.sort((a, b) => a.position - b.position);
        }
    }, []);

    const loadData = useCallback(async (sort: SortOption = "position") => {
        try {
            const [friendsRes, rosterRes, onDeckRes] = await Promise.all([
                friendApi.getFriends(),
                rosterApi.getRoster(sort),
                rosterApi.getOnDeck()
            ]);

            if (!friendsRes.success) {
                logger.error("[DraggableRosterScreen] Failed to load friends");
                return;
            }

            const friends = friendsRes.friends || [];
            const rosterEntries = rosterRes.roster || [];
            const onDeckEntries = onDeckRes.onDeck || [];

            // Create maps for quick lookup
            const rosterByUserId = new Map<string, any>();
            rosterEntries.forEach((r: any) => {
                if (r.contact?.userId) {
                    rosterByUserId.set(r.contact.userId, r);
                }
            });

            const onDeckByUserId = new Map<string, any>();
            onDeckEntries.forEach((r: any) => {
                if (r.contact?.userId) {
                    onDeckByUserId.set(r.contact.userId, r);
                }
            });

            // Build on-deck list from on-deck entries
            const onDeck: RosterMember[] = onDeckEntries.map((r: any, idx: number) => ({
                id: r.id,
                rosterId: r.id,
                firstName: r.contact?.name?.split(' ')[0] || '',
                lastName: r.contact?.name?.split(' ').slice(1).join(' ') || '',
                avatar: r.contact?.avatar,
                isOnDeck: true,
                position: r.position ?? idx,
                friendId: r.contact?.userId || r.id,
                socialRate: r.contact?.socialRate,
                handicap: r.contact?.handicap,
                distance: r.distanceToCourse,
                membership: r.membership,
            }));

            // Build roster list - friends who are NOT in on-deck
            const roster: RosterMember[] = [];

            const friendIds = new Set(friends.map((f) => f.id));

            friends.forEach((friend, idx) => {
                // Skip if this friend is in on-deck
                if (onDeckByUserId.has(friend.id)) {
                    return;
                }

                const rosterEntry = rosterByUserId.get(friend.id);
                // Only show under main Roster if they have an actual roster row (not on-deck).
                // Otherwise removed / never-rostered friends would still appear here because
                // they remain in the friends list after "Remove from On Deck" deletes the row.
                if (!rosterEntry?.id) {
                    return;
                }

                const rowId = rosterEntry.id;

                roster.push({
                    id: rowId,
                    rosterId: rowId,
                    firstName: friend.firstName || '',
                    lastName: friend.lastName || '',
                    avatar: rosterEntry?.contact?.avatar || friend.avatar,
                    isOnDeck: false,
                    position: rosterEntry?.position ?? idx,
                    friendId: friend.id,
                    socialRate: rosterEntry?.contact?.socialRate || friend.socialRate,
                    handicap: rosterEntry?.contact?.handicap || friend.handicap,
                    distance: rosterEntry?.distanceToCourse,
                    membership: rosterEntry?.membership,
                });
            });

            // Roster rows not tied to the current friends list (still need a real roster id for move/on-deck)
            rosterEntries.forEach((r: any, idx: number) => {
                const uid = r.contact?.userId as string | undefined;
                if (!uid || onDeckByUserId.has(uid) || friendIds.has(uid)) return;
                const name = (r.contact?.name || "").trim();
                const [first, ...rest] = name.split(/\s+/).filter(Boolean);
                roster.push({
                    id: r.id,
                    rosterId: r.id,
                    firstName: first || "",
                    lastName: rest.join(" "),
                    avatar: r.contact?.avatar,
                    isOnDeck: false,
                    position: r.position ?? roster.length + idx,
                    friendId: uid,
                    socialRate: r.contact?.socialRate,
                    handicap: r.contact?.handicap,
                    distance: r.distanceToCourse,
                    membership: r.membership,
                });
            });

            setRosterMembers(sortMembers(roster, sort));
            setOnDeckMembers(sortMembers(onDeck, sort));

        } catch (error) {
            logger.error("[DraggableRosterScreen] Failed to load roster data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sortMembers]);

    useEffect(() => {
        loadData(sortBy);
    }, [loadData, sortBy]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData(sortBy);
    }, [loadData, sortBy]);

    const handleSortChange = useCallback((newSort: SortOption) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSortBy(newSort);
        // Re-sort existing data immediately
        setRosterMembers(prev => sortMembers(prev, newSort));
        setOnDeckMembers(prev => sortMembers(prev, newSort));
    }, [sortMembers]);


    // Move item up in list (only when sorting by position)
    const moveUp = useCallback(async (isOnDeck: boolean, index: number) => {
        if (index === 0 || sortBy !== "position") return;

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (isOnDeck) {
            setOnDeckMembers(prev => {
                const newList = [...prev];
                [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
                return newList.map((item, idx) => ({ ...item, position: idx }));
            });
        } else {
            setRosterMembers(prev => {
                const newList = [...prev];
                [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
                return newList.map((item, idx) => ({ ...item, position: idx }));
            });
        }

        try {
            const list = isOnDeck ? onDeckMembers : rosterMembers;
            const orderedIds = [...list];
            [orderedIds[index - 1], orderedIds[index]] = [orderedIds[index], orderedIds[index - 1]];
            await rosterApi.reorderRoster(
                orderedIds.map(rosterRowIdForApi).filter((id): id is string => !!id),
            );
        } catch (error) {
            logger.error("[DraggableRosterScreen] Failed to sync reorder", error);
        }
    }, [rosterMembers, onDeckMembers, sortBy]);

    const moveDown = useCallback(async (isOnDeck: boolean, index: number) => {
        const list = isOnDeck ? onDeckMembers : rosterMembers;
        if (index >= list.length - 1 || sortBy !== "position") return;

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (isOnDeck) {
            setOnDeckMembers(prev => {
                const newList = [...prev];
                [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
                return newList.map((item, idx) => ({ ...item, position: idx }));
            });
        } else {
            setRosterMembers(prev => {
                const newList = [...prev];
                [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
                return newList.map((item, idx) => ({ ...item, position: idx }));
            });
        }

        try {
            const orderedIds = [...list];
            [orderedIds[index], orderedIds[index + 1]] = [orderedIds[index + 1], orderedIds[index]];
            await rosterApi.reorderRoster(
                orderedIds.map(rosterRowIdForApi).filter((id): id is string => !!id),
            );
        } catch (error) {
            logger.error("[DraggableRosterScreen] Failed to sync reorder", error);
        }
    }, [rosterMembers, onDeckMembers, sortBy]);

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
                // Friend not on roster yet — add row, then set on-deck / position
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
            // If already in roster error, try to find and move
            if (error?.message?.includes("already in roster")) {
                // Reload to get the correct rosterId
                loadData(sortBy);
            } else {
                loadData(sortBy);
            }
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

    // Navigate to profile view
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

    if (loading) {
        return (
            <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
                <View className="px-4 py-3">
                    <View className="w-32 h-5 bg-gray-200 rounded mb-4" />
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <View key={i} className="flex-row items-center py-3 border-b border-gray-100">
                            <View className="w-6 h-4 bg-gray-200 rounded mr-2" />
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

    const showReorderButtons = sortBy === "position";


    return (
        <>
            <ScrollView
                className="flex-1 bg-white"
                contentContainerStyle={{ paddingBottom: 20 }}
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
                <View className="bg-green-50 px-4 py-3 mx-4 mt-4 mb-2 rounded-md">
                    <Text className="text-[13px] text-green-800 leading-[18px]">
                        {sortBy === "position"
                            ? "Use arrows to reorder players. Tap the star to move between Roster and On Deck."
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
                    showSortButton={true}
                    onSortPress={() => setShowSortModal(true)}
                    currentSort={sortBy}
                />

                {rosterExpanded && (
                    <View className="bg-white">
                        {rosterMembers.length === 0 ? (
                            <View className="items-center py-8 px-5">
                                <Text className="text-[15px] font-medium text-gray-900 mt-3">No players in roster</Text>
                                <Text className="text-[13px] text-gray-500 mt-1">Add friends to build your roster</Text>
                            </View>
                        ) : (
                            rosterMembers.map((item, index) => (
                                <RosterItem
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    onMoveUp={() => moveUp(false, index)}
                                    onMoveDown={() => moveDown(false, index)}
                                    onToggleSection={() => toggleSection(item)}
                                    onPress={() => handleViewProfile(item)}
                                    isFirst={index === 0}
                                    isLast={index === rosterMembers.length - 1}
                                    isOnDeck={false}
                                    sortBy={sortBy}
                                    showReorderButtons={showReorderButtons}
                                />
                            ))
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
                            onDeckMembers.map((item, index) => (
                                <RosterItem
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    onMoveUp={() => moveUp(true, index)}
                                    onMoveDown={() => moveDown(true, index)}
                                    onToggleSection={() => toggleSection(item)}
                                    onPress={() => handleViewProfile(item)}
                                    isFirst={index === 0}
                                    isLast={index === onDeckMembers.length - 1}
                                    isOnDeck={true}
                                    sortBy={sortBy}
                                    showReorderButtons={showReorderButtons}
                                />
                            ))
                        )}
                    </View>
                )}

                <View className="h-[120px]" />
            </ScrollView>

            <SortModal
                visible={showSortModal}
                onClose={() => setShowSortModal(false)}
                currentSort={sortBy}
                onSelectSort={handleSortChange}
            />
        </>
    );
}
