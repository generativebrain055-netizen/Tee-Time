import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Switch,
    Platform,
    Modal,
    TouchableWithoutFeedback,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Users, UserCheck, Check, Clock, Calendar } from "lucide-react-native";
import { COLORS } from "./constants";
import { Friend, RosterGroup } from "../../services/api";

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
}: FCFSInviteStepProps) {
    const [hasDeadline, setHasDeadline] = useState(deadline !== null);
    const [pickerMode, setPickerMode] = useState<PickerMode>(null);
    const [tempDate, setTempDate] = useState<Date>(deadline || getDefaultDeadline());

    function getDefaultDeadline(): Date {
        const d = new Date();
        d.setHours(d.getHours() + 24); // Default: 24 hours from now
        return d;
    }

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
            // Android closes automatically on selection or cancel
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

    // Render picker based on platform
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
                            <View style={styles.pickerModal}>
                                <View style={styles.pickerHeader}>
                                    <TouchableOpacity onPress={closePicker}>
                                        <Text style={styles.pickerCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.pickerTitle}>
                                        {pickerMode === "date" ? "Select Date" : "Select Time"}
                                    </Text>
                                    <TouchableOpacity onPress={handleIOSConfirm}>
                                        <Text style={styles.pickerDoneText}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempDate}
                                    mode={pickerMode}
                                    display="spinner"
                                    onChange={handleDateTimeChange}
                                    minimumDate={pickerMode === "date" ? new Date() : undefined}
                                    style={styles.iosPicker}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        );
    };

    return (
        <View style={styles.content}>
            <Text style={styles.stepTitle}>First Come First Serve</Text>
            <Text style={styles.subtitle}>
                All selected players will be notified. First to accept get the spots!
            </Text>

            {/* Target Type Selection */}
            <View style={styles.targetTypeContainer}>
                <TouchableOpacity
                    style={[styles.targetTypeBtn, targetType === "roster" && styles.targetTypeBtnActive]}
                    onPress={() => onTargetTypeChange("roster")}
                >
                    <Users size={20} color={targetType === "roster" ? COLORS.white : COLORS.text} />
                    <Text style={[styles.targetTypeText, targetType === "roster" && styles.targetTypeTextActive]}>
                        Entire Roster
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.targetTypeBtn, targetType === "group" && styles.targetTypeBtnActive]}
                    onPress={() => onTargetTypeChange("group")}
                >
                    <UserCheck size={20} color={targetType === "group" ? COLORS.white : COLORS.text} />
                    <Text style={[styles.targetTypeText, targetType === "group" && styles.targetTypeTextActive]}>
                        Select Group
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Group Selection */}
            {targetType === "group" && (
                <View style={styles.groupSection}>
                    <Text style={styles.sectionLabel}>Select a group</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                        {groups.map((group) => (
                            <TouchableOpacity
                                key={group.id}
                                style={[
                                    styles.groupChip,
                                    selectedGroupId === group.id && styles.groupChipSelected,
                                    { borderColor: group.color },
                                ]}
                                onPress={() => onGroupSelect(group.id)}
                            >
                                <View style={[styles.groupDot, { backgroundColor: group.color }]} />
                                <Text style={[
                                    styles.groupChipText,
                                    selectedGroupId === group.id && styles.groupChipTextSelected
                                ]}>
                                    {group.name}
                                </Text>
                                <Text style={styles.groupCount}>({group.memberCount})</Text>
                            </TouchableOpacity>
                        ))}
                        {groups.length === 0 && (
                            <Text style={styles.noGroupsText}>No groups created yet</Text>
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Response Deadline */}
            <View style={styles.deadlineSection}>
                <View style={styles.deadlineHeader}>
                    <View style={styles.deadlineHeaderLeft}>
                        <Clock size={20} color={COLORS.primary} />
                        <Text style={styles.deadlineTitle}>Set Response Deadline</Text>
                    </View>
                    <Switch
                        value={hasDeadline}
                        onValueChange={handleToggleDeadline}
                        trackColor={{ false: "#E5E7EB", true: "#86EFAC" }}
                        thumbColor={hasDeadline ? COLORS.primary : "#9CA3AF"}
                    />
                </View>
                {hasDeadline && (
                    <View style={styles.deadlineContent}>
                        <Text style={styles.deadlineHint}>
                            Invites will expire at this time. Unresponded invites will be cancelled.
                        </Text>

                        {/* Quick Test Presets */}
                        <View style={styles.quickPresets}>
                            <TouchableOpacity
                                style={styles.quickPresetBtn}
                                onPress={() => {
                                    const d = new Date();
                                    d.setMinutes(d.getMinutes() + 2);
                                    setTempDate(d);
                                    onDeadlineChange(d);
                                }}
                            >
                                <Text style={styles.quickPresetText}>2 min</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickPresetBtn}
                                onPress={() => {
                                    const d = new Date();
                                    d.setMinutes(d.getMinutes() + 5);
                                    setTempDate(d);
                                    onDeadlineChange(d);
                                }}
                            >
                                <Text style={styles.quickPresetText}>5 min</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickPresetBtn}
                                onPress={() => {
                                    const d = new Date();
                                    d.setHours(d.getHours() + 1);
                                    setTempDate(d);
                                    onDeadlineChange(d);
                                }}
                            >
                                <Text style={styles.quickPresetText}>1 hr</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickPresetBtn}
                                onPress={() => {
                                    const d = new Date();
                                    d.setHours(d.getHours() + 24);
                                    setTempDate(d);
                                    onDeadlineChange(d);
                                }}
                            >
                                <Text style={styles.quickPresetText}>24 hr</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.deadlinePickers}>
                            <TouchableOpacity
                                style={[styles.deadlinePickerBtn, pickerMode === "date" && styles.deadlinePickerBtnActive]}
                                onPress={openDatePicker}
                            >
                                <Calendar size={18} color={pickerMode === "date" ? COLORS.primary : COLORS.text} />
                                <Text style={[styles.deadlinePickerText, pickerMode === "date" && styles.deadlinePickerTextActive]}>
                                    {formatDeadlineDate(tempDate)}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.deadlinePickerBtn, pickerMode === "time" && styles.deadlinePickerBtnActive]}
                                onPress={openTimePicker}
                            >
                                <Clock size={18} color={pickerMode === "time" ? COLORS.primary : COLORS.text} />
                                <Text style={[styles.deadlinePickerText, pickerMode === "time" && styles.deadlinePickerTextActive]}>
                                    {formatDeadlineTime(tempDate)}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Date/Time Picker */}
            {renderPicker()}

            {/* Preview of who will receive */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                {targetType === "roster" ? "Roster members" : "Group members"} ({friends.length})
            </Text>
            <Text style={styles.sectionHint}>
                All players below will receive the invite simultaneously
            </Text>

            <ScrollView style={styles.playerList} showsVerticalScrollIndicator={false}>
                {friends.map((friend) => (
                    <View key={friend.id} style={styles.playerItem}>
                        <View style={styles.avatarContainer}>
                            {friend.avatar ? (
                                <Image source={{ uri: friend.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>
                                        {getInitials(friend.firstName, friend.lastName)}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.playerInfo}>
                            <Text style={styles.playerName}>
                                {friend.firstName} {friend.lastName}
                            </Text>
                            {friend.handicap !== undefined && (
                                <Text style={styles.playerSub}>HCP {friend.handicap}</Text>
                            )}
                        </View>
                        <View style={styles.willReceive}>
                            <Check size={16} color={COLORS.primary} />
                        </View>
                    </View>
                ))}
                {friends.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>
                            {targetType === "roster" ? "No friends in roster" : "Select a group"}
                        </Text>
                        <Text style={styles.emptyText}>
                            {targetType === "roster"
                                ? "Add friends from Availability first"
                                : "Choose a group above to see members"}
                        </Text>
                    </View>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
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
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        marginBottom: 24,
    },
    targetTypeContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
    },
    targetTypeBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
        gap: 8,
    },
    targetTypeBtnActive: {
        backgroundColor: COLORS.primary,
    },
    targetTypeText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
    },
    targetTypeTextActive: {
        color: COLORS.white,
    },
    groupSection: {
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 8,
    },
    sectionHint: {
        fontSize: 13,
        color: COLORS.textSub,
        marginBottom: 12,
    },
    groupScroll: {
        flexGrow: 0,
    },
    groupChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 2,
        marginRight: 10,
        backgroundColor: COLORS.white,
    },
    groupChipSelected: {
        backgroundColor: "#F0FDF4",
    },
    groupDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    groupChipText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.text,
    },
    groupChipTextSelected: {
        fontWeight: "600",
    },
    groupCount: {
        fontSize: 12,
        color: COLORS.textSub,
        marginLeft: 4,
    },
    noGroupsText: {
        fontSize: 14,
        color: COLORS.textSub,
        fontStyle: "italic",
    },
    deadlineSection: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    deadlineHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    deadlineHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    deadlineTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
    },
    deadlineContent: {
        marginTop: 12,
    },
    deadlineHint: {
        fontSize: 13,
        color: COLORS.textSub,
        marginBottom: 12,
    },
    quickPresets: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    quickPresetBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#E0F2FE",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#7DD3FC",
    },
    quickPresetText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#0284C7",
    },
    deadlinePickers: {
        flexDirection: "row",
        gap: 10,
    },
    deadlinePickerBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: COLORS.white,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    deadlinePickerBtnActive: {
        borderColor: COLORS.primary,
        backgroundColor: "#F0FDF4",
    },
    deadlinePickerText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.text,
    },
    deadlinePickerTextActive: {
        color: COLORS.primary,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    pickerModal: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
    },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    pickerCancelText: {
        fontSize: 16,
        color: COLORS.textSub,
    },
    pickerDoneText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
    },
    iosPicker: {
        height: 200,
    },
    playerList: {
        flex: 1,
    },
    playerItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        marginBottom: 8,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        fontSize: 14,
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
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 2,
    },
    willReceive: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#DCFCE7",
        justifyContent: "center",
        alignItems: "center",
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
    },
});
