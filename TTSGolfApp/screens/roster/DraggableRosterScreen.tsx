import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    LayoutAnimation,
    Platform,
    UIManager,
    Modal,
} from "react-native";
import { Star, ChevronDown, ChevronUp, ArrowUp, ArrowDown, SlidersHorizontal, Check, X } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { friendApi, rosterApi } from "../../services/api";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
        <TouchableOpacity style={styles.rosterItem} onPress={onPress} activeOpacity={0.7}>
            {/* Reorder buttons - only show when sorting by position */}
            {showReorderButtons && (
                <View style={styles.reorderButtons}>
                    <TouchableOpacity
                        style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
                        onPress={onMoveUp}
                        disabled={isFirst}
                    >
                        <ArrowUp size={16} color={isFirst ? COLORS.textSub : COLORS.textMain} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
                        onPress={onMoveDown}
                        disabled={isLast}
                    >
                        <ArrowDown size={16} color={isLast ? COLORS.textSub : COLORS.textMain} />
                    </TouchableOpacity>
                </View>
            )}

            <Text style={styles.rankNumber}>{index + 1}</Text>

            <View style={styles.avatarContainer}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>
                            {getInitials(item.firstName, item.lastName)}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.name}>
                    {item.firstName} {item.lastName}
                </Text>
                <Text style={styles.subText}>
                    {sortBy !== "position" && sortValue ? sortValue : (isOnDeck ? "On Deck" : "Roster")}
                </Text>
            </View>

            {/* Move to other section button */}
            <TouchableOpacity
                style={[styles.moveButton, isOnDeck ? styles.moveToRosterBtn : styles.moveToOnDeckBtn]}
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
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Sort Roster By</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                        <X size={20} color={COLORS.textMain} />
                    </TouchableOpacity>
                </View>
                {SORT_OPTIONS.map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        style={[styles.sortOption, currentSort === option.key && styles.sortOptionActive]}
                        onPress={() => {
                            onSelectSort(option.key);
                            onClose();
                        }}
                    >
                        <Text style={[styles.sortOptionText, currentSort === option.key && styles.sortOptionTextActive]}>
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
    <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
        <TouchableOpacity style={styles.sectionTitleTouchable} onPress={onToggle}>
            <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <View style={[styles.countBadge, { backgroundColor: color }]}>
                    <Text style={styles.countText}>{count}</Text>
                </View>
            </View>
            {isExpanded ? (
                <ChevronUp size={20} color={COLORS.textSub} />
            ) : (
                <ChevronDown size={20} color={COLORS.textSub} />
            )}
        </TouchableOpacity>
        {showSortButton && (
            <TouchableOpacity style={styles.sortButton} onPress={onSortPress}>
                <SlidersHorizontal size={18} color={COLORS.primary} />
                <Text style={styles.sortButtonText}>
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

    const loadData = useCallback(async (sort: SortOption = "position") => {
        try {
            const friendsRes = await friendApi.getFriends();

            if (friendsRes.success && friendsRes.friends) {
                const rosterRes = await rosterApi.getRoster(sort);
                const onDeckRes = await rosterApi.getOnDeck();

                const friendsMap = new Map(friendsRes.friends.map(f => [f.id, f]));

                // Process roster entries with additional sort fields
                const roster: RosterMember[] = (rosterRes.roster || [])
                    .filter((r: any) => !r.isOnDeck)
                    .map((r: any, idx: number) => {
                        const friend = friendsMap.get(r.contact?.userId);
                        return {
                            id: r.id,
                            rosterId: r.id,
                            firstName: r.contact?.name?.split(' ')[0] || friend?.firstName || '',
                            lastName: r.contact?.name?.split(' ').slice(1).join(' ') || friend?.lastName || '',
                            avatar: r.contact?.avatar || friend?.avatar,
                            isOnDeck: false,
                            position: r.position ?? idx,
                            friendId: r.contact?.userId || r.id,
                            socialRate: r.contact?.socialRate,
                            handicap: r.contact?.handicap,
                            distance: r.distanceToCourse,
                            membership: r.membership,
                        };
                    });

                const onDeck: RosterMember[] = (onDeckRes.onDeck || []).map((r: any, idx: number) => ({
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

                if (roster.length === 0 && friendsRes.friends.length > 0) {
                    const friendsAsRoster = friendsRes.friends.map((f, idx) => ({
                        id: f.id,
                        rosterId: undefined,
                        firstName: f.firstName,
                        lastName: f.lastName,
                        avatar: f.avatar,
                        isOnDeck: false,
                        position: idx,
                        friendId: f.id,
                        socialRate: undefined,
                        handicap: undefined,
                        distance: undefined,
                        membership: undefined,
                    }));
                    setRosterMembers(friendsAsRoster);
                } else {
                    // Sort is already applied from backend, but apply client-side for immediate feedback
                    setRosterMembers(sortMembers(roster, sort));
                }

                setOnDeckMembers(sortMembers(onDeck, sort));
            }
        } catch (error) {
            console.error("Failed to load roster data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

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
            await rosterApi.reorderRoster(orderedIds.filter(m => m.rosterId).map(m => m.rosterId!));
        } catch (error) {
            console.error("Failed to sync reorder:", error);
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
            await rosterApi.reorderRoster(orderedIds.filter(m => m.rosterId).map(m => m.rosterId!));
        } catch (error) {
            console.error("Failed to sync reorder:", error);
        }
    }, [rosterMembers, onDeckMembers, sortBy]);

    const toggleSection = useCallback(async (item: RosterMember) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        const movingToOnDeck = !item.isOnDeck;

        if (movingToOnDeck) {
            setRosterMembers(prev => prev.filter(m => m.id !== item.id));
            setOnDeckMembers(prev => sortMembers([...prev, { ...item, isOnDeck: true, position: prev.length }], sortBy));
        } else {
            setOnDeckMembers(prev => prev.filter(m => m.id !== item.id));
            setRosterMembers(prev => sortMembers([...prev, { ...item, isOnDeck: false, position: prev.length }], sortBy));
        }

        try {
            if (item.rosterId) {
                // Has roster entry - use moveMember
                await rosterApi.moveMember(item.rosterId, {
                    isOnDeck: movingToOnDeck,
                    newPosition: movingToOnDeck ? onDeckMembers.length : rosterMembers.length,
                });
            } else {
                // No roster entry (friend only) - need to add to roster first, then toggle
                // The friend is already in roster via friendship, so use toggleOnDeck with the friend's user ID
                // But toggleOnDeck expects a rosterId, so we need to add them to roster first
                const addResult = await rosterApi.addToRoster({ contactUserId: item.friendId });
                if (addResult.success && addResult.entry?.id) {
                    // Now move to on-deck
                    await rosterApi.moveMember(addResult.entry.id, {
                        isOnDeck: movingToOnDeck,
                        newPosition: movingToOnDeck ? onDeckMembers.length : rosterMembers.length,
                    });
                }
            }
        } catch (error: any) {
            console.error("Failed to move member:", error);
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const showReorderButtons = sortBy === "position";


    return (
        <>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
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
                    <View style={styles.sectionContent}>
                        {rosterMembers.length === 0 ? (
                            <View style={styles.emptySection}>
                                <Text style={styles.emptyText}>No players in roster</Text>
                                <Text style={styles.emptySubtext}>Add friends to build your roster</Text>
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
                    <View style={styles.sectionContent}>
                        <View style={styles.onDeckInfo}>
                            <Text style={styles.onDeckInfoText}>
                                Reserve players that can be manually selected if Roster fails to fill tee time
                            </Text>
                        </View>

                        {onDeckMembers.length === 0 ? (
                            <View style={styles.emptySection}>
                                <Star size={32} color={COLORS.textSub} />
                                <Text style={styles.emptyText}>No players on deck</Text>
                                <Text style={styles.emptySubtext}>Move players here as backup options</Text>
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

                <View style={{ height: 120 }} />
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


const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    infoBanner: {
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 8,
    },
    infoText: {
        fontSize: 13,
        color: "#2E7D32",
        lineHeight: 18,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#F9FAFB",
        borderLeftWidth: 4,
        marginTop: 8,
    },
    sectionTitleTouchable: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    sectionTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    countBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    countText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.white,
    },
    sortButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#E8F5E9",
        borderRadius: 6,
    },
    sortButtonText: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.primary,
    },
    sectionContent: {
        backgroundColor: COLORS.white,
    },
    emptySection: {
        alignItems: "center",
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textMain,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 4,
    },
    onDeckInfo: {
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 8,
    },
    onDeckInfoText: {
        fontSize: 12,
        color: "#92400E",
        lineHeight: 16,
    },
    rosterItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    reorderButtons: {
        flexDirection: "column",
        marginRight: 8,
        gap: 2,
    },
    reorderBtn: {
        padding: 4,
        borderRadius: 4,
        backgroundColor: "#F3F4F6",
    },
    reorderBtnDisabled: {
        opacity: 0.3,
    },
    rankNumber: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
        width: 24,
        textAlign: "center",
    },
    avatarContainer: {
        marginLeft: 8,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontSize: 14,
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
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 2,
    },
    moveButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    moveToOnDeckBtn: {
        backgroundColor: "#FEF3C7",
    },
    moveToRosterBtn: {
        backgroundColor: "#E8F5E9",
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        width: "100%",
        maxWidth: 340,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    modalCloseBtn: {
        padding: 4,
    },
    sortOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    sortOptionActive: {
        backgroundColor: "#E8F5E9",
    },
    sortOptionText: {
        fontSize: 15,
        color: COLORS.textMain,
    },
    sortOptionTextActive: {
        fontWeight: "600",
        color: COLORS.primary,
    },
});
