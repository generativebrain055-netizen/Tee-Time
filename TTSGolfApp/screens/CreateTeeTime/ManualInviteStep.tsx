import React, { useState, useCallback, useEffect, memo, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    TextInput,
    StyleSheet,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Check, Search } from "lucide-react-native";
import { COLORS, FIGMA_YOUR_PLAYERS } from "./constants";
import { Friend, RosterGroup, RosterContact, rosterApi } from "../../services/api";
import { logger } from "../../utils/logger";
import { otherPeopleInGroupCount } from "../../utils/groupMemberCount";

type SourceTab = "roster" | "ondeck" | "groups";

interface ManualInviteStepProps {
    friends: Friend[];
    onDeckFriends: Friend[];
    groups: RosterGroup[];
    selectedPlayers: string[];
    groupSize: number;
    onTogglePlayer: (id: string) => void;
    onSelectGroupMembers: (memberIds: string[]) => void;
    onGroupMembersLoaded?: (members: (Friend & { phone?: string; rosterId?: string })[]) => void;
}

// Memoized player item for performance
const PlayerItem = memo(({
    player,
    isSelected,
    canSelect,
    onToggle
}: {
    player: Friend;
    isSelected: boolean;
    canSelect: boolean;
    onToggle: () => void;
}) => {
    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    return (
        <TouchableOpacity
            className={`flex-row items-center p-3 rounded-md mb-2 ${
                isSelected ? "bg-primary-100" : "bg-bg-muted"
            } ${
                !canSelect ? "opacity-50" : ""
            }`}
            onPress={onToggle}
            disabled={!canSelect}
            activeOpacity={0.7}
        >
            <View className="mr-3">
                {player.avatar ? (
                    <Image source={{ uri: player.avatar }} className="w-11 h-11 rounded-full" />
                ) : (
                    <View className="w-11 h-11 rounded-full bg-primary justify-center items-center">
                        <Text className="text-[15px] font-semibold text-white">
                            {getInitials(player.firstName, player.lastName)}
                        </Text>
                    </View>
                )}
            </View>
            <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1F2937]">
                    {player.firstName} {player.lastName}
                </Text>
                <Text className="text-[13px] text-[#9CA3AF] mt-0.5">
                    {player.handicap !== undefined
                        ? `HCP ${player.handicap}`
                        : player.homeCourse || "Golf buddy"}
                </Text>
            </View>
            <View className={`w-6 h-6 rounded-full justify-center items-center ${
                isSelected ? "bg-primary border-primary" : "border-2 border-border"
            }`}>
                {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
            </View>
        </TouchableOpacity>
    );
});

// Memoized group item
const GroupItem = memo(({
    group,
    selectedCount,
    totalCount,
    onSelectAll,
    onViewMembers,
    isExpanded,
}: {
    group: RosterGroup;
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onViewMembers: () => void;
    isExpanded: boolean;
}) => {
    const allSelected = selectedCount === totalCount && totalCount > 0;

    return (
        <TouchableOpacity
            className="flex-row items-center p-3.5 bg-bg-muted rounded-md mb-2"
            onPress={onViewMembers}
            activeOpacity={0.7}
        >
            <View className="w-11 h-11 rounded-full justify-center items-center mr-3" style={{ backgroundColor: group.color + "20" }}>
                <Text className="text-sm font-bold" style={{ color: group.color }}>
                    {group.name.substring(0, 2).toUpperCase()}
                </Text>
            </View>
            <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1F2937]">{group.name}</Text>
                <Text className="text-[13px] text-[#9CA3AF] mt-0.5">
                    {selectedCount > 0 ? `${selectedCount}/` : ""}{otherPeopleInGroupCount(group.memberCount)} members
                </Text>
            </View>
            <TouchableOpacity
                className={`px-3 py-1.5 rounded-md ${
                    allSelected ? "bg-[#E5E7EB]" : "bg-primary"
                }`}
                onPress={onSelectAll}
            >
                <Text className={`text-xs font-semibold ${
                    allSelected ? "text-[#1F2937]" : "text-white"
                }`}>
                    {allSelected ? "Deselect" : "Select All"}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
});

