/**
 * FCFS Invite Step (Figma 430-* FCFS Invites)
 * Allows selecting roster or group, selecting players, and setting deadline
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Switch,
    Platform,
    Modal,
    TouchableWithoutFeedback,
    TextInput,
    StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Users, UserCheck, Check, Clock, Calendar, Search } from "lucide-react-native";
import { COLORS, FIGMA_YOUR_PLAYERS } from "./constants";
import { Friend, RosterGroup, rosterApi, RosterContact } from "../../services/api";
import logger from "../../utils/logger";
import { otherPeopleInGroupCount } from "../../utils/groupMemberCount";
import { useAuthStore } from "../../stores";

type TargetType = "roster" | "group";
type PickerMode = "date" | "time" | null;

interface FCFSInviteStepProps {
    friends: Friend[];
    groups: RosterGroup[];
    targetType: TargetType;
    selectedGroupId: string | null;
    onTargetTypeChange: (type: TargetType) => void;
    onGroupSelect: (groupId: string | null) => void;
    deadline: Date | null;
    onDeadlineChange: (deadline: Date | null) => void;
    selectedPlayers: string[];
    onTogglePlayer: (id: string) => void;
    onSelectAllPlayers?: () => void;
    onDeselectAllPlayers?: () => void;
    groupMembers?: Friend[];
}

export default function FCFSInviteStep({
    friends,
    groups,
    targetType,
    selectedGroupId,
    onTargetTypeChange,
    onGroupSelect,
    deadline,
    onDeadlineChange,
    selectedPlayers,
    onTogglePlayer,
    onSelectAllPlayers,
    onDeselectAllPlayers,
    groupMembers = [],
}: FCFSInviteStepProps) {
    const currentUserId = useAuthStore((s) => s.user?.id);
    const [hasDeadline, setHasDeadline] = useState(deadline !== null);
    const [pickerMode, setPickerMode] = useState<PickerMode>(null);
    const [tempDate, setTempDate] = useState<Date>(deadline || getDefaultDeadline());
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [groupMembersMap, setGroupMembersMap] = useState<Record<string, Friend[]>>({});
    const [loadingGroup, setLoadingGroup] = useState<string | null>(null);

    function getDefaultDeadline(): Date {
        const d = new Date();
        d.setHours(d.getHours() + 24); // Default: 24 hours from now
        return d;
    }

    // Get current player list based on target type
    const currentPlayerList = useMemo(() => {
        if (targetType === "roster") {
            return friends;
        } else if (targetType === "group" && selectedGroupId) {
            return groupMembers.length > 0 ? groupMembers : (groupMembersMap[selectedGroupId] || []);
        }
        return [];
    }, [targetType, friends, selectedGroupId, groupMembers, groupMembersMap]);

    // Filtered player list based on search
    const filteredPlayers = useMemo(() => {
        if (!searchQuery.trim()) return currentPlayerList;
        const q = searchQuery.trim().toLowerCase();
        return currentPlayerList.filter(
            (p) =>
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
                (p.username || "").toLowerCase().includes(q)
        );
    }, [currentPlayerList, searchQuery]);

    const loadGroupMembers = useCallback(async (groupId: string) => {
        // Check if already loaded in groupMembers prop or local map
        if (groupMembersMap[groupId] || (targetType === "group" && selectedGroupId === groupId && groupMembers.length > 0)) {
            return;
        }
        
        setLoadingGroup(groupId);
        try {
            const response = await rosterApi.getGroupMembers(groupId);
            if (response.success) {
                const myId = currentUserId;
                const members: Friend[] = response.members
                    .filter(
                        (m: RosterContact) =>
                            !myId ||
                            !m.contact?.userId ||
                            String(m.contact.userId) !== String(myId)
                    )
                    .map((m: RosterContact) => {
                        const nameParts = (m.contact?.name ?? "").split(" ");
                        return {
                            id: m.id,
                            firstName: nameParts[0] || "",
                            lastName: nameParts.slice(1).join(" ") || "",
                            username: m.contact?.username,
                            handicap: m.contact?.handicap,
                            avatar: m.contact?.avatar,
                            friendshipStatus: "friend" as const,
                            friendsSince: "",
                            contactUserId: m.contact?.userId,
                        } as Friend & { contactUserId?: string };
                    });
                setGroupMembersMap(prev => ({ ...prev, [groupId]: members }));
            }
        } catch (e) {
            logger.error("Failed to load group members:", e);
        } finally {
            setLoadingGroup(null);
        }
    }, [groupMembersMap, targetType, selectedGroupId, groupMembers, currentUserId]);

    // Load group members when group is selected
    useEffect(() => {
        if (targetType === "group" && selectedGroupId && !groupMembersMap[selectedGroupId] && groupMembers.length === 0) {
            loadGroupMembers(selectedGroupId);
        }
    }, [targetType, selectedGroupId, loadGroupMembers, groupMembersMap, groupMembers]);

    const handleToggleDeadline = (value: boolean) => {
        setHasDeadline(value);
        if (value) {
            const defaultDeadline = getDefaultDeadline();
            setTempDate(defaultDeadline);
            onDeadlineChange(defaultDeadline);
        } else {
            onDeadlineChange(null);
        }
    };

    const openDatePicker = () => {
        setPickerMode("date");
    };

    const openTimePicker = () => {
        setPickerMode("time");
    };

    const closePicker = () => {
        setPickerMode(null);
    };

    const handleDateTimeChange = (event: any, selectedValue?: Date) => {
        if (Platform.OS === "android") {
            setPickerMode(null);
            if (event.type === "dismissed") return;
        }

        if (selectedValue) {
            const newDate = new Date(tempDate);
            if (pickerMode === "date") {
                newDate.setFullYear(selectedValue.getFullYear());
                newDate.setMonth(selectedValue.getMonth());
                newDate.setDate(selectedValue.getDate());
            } else if (pickerMode === "time") {
                newDate.setHours(selectedValue.getHours());
                newDate.setMinutes(selectedValue.getMinutes());
            }
            setTempDate(newDate);
            onDeadlineChange(newDate);
        }
    };

    const handleIOSConfirm = () => {
        onDeadlineChange(tempDate);
        setPickerMode(null);
    };

    const formatDeadlineDate = (date: Date): string => {
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    };

    const formatDeadlineTime = (date: Date): string => {
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    const renderPlayer = useCallback((item: Friend) => {
        const isSelected = selectedPlayers.includes(item.id);
        
        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.playerRow, isSelected && styles.playerRowSelected]}
                onPress={() => onTogglePlayer(item.id)}
                activeOpacity={0.7}
            >
                {/* Avatar */}
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarInitials}>
                            {getInitials(item.firstName, item.lastName)}
                        </Text>
                    </View>
                )}

                {/* Name */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.playerName}>
                        {item.firstName} {item.lastName}
                    </Text>
                    {item.handicap !== undefined && (
                        <Text style={styles.playerSubtext}>
                            HCP {item.handicap}
                        </Text>
                    )}
                </View>

                {/* Check */}
                <View style={[
                    styles.checkCircle,
                    isSelected && styles.checkCircleSelected
                ]}>
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
            </TouchableOpacity>
        );
    }, [selectedPlayers, onTogglePlayer]);

    const renderPicker = () => {
        if (!pickerMode) return null;

        if (Platform.OS === "android") {
            return (
                <DateTimePicker
                    value={tempDate}
                    mode={pickerMode}
                    display="default"
                    onChange={handleDateTimeChange}
                    minimumDate={pickerMode === "date" ? new Date() : undefined}
                />
            );
        }

        // iOS - show in modal
        return (
            <Modal
                visible={true}
                transparent
                animationType="slide"
                onRequestClose={closePicker}
            >
                <TouchableWithoutFeedback onPress={closePicker}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity onPress={closePicker}>
                                        <Text style={styles.modalCancel}>Cancel</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>
                                        {pickerMode === "date" ? "Select Date" : "Select Time"}
                                    </Text>
                                    <TouchableOpacity onPress={handleIOSConfirm}>
                                        <Text style={styles.modalDone}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempDate}
                                    mode={pickerMode}
                                    display="spinner"
                                    onChange={handleDateTimeChange}
                                    minimumDate={pickerMode === "date" ? new Date() : undefined}
                                    style={{ height: 200 }}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        );
    };

    const allSelected = currentPlayerList.length > 0 && 
        currentPlayerList.every(p => selectedPlayers.includes(p.id));
    const someSelected = selectedPlayers.length > 0;

    return (
        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
            <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Send to roster card */}
                <TouchableOpacity
                    style={[
                        styles.targetCard,
                        targetType === 'roster' && styles.targetCardSelected
                    ]}
                    onPress={() => onTargetTypeChange("roster")}
                    activeOpacity={0.7}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={[styles.targetIcon, { backgroundColor: '#DCFCE7' }]}>
                            <Users size={24} color="#22C55E" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.targetTitle}>
                                Send to roster
                            </Text>
                            <Text style={styles.targetDescription}>
                                Invite your full roster. Everyone gets the alert.
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Send to a group card */}
                <View style={[
                    styles.targetCard,
                    targetType === 'group' && styles.targetCardSelected,
                    { marginBottom: 24 }
                ]}>
                    <TouchableOpacity
                        style={{ padding: 20 }}
                        onPress={() => onTargetTypeChange("group")}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <View style={[styles.targetIcon, { backgroundColor: '#DCFCE7' }]}>
                                <UserCheck size={24} color="#22C55E" strokeWidth={2} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.targetTitle}>
                                    Send to a group
                                </Text>
                                <Text style={styles.targetDescription}>
                                    Invite members of one group. Everyone gets the alert.
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Group Selection */}
                    {targetType === "group" && (
                        <View>
                            <View style={styles.separator} />
                            <View style={{ padding: 20, paddingTop: 16 }}>
                                {groups.map((group, index) => {
                                    const isSelected = selectedGroupId === group.id;
                                    return (
                                        <TouchableOpacity
                                            key={group.id}
                                            style={[
                                                styles.groupItem,
                                                isSelected && styles.groupItemSelected,
                                                index < groups.length - 1 && { marginBottom: 8 }
                                            ]}
                                            onPress={() => onGroupSelect(group.id)}
                                            activeOpacity={0.7}
                                        >
                                            {isSelected ? (
                                                <View style={styles.groupCheck}>
                                                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                                </View>
                                            ) : (
                                                <View style={styles.groupCheckEmpty} />
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.groupName}>
                                                    {group.name}
                                                </Text>
                                                <Text style={styles.groupMemberCount}>
                                                    {otherPeopleInGroupCount(group.memberCount)} members
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                                {groups.length === 0 && (
                                    <View style={styles.emptyGroups}>
                                        <Text style={styles.emptyGroupsTitle}>
                                            No groups created yet
                                        </Text>
                                        <Text style={styles.emptyGroupsSubtitle}>
                                            Create groups in the Roster section
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* Player Selection Section - Only show if roster/group is selected */}
                {(targetType === "roster" || (targetType === "group" && selectedGroupId)) && currentPlayerList.length > 0 && (
                    <View style={styles.playerSection}>
                        {/* Section Header */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Select Players</Text>
                            {selectedPlayers.length > 0 && (
                                <View style={styles.selectedBadge}>
                                    <Text style={styles.selectedBadgeText}>{selectedPlayers.length}</Text>
                                </View>
                            )}
                        </View>

                        {/* Select All / Deselect All */}
                        {currentPlayerList.length > 0 && (onSelectAllPlayers || onDeselectAllPlayers) && (
                            <View style={styles.selectAllRow}>
                                <TouchableOpacity
                                    style={styles.selectAllButton}
                                    onPress={() => {
                                        if (allSelected && onDeselectAllPlayers) {
                                            onDeselectAllPlayers();
                                        } else if (!allSelected && onSelectAllPlayers) {
                                            onSelectAllPlayers();
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.selectAllText}>
                                        {allSelected ? "Deselect All" : "Select All"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Search */}
                        <View style={styles.searchWrap}>
                            <Search size={18} color="#9CA3AF" strokeWidth={2} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search players"
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {/* Player List */}
                        <View style={styles.playerListContainer}>
                            {filteredPlayers.length > 0 ? (
                                filteredPlayers.map((player) => renderPlayer(player))
                            ) : (
                                <View style={styles.emptyPlayers}>
                                    <Text style={styles.emptyPlayersText}>
                                        {searchQuery ? "No players found" : "No players available"}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Response Deadline */}
                <View style={styles.deadlineCard}>
                    <View style={styles.deadlineHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Clock size={20} color="#22C55E" strokeWidth={2} style={{ marginRight: 12 }} />
                            <Text style={styles.deadlineTitle}>
                                Set Response Deadline
                            </Text>
                        </View>
                        <Switch
                            value={hasDeadline}
                            onValueChange={handleToggleDeadline}
                            trackColor={{ false: "#E5E7EB", true: "#86EFAC" }}
                            thumbColor={hasDeadline ? "#22C55E" : "#9CA3AF"}
                        />
                    </View>
                    {hasDeadline && (
                        <View>
                            <Text style={styles.deadlineDescription}>
                                Invites will expire at this time. Unresponded invites will be cancelled.
                            </Text>

                            {/* Quick Presets */}
                            <View style={styles.presetRow}>
                                {[
                                    { label: "2 min", minutes: 2 },
                                    { label: "5 min", minutes: 5 },
                                    { label: "1 hr", hours: 1 },
                                    { label: "24 hr", hours: 24 },
                                ].map((preset) => (
                                    <TouchableOpacity
                                        key={preset.label}
                                        style={styles.presetButton}
                                        onPress={() => {
                                            const d = new Date();
                                            if (preset.minutes) {
                                                d.setMinutes(d.getMinutes() + preset.minutes);
                                            } else if (preset.hours) {
                                                d.setHours(d.getHours() + preset.hours);
                                            }
                                            setTempDate(d);
                                            onDeadlineChange(d);
                                        }}
                                    >
                                        <Text style={styles.presetText}>{preset.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Date/Time Pickers */}
                            <View style={styles.pickerRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.pickerButton,
                                        pickerMode === "date" && styles.pickerButtonActive
                                    ]}
                                    onPress={openDatePicker}
                                >
                                    <Calendar size={18} color={pickerMode === "date" ? "#22C55E" : "#6B7280"} strokeWidth={2} />
                                    <Text style={[
                                        styles.pickerText,
                                        pickerMode === "date" && styles.pickerTextActive
                                    ]}>
                                        {formatDeadlineDate(tempDate)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.pickerButton,
                                        pickerMode === "time" && styles.pickerButtonActive
                                    ]}
                                    onPress={openTimePicker}
                                >
                                    <Clock size={18} color={pickerMode === "time" ? "#22C55E" : "#6B7280"} strokeWidth={2} />
                                    <Text style={[
                                        styles.pickerText,
                                        pickerMode === "time" && styles.pickerTextActive
                                    ]}>
                                        {formatDeadlineTime(tempDate)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Date/Time Picker Modal */}
                {renderPicker()}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    targetCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    targetCardSelected: {
        borderWidth: 2,
        borderColor: '#22C55E',
    },
    targetIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    targetTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 17,
        color: '#111827',
        marginBottom: 6,
    },
    targetDescription: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 20,
    },
    groupItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupItemSelected: {
        backgroundColor: '#F0FDF4',
        borderWidth: 2,
        borderColor: '#22C55E',
    },
    groupCheck: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#22C55E',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    groupCheckEmpty: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        marginRight: 12,
    },
    groupName: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: '#111827',
        marginBottom: 2,
    },
    groupMemberCount: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: '#9CA3AF',
    },
    emptyGroups: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyGroupsTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15,
        color: '#111827',
        marginBottom: 6,
    },
    emptyGroupsSubtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
    },
    playerSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontFamily: 'Inter_600SemiBold',
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
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        color: '#FFFFFF',
    },
    selectAllRow: {
        marginBottom: 12,
    },
    selectAllButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    selectAllText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        color: COLORS.primary,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: FIGMA_YOUR_PLAYERS.inputBorderRadius,
        borderWidth: 1,
        borderColor: FIGMA_YOUR_PLAYERS.inputBorderColor,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        color: '#111827',
        padding: 0,
    },
    playerListContainer: {
        maxHeight: 300,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: FIGMA_YOUR_PLAYERS.rowPaddingVertical,
        paddingHorizontal: FIGMA_YOUR_PLAYERS.rowPaddingHorizontal,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    playerRowSelected: {
        backgroundColor: '#F0FDF4',
        borderColor: '#22C55E',
    },
    avatar: {
        width: FIGMA_YOUR_PLAYERS.avatarSize,
        height: FIGMA_YOUR_PLAYERS.avatarSize,
        borderRadius: FIGMA_YOUR_PLAYERS.avatarSize / 2,
    },
    avatarPlaceholder: {
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15,
        color: '#FFFFFF',
    },
    playerName: {
        fontFamily: 'Inter_500Medium',
        fontSize: FIGMA_YOUR_PLAYERS.nameFontSize,
        color: FIGMA_YOUR_PLAYERS.nameColor,
    },
    playerSubtext: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 2,
    },
    checkCircle: {
        width: FIGMA_YOUR_PLAYERS.checkSize,
        height: FIGMA_YOUR_PLAYERS.checkSize,
        borderRadius: FIGMA_YOUR_PLAYERS.checkSize / 2,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkCircleSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    emptyPlayers: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyPlayersText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: '#9CA3AF',
    },
    deadlineCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
    },
    deadlineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    deadlineTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: '#111827',
    },
    deadlineDescription: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: '#9CA3AF',
        marginBottom: 12,
    },
    presetRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    presetButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#E0F2FE',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#7DD3FC',
    },
    presetText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        color: '#0284C7',
    },
    pickerRow: {
        flexDirection: 'row',
        gap: 10,
    },
    pickerButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    pickerButtonActive: {
        backgroundColor: '#F0FDF4',
        borderColor: '#22C55E',
    },
    pickerText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: '#111827',
    },
    pickerTextActive: {
        color: '#22C55E',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalCancel: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    modalTitle: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#1F2937',
    },
    modalDone: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.primary,
    },
});
