import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Alert,
    RefreshControl,
    FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
    ArrowLeft,
    MoreHorizontal,
    MessageCircle,
    Calendar,
    UserPlus,
    MapPin,
    CheckCircle2,
    X,
    Check,
} from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { rosterApi, friendApi, teeTimeApi, Friend, RosterContact, TeeTime } from "../../services/api";

interface GroupDetailProps {
    groupId: string;
    onBack: () => void;
    onNavigateToCreateTeeTime?: (groupId: string) => void;
    onNavigateToChat?: (groupId: string) => void;
}

interface GroupData {
    id: string;
    name: string;
    color: string;
    memberCount: number;
    isOwner?: boolean;
}

// Memoized member row component
const MemberRow = memo(({ member, onMore }: { member: RosterContact; onMore: () => void }) => {
    const name = member.contact?.name || "Unknown";
    const avatar = member.contact?.avatar;
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    return (
        <View style={styles.memberRow}>
            <View style={styles.memberLeft}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                )}
                <Text style={styles.memberName}>{name}</Text>
            </View>
            <TouchableOpacity onPress={onMore}>
                <MoreHorizontal size={20} color={COLORS.textSub} />
            </TouchableOpacity>
        </View>
    );
});

// Memoized friend selection item
const FriendItem = memo(({
    friend,
    isSelected,
    onToggle
}: {
    friend: Friend;
    isSelected: boolean;
    onToggle: () => void;
}) => {
    const name = `${friend.firstName} ${friend.lastName}`;
    const initials = `${friend.firstName?.[0] || ""}${friend.lastName?.[0] || ""}`.toUpperCase();

    return (
        <TouchableOpacity style={styles.friendItem} onPress={onToggle}>
            {friend.avatar ? (
                <Image source={{ uri: friend.avatar }} style={styles.friendAvatar} />
            ) : (
                <View style={styles.friendAvatarPlaceholder}>
                    <Text style={styles.friendAvatarInitials}>{initials}</Text>
                </View>
            )}
            <Text style={styles.friendName}>{name}</Text>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
            </View>
        </TouchableOpacity>
    );
});

