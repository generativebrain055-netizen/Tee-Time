import React, { useState } from "react";
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
                    <View className="flex-1 bg-black/50 justify-end">
                        <TouchableWithoutFeedback>
                            <View className="bg-white rounded-t-[20px] pb-[34px]">
                                <View className="flex-row justify-between items-center px-4 py-3.5 border-b border-border">
                                    <TouchableOpacity onPress={closePicker}>
                                        <Text className="text-base text-[#9CA3AF]">Cancel</Text>
                                    </TouchableOpacity>
                                    <Text className="text-base font-semibold text-[#1F2937]">
                                        {pickerMode === "date" ? "Select Date" : "Select Time"}
                                    </Text>
                                    <TouchableOpacity onPress={handleIOSConfirm}>
                                        <Text className="text-base font-semibold text-primary">Done</Text>
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

    return (
        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
            <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Send to roster card */}
                <TouchableOpacity
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        padding: 20,
                        marginBottom: 16,
                        borderWidth: targetType === 'roster' ? 2 : 1,
                        borderColor: targetType === 'roster' ? '#22C55E' : '#E5E7EB',
                    }}
                    onPress={() => onTargetTypeChange("roster")}
                    activeOpacity={0.7}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: '#DCFCE7',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 16,
                        }}>
                            <Users size={24} color="#22C55E" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 17,
                                color: '#111827',
                                marginBottom: 6,
                            }}>
                                Send to roster
                            </Text>
                            <Text style={{
                                fontFamily: 'Inter_400Regular',
                                fontSize: 14,
                                color: '#6B7280',
                                lineHeight: 20,
                            }}>
                                Invite your full roster. Everyone gets the alert.
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Send to a group card */}
                <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    marginBottom: 24,
                    borderWidth: targetType === 'group' ? 2 : 1,
                    borderColor: targetType === 'group' ? '#22C55E' : '#E5E7EB',
                    overflow: 'hidden',
                }}>
                    <TouchableOpacity
                        style={{
                            padding: 20,
                        }}
                        onPress={() => onTargetTypeChange("group")}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: '#DCFCE7',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 16,
                            }}>
                                <UserCheck size={24} color="#22C55E" strokeWidth={2} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 17,
                                    color: '#111827',
                                    marginBottom: 6,
                                }}>
                                    Send to a group
                                </Text>
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 14,
                                    color: '#6B7280',
                                    lineHeight: 20,
                                }}>
                                    Invite members of one group. Everyone gets the alert.
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Group Selection - attached with separator */}
                    {targetType === "group" && (
                        <View>
                            {/* Separator line */}
                            <View style={{
                                height: 1,
                                backgroundColor: '#E5E7EB',
                                marginHorizontal: 20,
                            }} />
                            
                            <View style={{ padding: 20, paddingTop: 16 }}>
                                {groups.map((group, index) => {
                                    const isSelected = selectedGroupId === group.id;
                                    return (
                                        <TouchableOpacity
                                            key={group.id}
                                            style={{
                                                paddingVertical: 12,
                                                paddingHorizontal: 16,
                                                marginBottom: index < groups.length - 1 ? 8 : 0,
                                                borderRadius: 8,
                                                backgroundColor: isSelected ? '#F0FDF4' : '#F9FAFB',
                                                borderWidth: isSelected ? 2 : 1,
                                                borderColor: isSelected ? '#22C55E' : '#E5E7EB',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                            }}
                                            onPress={() => onGroupSelect(group.id)}
                                            activeOpacity={0.7}
                                        >
                                            {isSelected ? (
                                                <View style={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: 10,
                                                    backgroundColor: '#22C55E',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    marginRight: 12,
                                                }}>
                                                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                                </View>
                                            ) : (
                                                <View style={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: 10,
                                                    borderWidth: 2,
                                                    borderColor: '#D1D5DB',
                                                    marginRight: 12,
                                                }} />
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontFamily: 'Inter_600SemiBold',
                                                    fontSize: 16,
                                                    color: '#111827',
                                                    marginBottom: 2,
                                                }}>
                                                    {group.name}
                                                </Text>
                                                <Text style={{
                                                    fontFamily: 'Inter_400Regular',
                                                    fontSize: 13,
                                                    color: '#9CA3AF',
                                                }}>
                                                    {group.memberCount} members
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                                {groups.length === 0 && (
                                    <View style={{
                                        paddingVertical: 20,
                                        alignItems: 'center',
                                    }}>
                                        <Text style={{
                                            fontFamily: 'Inter_600SemiBold',
                                            fontSize: 15,
                                            color: '#111827',
                                            marginBottom: 6,
                                        }}>
                                            No groups created yet
                                        </Text>
                                        <Text style={{
                                            fontFamily: 'Inter_400Regular',
                                            fontSize: 13,
                                            color: '#6B7280',
                                            textAlign: 'center',
                                        }}>
                                            Create groups in the Roster section
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* Response Deadline */}
                <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 24,
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: hasDeadline ? 16 : 0,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Clock size={20} color="#22C55E" strokeWidth={2} style={{ marginRight: 12 }} />
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#111827',
                            }}>
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
                            <Text style={{
                                fontFamily: 'Inter_400Regular',
                                fontSize: 13,
                                color: '#9CA3AF',
                                marginBottom: 12,
                            }}>
                                Invites will expire at this time. Unresponded invites will be cancelled.
                            </Text>

                            {/* Quick Test Presets */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                <TouchableOpacity
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        backgroundColor: '#E0F2FE',
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#7DD3FC',
                                    }}
                                    onPress={() => {
                                        const d = new Date();
                                        d.setMinutes(d.getMinutes() + 2);
                                        setTempDate(d);
                                        onDeadlineChange(d);
                                    }}
                                >
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 12,
                                        color: '#0284C7',
                                    }}>
                                        2 min
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        backgroundColor: '#E0F2FE',
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#7DD3FC',
                                    }}
                                    onPress={() => {
                                        const d = new Date();
                                        d.setMinutes(d.getMinutes() + 5);
                                        setTempDate(d);
                                        onDeadlineChange(d);
                                    }}
                                >
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 12,
                                        color: '#0284C7',
                                    }}>
                                        5 min
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        backgroundColor: '#E0F2FE',
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#7DD3FC',
                                    }}
                                    onPress={() => {
                                        const d = new Date();
                                        d.setHours(d.getHours() + 1);
                                        setTempDate(d);
                                        onDeadlineChange(d);
                                    }}
                                >
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 12,
                                        color: '#0284C7',
                                    }}>
                                        1 hr
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        backgroundColor: '#E0F2FE',
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#7DD3FC',
                                    }}
                                    onPress={() => {
                                        const d = new Date();
                                        d.setHours(d.getHours() + 24);
                                        setTempDate(d);
                                        onDeadlineChange(d);
                                    }}
                                >
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 12,
                                        color: '#0284C7',
                                    }}>
                                        24 hr
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        backgroundColor: pickerMode === "date" ? '#F0FDF4' : '#FFFFFF',
                                        paddingVertical: 12,
                                        paddingHorizontal: 14,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: pickerMode === "date" ? '#22C55E' : '#E5E7EB',
                                    }}
                                    onPress={openDatePicker}
                                >
                                    <Calendar size={18} color={pickerMode === "date" ? "#22C55E" : "#6B7280"} strokeWidth={2} />
                                    <Text style={{
                                        fontFamily: 'Inter_500Medium',
                                        fontSize: 14,
                                        color: pickerMode === "date" ? '#22C55E' : '#111827',
                                    }}>
                                        {formatDeadlineDate(tempDate)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        backgroundColor: pickerMode === "time" ? '#F0FDF4' : '#FFFFFF',
                                        paddingVertical: 12,
                                        paddingHorizontal: 14,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: pickerMode === "time" ? '#22C55E' : '#E5E7EB',
                                    }}
                                    onPress={openTimePicker}
                                >
                                    <Clock size={18} color={pickerMode === "time" ? "#22C55E" : "#6B7280"} strokeWidth={2} />
                                    <Text style={{
                                        fontFamily: 'Inter_500Medium',
                                        fontSize: 14,
                                        color: pickerMode === "time" ? '#22C55E' : '#111827',
                                    }}>
                                        {formatDeadlineTime(tempDate)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Date/Time Picker */}
                {renderPicker()}
            </ScrollView>
        </View>
    );
}