export default function ManualInviteStep({
    friends,
    onDeckFriends,
    groups,
    selectedPlayers,
    groupSize,
    onTogglePlayer,
    onSelectGroupMembers,
    onGroupMembersLoaded,
}: ManualInviteStepProps) {
    const [activeTab, setActiveTab] = useState<SourceTab>("roster");
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [groupMembersMap, setGroupMembersMap] = useState<Record<string, Friend[]>>({});
    const [loadingGroup, setLoadingGroup] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Load group members when expanding a group
    const loadGroupMembers = useCallback(async (groupId: string) => {
        if (groupMembersMap[groupId]) {
            setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
            return;
        }

        setLoadingGroup(groupId);
        try {
            const response = await rosterApi.getGroupMembers(groupId);
            if (response.success) {
                const members: (Friend & { phone?: string; rosterId?: string })[] = response.members.map((m: RosterContact) => ({
                    id: m.contact.userId || m.id,
                    rosterId: m.id,
                    firstName: m.contact.name?.split(' ')[0] || '',
                    lastName: m.contact.name?.split(' ').slice(1).join(' ') || '',
                    username: m.contact.username,
                    handicap: m.contact.handicap,
                    avatar: m.contact.avatar,
                    phone: m.contact.phone,
                    friendshipStatus: 'friend' as const,
                    friendsSince: '',
                }));
                setGroupMembersMap(prev => ({ ...prev, [groupId]: members }));
                setExpandedGroupId(groupId);
                // Notify parent about loaded members
                onGroupMembersLoaded?.(members);
            }
        } catch (e) {
            logger.error("[ManualInviteStep] Failed to load group members", e);
        } finally {
            setLoadingGroup(null);
        }
    }, [groupMembersMap, expandedGroupId, onGroupMembersLoaded]);

    // Handle select all for a group
    const handleSelectAllGroup = useCallback((groupId: string) => {
        const members = groupMembersMap[groupId];
        if (!members) {
            // Load members first, then select all
            loadGroupMembers(groupId).then(() => {
                const loadedMembers = groupMembersMap[groupId];
                if (loadedMembers) {
                    const memberIds = loadedMembers.map(m => m.id);
                    onSelectGroupMembers(memberIds);
                }
            });
            return;
        }

        const memberIds = members.map(m => m.id);
        const allSelected = memberIds.every(id => selectedPlayers.includes(id));

        if (allSelected) {
            // Deselect all
            memberIds.forEach(id => {
                if (selectedPlayers.includes(id)) {
                    onTogglePlayer(id);
                }
            });
        } else {
            // Select all (up to spots left)
            onSelectGroupMembers(memberIds);
        }
    }, [groupMembersMap, selectedPlayers, onTogglePlayer, onSelectGroupMembers, loadGroupMembers]);

    // Get count of selected members in a group
    const getGroupSelectedCount = useCallback((groupId: string) => {
        const members = groupMembersMap[groupId];
        if (!members) return 0;
        return members.filter(m => selectedPlayers.includes(m.id)).length;
    }, [groupMembersMap, selectedPlayers]);

    const handleToggle = useCallback((id: string) => {
        onTogglePlayer(id);
    }, [onTogglePlayer]);

    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    const renderPlayer = useCallback((item: Friend) => {
        const isSelected = selectedPlayers.includes(item.id);
        
        return (
            <TouchableOpacity
                key={item.id}
                style={styles.playerRow}
                onPress={() => handleToggle(item.id)}
                activeOpacity={0.7}
            >
                {/* Avatar – Figma 1269-3055 49px */}
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarInitials}>
                            {getInitials(item.firstName, item.lastName)}
                        </Text>
                    </View>
                )}

                {/* Name – Figma 1269-3055 style_OMZ48P */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.playerName, { fontFamily: 'Inter_500Medium' }]}>
                        {item.firstName} {item.lastName}
                    </Text>
                </View>

                {/* Check – Figma Primary Green circle */}
                <View style={[
                    styles.checkCircle,
                    { backgroundColor: isSelected ? COLORS.primary : 'transparent', borderColor: isSelected ? COLORS.primary : '#D1D5DB' }
                ]}>
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
            </TouchableOpacity>
        );
    }, [selectedPlayers, handleToggle]);

    const renderGroup = useCallback((item: RosterGroup) => {
        const isExpanded = expandedGroupId === item.id;
        const members = groupMembersMap[item.id] || [];
        const selectedCount = getGroupSelectedCount(item.id);
        const othersInGroup = otherPeopleInGroupCount(item.memberCount);
        const allGroupMembersSelected =
            members.length > 0 && selectedCount === members.length;

        return (
            <View key={item.id} style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                overflow: 'hidden',
            }}>
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                    }}
                    onPress={() => loadGroupMembers(item.id)}
                    activeOpacity={0.7}
                >
                    {/* Group Icon */}
                    <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: item.color + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <Text style={{
                            fontFamily: 'Inter_700Bold',
                            fontSize: 14,
                            color: item.color,
                        }}>
                            {item.name.substring(0, 2).toUpperCase()}
                        </Text>
                    </View>

                    {/* Group Name */}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 16,
                            color: '#111827',
                        }}>
                            {item.name}
                        </Text>
                        <Text style={{
                            fontFamily: 'Inter_400Regular',
                            fontSize: 13,
                            color: '#9CA3AF',
                            marginTop: 2,
                        }}>
                            {selectedCount > 0 ? `${selectedCount}/` : ""}{othersInGroup} members
                        </Text>
                    </View>

                    {/* Select All Button */}
                    <TouchableOpacity
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: allGroupMembersSelected ? '#E5E7EB' : '#22C55E',
                        }}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleSelectAllGroup(item.id);
                        }}
                    >
                        <Text style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 12,
                            color: allGroupMembersSelected ? '#111827' : '#FFFFFF',
                        }}>
                            {allGroupMembersSelected ? "Deselect" : "Select All"}
                        </Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* Loading indicator */}
                {loadingGroup === item.id && (
                    <View style={{
                        paddingVertical: 12,
                        alignItems: 'center',
                        borderTopWidth: 1,
                        borderTopColor: '#E5E7EB',
                    }}>
                        <ActivityIndicator size="small" color="#22C55E" />
                    </View>
                )}

                {/* Expanded members list */}
                {isExpanded && members.length > 0 && (
                    <View style={{
                        borderTopWidth: 1,
                        borderTopColor: '#E5E7EB',
                    }}>
                        {members.map(member => renderPlayer(member))}
                    </View>
                )}
            </View>
        );
    }, [expandedGroupId, groupMembersMap, loadingGroup, selectedPlayers, handleToggle, handleSelectAllGroup, loadGroupMembers, getGroupSelectedCount, renderPlayer]);

    const getDisplayList = () => {
        switch (activeTab) {
            case "roster":
                return friends;
            case "ondeck":
                return onDeckFriends;
            default:
                return [];
        }
    };

    const displayList = useMemo(() => {
        const list = activeTab === "roster" ? friends : activeTab === "ondeck" ? onDeckFriends : [];
        if (!searchQuery.trim()) return list;
        const q = searchQuery.trim().toLowerCase();
        return list.filter(
            (f) =>
                `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) ||
                (f.username || "").toLowerCase().includes(q)
        );
    }, [friends, onDeckFriends, activeTab, searchQuery]);

    const showSearch = activeTab !== "groups";

    return (
        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
            {/* Tabs */}
            <View style={{
                flexDirection: 'row',
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 12,
                backgroundColor: '#F3F4F6',
                gap: 8,
            }}>
                {/* Figma 430-766, 430-2240: tab pill borderRadius 6px */}
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 6,
                        backgroundColor: activeTab === "roster" ? '#22C55E' : '#FFFFFF',
                        alignItems: 'center',
                    }}
                    onPress={() => setActiveTab("roster")}
                    activeOpacity={0.7}
                >
                    <Text style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 14,
                        color: activeTab === "roster" ? '#FFFFFF' : '#6B7280',
                    }}>
                        ROSTER
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 6,
                        backgroundColor: activeTab === "ondeck" ? '#22C55E' : '#FFFFFF',
                        alignItems: 'center',
                    }}
                    onPress={() => setActiveTab("ondeck")}
                    activeOpacity={0.7}
                >
                    <Text style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 14,
                        color: activeTab === "ondeck" ? '#FFFFFF' : '#6B7280',
                    }}>
                        ON-DECK
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 6,
                        backgroundColor: activeTab === "groups" ? '#22C55E' : '#FFFFFF',
                        alignItems: 'center',
                    }}
                    onPress={() => setActiveTab("groups")}
                    activeOpacity={0.7}
                >
                    <Text style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 14,
                        color: activeTab === "groups" ? '#FFFFFF' : '#6B7280',
                    }}>
                        GROUPS
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Figma 1269-3370, 1269-3456: Your players + Search players */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{FIGMA_YOUR_PLAYERS.title}</Text>
                {selectedPlayers.length > 0 && (
                    <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>{selectedPlayers.length}</Text>
                    </View>
                )}
            </View>
            {showSearch && (
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
            )}

            {/* List */}
            <View style={{ flex: 1 }}>
                {activeTab === "groups" ? (
                    <FlashList
                        data={groups}
                        renderItem={({ item }) => renderGroup(item)}
                        // @ts-expect-error - FlashList runtime prop, types mismatch
                        estimatedItemSize={70}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
                    />
                ) : (
                    <View style={{
                        backgroundColor: '#FFFFFF',
                        flex: 1,
                    }}>
                        <FlashList
                            data={displayList}
                            renderItem={({ item }) => renderPlayer(item)}
                            // @ts-expect-error - FlashList runtime prop, types mismatch
                            estimatedItemSize={72}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    playerRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: FIGMA_YOUR_PLAYERS.rowPaddingVertical,
        paddingHorizontal: FIGMA_YOUR_PLAYERS.rowPaddingHorizontal,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: "#F3F4F6",
    },
    sectionTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 15,
        color: FIGMA_YOUR_PLAYERS.nameColor,
    },
    selectedBadge: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
    },
    selectedBadgeText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 12,
        color: "#FFFFFF",
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
        marginBottom: 12,
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
    avatar: {
        width: FIGMA_YOUR_PLAYERS.avatarSize,
        height: FIGMA_YOUR_PLAYERS.avatarSize,
        borderRadius: FIGMA_YOUR_PLAYERS.avatarSize / 2,
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
    playerName: {
        fontSize: FIGMA_YOUR_PLAYERS.nameFontSize,
        color: FIGMA_YOUR_PLAYERS.nameColor,
    },
    checkCircle: {
        width: FIGMA_YOUR_PLAYERS.checkSize,
        height: FIGMA_YOUR_PLAYERS.checkSize,
        borderRadius: FIGMA_YOUR_PLAYERS.checkSize / 2,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
    },
});