export default function GroupDetail({
    groupId,
    onBack,
    onNavigateToCreateTeeTime,
    onNavigateToChat
}: GroupDetailProps) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [group, setGroup] = useState<GroupData | null>(null);
    const [members, setMembers] = useState<RosterContact[]>([]);
    const [upcomingTeeTimes, setUpcomingTeeTimes] = useState<TeeTime[]>([]);

    // Add people modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [addingMembers, setAddingMembers] = useState(false);

    const loadGroupData = useCallback(async () => {
        try {
            // Load group info and members
            const [groupsRes, membersRes, teeTimesRes] = await Promise.all([
                rosterApi.getGroups(),
                rosterApi.getGroupMembers(groupId),
                teeTimeApi.getUpcoming(5),
            ]);

            if (groupsRes.success) {
                const foundGroup = groupsRes.groups.find(g => g.id === groupId);
                if (foundGroup) {
                    setGroup(foundGroup);
                }
            }

            if (membersRes.success) {
                setMembers(membersRes.members);
            }

            if (teeTimesRes.success) {
                // Filter tee times that might be related to this group
                setUpcomingTeeTimes(teeTimesRes.teeTimes.slice(0, 2));
            }
        } catch (error) {
            console.error("Failed to load group data:", error);
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        loadGroupData();
    }, [loadGroupData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadGroupData();
        setRefreshing(false);
    }, [loadGroupData]);

    const openAddPeopleModal = useCallback(async () => {
        setShowAddModal(true);
        setSelectedFriends([]);

        try {
            const res = await friendApi.getFriends();
            if (res.success) {
                // Filter out friends already in the group
                const memberUserIds = members.map(m => m.contact?.userId).filter(Boolean);
                const availableFriends = res.friends.filter(f => !memberUserIds.includes(f.id));
                setFriends(availableFriends);
            }
        } catch (error) {
            console.error("Failed to load friends:", error);
        }
    }, [members]);

    const toggleFriend = useCallback((id: string) => {
        setSelectedFriends(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    }, []);

    const handleAddMembers = useCallback(async () => {
        if (selectedFriends.length === 0) return;

        setAddingMembers(true);
        try {
            // Add each selected friend to the group
            for (const friendId of selectedFriends) {
                // First check if they're in roster, if not add them
                const rosterRes = await rosterApi.getRoster();
                const rosterEntry = rosterRes.roster.find(r => r.contact?.userId === friendId);

                if (rosterEntry) {
                    await rosterApi.updateMemberGroup(rosterEntry.id, groupId);
                }
            }

            setShowAddModal(false);
            Alert.alert("Success", `Added ${selectedFriends.length} member(s) to the group`);
            loadGroupData();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to add members");
        } finally {
            setAddingMembers(false);
        }
    }, [selectedFriends, groupId, loadGroupData]);

    const handleGroupChat = useCallback(() => {
        if (onNavigateToChat) {
            onNavigateToChat(groupId);
        } else {
            Alert.alert("Coming Soon", "Group chat feature is coming soon!");
        }
    }, [groupId, onNavigateToChat]);

    const handleAddTeeTime = useCallback(() => {
        if (onNavigateToCreateTeeTime) {
            onNavigateToCreateTeeTime(groupId);
        } else {
            Alert.alert("Coming Soon", "Navigate to create tee time with group pre-selected");
        }
    }, [groupId, onNavigateToCreateTeeTime]);

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    };

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
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <View style={{ width: 40 }} />
                <TouchableOpacity style={styles.moreButton}>
                    <MoreHorizontal size={24} color="black" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.groupInfo}>
                    <View style={[styles.groupImage, { backgroundColor: (group?.color || "#5DB075") + "30" }]}>
                        <Text style={[styles.groupImageText, { color: group?.color || "#5DB075" }]}>
                            {group?.name ? getInitials(group.name) : "GR"}
                        </Text>
                    </View>
                    <Text style={styles.groupName}>{group?.name || "Group"}</Text>

                    <View style={styles.actionButtons}>
                        <ActionButton
                            icon={MessageCircle}
                            label="Group chat"
                            onPress={handleGroupChat}
                        />
                        <ActionButton
                            icon={Calendar}
                            label="Add tee time"
                            onPress={handleAddTeeTime}
                        />
                        {group?.isOwner !== false && (
                            <ActionButton
                                icon={UserPlus}
                                label="Add people"
                                onPress={openAddPeopleModal}
                            />
                        )}
                    </View>
                </View>

                {/* Upcoming Tee Times Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming tee time</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    {upcomingTeeTimes.length > 0 ? (
                        upcomingTeeTimes.map((teeTime) => (
                            <View key={teeTime.id} style={styles.teeTimeCard}>
                                <View style={styles.teeTimeRow}>
                                    <Calendar size={18} color={COLORS.textSub} />
                                    <View style={styles.teeTimeInfo}>
                                        <Text style={styles.teeTimeTitle}>
                                            {formatDate(teeTime.teeDate)}
                                        </Text>
                                        <Text style={styles.teeTimeSub}>{teeTime.teeTime}</Text>
                                    </View>
                                </View>
                                <View style={styles.teeTimeRow}>
                                    <MapPin size={18} color={COLORS.textSub} />
                                    <View style={styles.teeTimeInfo}>
                                        <Text style={styles.teeTimeTitle}>{teeTime.courseName}</Text>
                                        {teeTime.courseLocation && (
                                            <Text style={styles.teeTimeSub}>{teeTime.courseLocation}</Text>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.attendees}>
                                    <View style={styles.avatarStack}>
                                        {(teeTime.participants || []).slice(0, 4).map((p, idx) => (
                                            <View key={p.id} style={[styles.stackedAvatar, { marginLeft: idx > 0 ? -8 : 0 }]}>
                                                {p.avatar ? (
                                                    <Image source={{ uri: p.avatar }} style={styles.smallAvatar} />
                                                ) : (
                                                    <View style={[styles.smallAvatar, styles.smallAvatarPlaceholder]}>
                                                        <Text style={styles.smallAvatarText}>
                                                            {p.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                                        </Text>
                                                    </View>
                                                )}
                                                <View style={styles.confirmedBadge}>
                                                    <CheckCircle2 size={8} color="white" />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                    {teeTime.participantCount > 4 && (
                                        <Text style={styles.othersText}>+{teeTime.participantCount - 4} others</Text>
                                    )}
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyTeeTime}>
                            <Text style={styles.emptyText}>No upcoming tee times</Text>
                            <TouchableOpacity style={styles.createTeeTimeBtn} onPress={handleAddTeeTime}>
                                <Text style={styles.createTeeTimeBtnText}>Create one now</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* People Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>People ({members.length})</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    {group?.isOwner !== false && (
                        <TouchableOpacity style={styles.addPeopleButton} onPress={openAddPeopleModal}>
                            <View style={styles.addPeopleIcon}>
                                <UserPlus size={16} color={COLORS.primary} />
                            </View>
                            <Text style={styles.addPeopleText}>Add people to group</Text>
                        </TouchableOpacity>
                    )}

                    {members.map((member) => (
                        <MemberRow
                            key={member.id}
                            member={member}
                            onMore={() => { }}
                        />
                    ))}

                    {members.length === 0 && (
                        <View style={styles.emptyMembers}>
                            <Text style={styles.emptyText}>No members yet</Text>
                            <Text style={styles.emptySubtext}>Add friends to this group</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add People Modal */}
            <Modal visible={showAddModal} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalHeaderBtn}>
                            <X size={24} color={COLORS.textMain} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Add People</Text>
                        <TouchableOpacity
                            onPress={handleAddMembers}
                            style={styles.modalHeaderBtn}
                            disabled={selectedFriends.length === 0 || addingMembers}
                        >
                            {addingMembers ? (
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : (
                                <Text style={[
                                    styles.addText,
                                    selectedFriends.length === 0 && styles.addTextDisabled
                                ]}>
                                    Add ({selectedFriends.length})
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.friendsList}>
                        {friends.length > 0 ? (
                            <FlatList
                                data={friends}
                                renderItem={({ item }) => (
                                    <FriendItem
                                        friend={item}
                                        isSelected={selectedFriends.includes(item.id)}
                                        onToggle={() => toggleFriend(item.id)}
                                    />
                                )}
                                keyExtractor={(item) => item.id}
                            />
                        ) : (
                            <View style={styles.emptyFriends}>
                                <Text style={styles.emptyText}>No friends available to add</Text>
                                <Text style={styles.emptySubtext}>
                                    All your friends are already in this group
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function ActionButton({
    icon: Icon,
    label,
    onPress
}: {
    icon: any;
    label: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
            <Icon size={20} color={COLORS.textMain} />
            <Text style={styles.actionButtonText}>{label}</Text>
        </TouchableOpacity>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 8,
        backgroundColor: COLORS.white,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: -8,
    },
    moreButton: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    groupInfo: {
        alignItems: "center",
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    groupImage: {
        width: 96,
        height: 96,
        borderRadius: 48,
        marginBottom: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    groupImageText: {
        fontSize: 32,
        fontWeight: "bold",
    },
    groupName: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 24,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
        justifyContent: "center",
    },
    actionButton: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.secondary,
        borderRadius: 12,
        width: 96,
        height: 80,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textSub,
        textAlign: "center",
        paddingHorizontal: 4,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.primary,
    },
    teeTimeCard: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    teeTimeRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    teeTimeInfo: {
        flex: 1,
    },
    teeTimeTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    teeTimeSub: {
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 2,
    },
    attendees: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#F9FAFB",
    },
    avatarStack: {
        flexDirection: "row",
    },
    stackedAvatar: {
        position: "relative",
    },
    smallAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: COLORS.white,
        backgroundColor: COLORS.divider,
    },
    smallAvatarPlaceholder: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#E5E7EB",
    },
    smallAvatarText: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    confirmedBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#10B981",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.white,
        width: 12,
        height: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    othersText: {
        fontSize: 12,
        color: COLORS.textSub,
        marginLeft: 8,
    },
    emptyTeeTime: {
        alignItems: "center",
        paddingVertical: 24,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
    },
    emptySubtext: {
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 4,
    },
    createTeeTimeBtn: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    createTeeTimeBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
    },
    addPeopleButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        marginBottom: 8,
    },
    addPeopleIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    addPeopleText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.primary,
    },
    memberRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    memberLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.divider,
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
    memberName: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    emptyMembers: {
        alignItems: "center",
        paddingVertical: 24,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingTop: 50,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    modalHeaderBtn: {
        width: 80,
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    addText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
    },
    addTextDisabled: {
        color: COLORS.textSub,
    },
    friendsList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    friendItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    friendAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    friendAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    friendAvatarInitials: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    friendName: {
        flex: 1,
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textMain,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    emptyFriends: {
        alignItems: "center",
        paddingVertical: 40,
    },
});
