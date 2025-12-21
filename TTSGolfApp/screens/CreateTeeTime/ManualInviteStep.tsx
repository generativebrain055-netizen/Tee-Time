import React, { useState, useCallback, useEffect, memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Check, Users, Clock, UserPlus } from "lucide-react-native";
import { COLORS } from "./constants";
import { Friend, RosterGroup, RosterContact, rosterApi } from "../../services/api";

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
            style={[
                styles.playerItem,
                isSelected && styles.playerItemSelected,
                !canSelect && styles.playerItemDisabled,
            ]}
            onPress={onToggle}
            disabled={!canSelect}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {player.avatar ? (
                    <Image source={{ uri: player.avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>
                            {getInitials(player.firstName, player.lastName)}
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                    {player.firstName} {player.lastName}
                </Text>
                <Text style={styles.playerSub}>
                    {player.handicap !== undefined
                        ? `HCP ${player.handicap}`
                        : player.homeCourse || "Golf buddy"}
                </Text>
            </View>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
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
            style={styles.groupCard}
            onPress={onViewMembers}
            activeOpacity={0.7}
        >
            <View style={[styles.groupIcon, { backgroundColor: group.color + "20" }]}>
                <Text style={[styles.groupInitials, { color: group.color }]}>
                    {group.name.substring(0, 2).toUpperCase()}
                </Text>
            </View>
            <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMemberCount}>
                    {selectedCount > 0 ? `${selectedCount}/` : ""}{group.memberCount} members
                </Text>
            </View>
            <TouchableOpacity
                style={[styles.selectAllBtn, allSelected && styles.selectAllBtnActive]}
                onPress={onSelectAll}
            >
                <Text style={[styles.selectAllText, allSelected && styles.selectAllTextActive]}>
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

    const spotsLeft = groupSize - 1 - selectedPlayers.length;

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
            console.log("Failed to load group members:", e);
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
        const isSelected = selectedPlayers.includes(id);
        if (isSelected || spotsLeft > 0) {
            onTogglePlayer(id);
        }
    }, [selectedPlayers, spotsLeft, onTogglePlayer]);

    const renderPlayer = useCallback(({ item }: { item: Friend }) => {
        const isSelected = selectedPlayers.includes(item.id);
        const canSelect = isSelected || spotsLeft > 0;
        return (
            <PlayerItem
                player={item}
                isSelected={isSelected}
                canSelect={canSelect}
                onToggle={() => handleToggle(item.id)}
            />
        );
    }, [selectedPlayers, spotsLeft, handleToggle]);

    const renderGroup = useCallback(({ item }: { item: RosterGroup }) => {
        const isExpanded = expandedGroupId === item.id;
        const members = groupMembersMap[item.id] || [];
        const selectedCount = getGroupSelectedCount(item.id);

        return (
            <View>
                <GroupItem
                    group={item}
                    selectedCount={selectedCount}
                    totalCount={item.memberCount}
                    onSelectAll={() => handleSelectAllGroup(item.id)}
                    onViewMembers={() => loadGroupMembers(item.id)}
                    isExpanded={isExpanded}
                />
                {loadingGroup === item.id && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                )}
                {isExpanded && members.length > 0 && (
                    <View style={styles.groupMembersList}>
                        {members.map(member => {
                            const isSelected = selectedPlayers.includes(member.id);
                            const canSelect = isSelected || spotsLeft > 0;
                            return (
                                <PlayerItem
                                    key={member.id}
                                    player={member}
                                    isSelected={isSelected}
                                    canSelect={canSelect}
                                    onToggle={() => handleToggle(member.id)}
                                />
                            );
                        })}
                    </View>
                )}
            </View>
        );
    }, [expandedGroupId, groupMembersMap, loadingGroup, selectedPlayers, spotsLeft, handleToggle, handleSelectAllGroup, loadGroupMembers, getGroupSelectedCount]);

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

    const displayList = getDisplayList();

    return (
        <View style={styles.content}>
            <Text style={styles.stepTitle}>Select Players</Text>
            <Text style={styles.subtitle}>
                {selectedPlayers.length}/{groupSize - 1} selected • {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
            </Text>

            {/* Source Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "roster" && styles.tabActive]}
                    onPress={() => setActiveTab("roster")}
                >
                    <Users size={16} color={activeTab === "roster" ? COLORS.primary : COLORS.textSub} />
                    <Text style={[styles.tabText, activeTab === "roster" && styles.tabTextActive]}>
                        Roster ({friends.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "ondeck" && styles.tabActive]}
                    onPress={() => setActiveTab("ondeck")}
                >
                    <Clock size={16} color={activeTab === "ondeck" ? COLORS.primary : COLORS.textSub} />
                    <Text style={[styles.tabText, activeTab === "ondeck" && styles.tabTextActive]}>
                        On Deck ({onDeckFriends.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "groups" && styles.tabActive]}
                    onPress={() => setActiveTab("groups")}
                >
                    <UserPlus size={16} color={activeTab === "groups" ? COLORS.primary : COLORS.textSub} />
                    <Text style={[styles.tabText, activeTab === "groups" && styles.tabTextActive]}>
                        Groups ({groups.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                {activeTab === "groups" ? (
                    groups.length > 0 ? (
                        <FlashList
                            data={groups}
                            renderItem={renderGroup}
                            estimatedItemSize={70}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>No groups yet</Text>
                            <Text style={styles.emptyText}>Create groups in the Roster tab</Text>
                        </View>
                    )
                ) : displayList.length > 0 ? (
                    <FlashList
                        data={displayList}
                        renderItem={renderPlayer}
                        estimatedItemSize={72}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>
                            {activeTab === "roster" ? "No friends in roster" : "No players on deck"}
                        </Text>
                        <Text style={styles.emptyText}>
                            Add friends from the Availability screen
                        </Text>
                    </View>
                )}
            </View>
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
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 4,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        marginBottom: 20,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#F3F4F6",
        borderRadius: 10,
        padding: 4,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 8,
        gap: 4,
    },
    tabActive: {
        backgroundColor: COLORS.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.textSub,
    },
    tabTextActive: {
        color: COLORS.primary,
        fontWeight: "600",
    },
    listContainer: {
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
    playerItemDisabled: {
        opacity: 0.5,
    },
    avatarContainer: {
        marginRight: 12,
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
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontSize: 15,
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
    groupCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        marginBottom: 8,
    },
    groupIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    groupInitials: {
        fontSize: 14,
        fontWeight: "bold",
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
    },
    groupMemberCount: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    selectAllBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    selectAllBtnActive: {
        backgroundColor: "#E5E7EB",
    },
    selectAllText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.white,
    },
    selectAllTextActive: {
        color: COLORS.text,
    },
    loadingContainer: {
        padding: 12,
        alignItems: "center",
    },
    groupMembersList: {
        marginLeft: 20,
        marginBottom: 8,
        borderLeftWidth: 2,
        borderLeftColor: "#E5E7EB",
        paddingLeft: 12,
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
