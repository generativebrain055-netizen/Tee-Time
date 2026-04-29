import React, { useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Calendar, Clock, Users, ChevronRight } from "lucide-react-native";
import { COLORS } from "./constants";
import GolfCourseAutocomplete, { GolfCourse } from "../../components/GolfCourseAutocomplete";
import { parseFlexibleTeeTime } from "./timeInputUtils";

interface InviteDetailsStepProps {
    selectedDate: Date | null;
    selectedTime: string | null;
    /** Controlled text field for typing time (may differ until blur / continue) */
    timeInputDraft: string;
    onTimeInputDraftChange: (text: string) => void;
    /** Called when typed time parses successfully on blur / submit */
    onParsedTime: (canonicalTime: string) => void;
    location: string;
    groupSize: number;
    onOpenDatePicker: () => void;
    onOpenTimePicker: () => void;
    onLocationChange: (text: string) => void;
    onCourseSelect?: (course: GolfCourse) => void;
    onGroupSizeChange: (size: number) => void;
    onSeeMatchingAvailability?: () => void;
    loadingMatchingAvailability?: boolean;
}

/** Display date in M/D/Y format (e.g. 12/25/2025) per Figma */
const formatDateDisplay = (date: Date | null) => {
    if (!date) return "M/D/YYYY";
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const y = date.getFullYear();
    return `${m}/${d}/${y}`;
};

export default function InviteDetailsStep({
    selectedDate,
    selectedTime,
    timeInputDraft,
    onTimeInputDraftChange,
    onParsedTime,
    location,
    groupSize,
    onOpenDatePicker,
    onOpenTimePicker,
    onLocationChange,
    onCourseSelect,
    onGroupSizeChange,
    onSeeMatchingAvailability,
    loadingMatchingAvailability,
}: InviteDetailsStepProps) {
    const displayTime = selectedTime || "10:00 AM";

    const commitTypedTime = useCallback(() => {
        const raw = timeInputDraft.trim();
        if (!raw) {
            onTimeInputDraftChange(displayTime);
            return;
        }
        const parsed = parseFlexibleTeeTime(raw);
        if (parsed) {
            onParsedTime(parsed);
            return;
        }
        Alert.alert(
            "Invalid time",
            "Use a time like 8:30 AM, 2:45 PM, or 24-hour form such as 14:30.",
        );
        onTimeInputDraftChange(displayTime);
    }, [timeInputDraft, displayTime, onParsedTime, onTimeInputDraftChange]);

    const handleCourseSelect = useCallback((course: GolfCourse) => {
        // Set the full location string (name + location)
        const fullLocation = course.location && course.location !== "Custom entry"
            ? `${course.name}, ${course.location}`
            : course.name;
        onLocationChange(fullLocation);
        onCourseSelect?.(course);
    }, [onLocationChange, onCourseSelect]);

    return (
        <ScrollView
            className="flex-1 px-5 pt-2"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 200 }}
        >
            {/* Date Picker */}
            <Text className="text-base font-semibold text-[#1F2937] mb-3 mt-6">Pick a date</Text>
            <TouchableOpacity className="flex-row items-center justify-between bg-white border border-border rounded-lg px-4 py-4" style={{ borderRadius: 8 }} onPress={onOpenDatePicker}>
                <Text className={selectedDate ? "text-base text-[#1F2937]" : "text-base text-[#9CA3AF]"}>
                    {formatDateDisplay(selectedDate)}
                </Text>
                <Calendar size={20} color={COLORS.textSub} strokeWidth={1.5} />
            </TouchableOpacity>

            {/* Time: type or scroll wheel */}
            <Text className="text-base font-semibold text-[#1F2937] mb-3 mt-6">Pick a time</Text>
            <View
                className="flex-row items-stretch bg-white border border-border rounded-lg overflow-hidden"
                style={{ borderRadius: 8 }}
            >
                <TextInput
                    className="flex-1 px-4 py-3.5 text-base text-[#1F2937]"
                    placeholder="e.g. 8:30 AM or 14:30"
                    placeholderTextColor="#9CA3AF"
                    value={timeInputDraft}
                    onChangeText={onTimeInputDraftChange}
                    onBlur={commitTypedTime}
                    onSubmitEditing={commitTypedTime}
                    returnKeyType="done"
                    autoCorrect={false}
                    autoCapitalize="none"
                />
                <TouchableOpacity
                    accessibilityLabel="Open time wheel"
                    className="justify-center px-4 border-l border-border bg-[#F9FAFB]"
                    onPress={onOpenTimePicker}
                    activeOpacity={0.7}
                >
                    <Clock size={22} color={COLORS.text} strokeWidth={1.75} />
                </TouchableOpacity>
            </View>
            <Text className="text-xs text-[#9CA3AF] mt-2 px-0.5">
                Type a time, or tap the clock to use the scrolling picker.
            </Text>

            {/* Location Input - Golf Course Autocomplete */}
            <Text className="text-base font-semibold text-[#1F2937] mb-3 mt-6">Pick a location</Text>
            <GolfCourseAutocomplete
                value={location}
                onSelect={handleCourseSelect}
                onChangeText={onLocationChange}
                placeholder="Search golf courses..."
            />

            {/* Group Size */}
            <Text className="text-base font-semibold text-[#1F2937] mb-3 mt-6">Group size</Text>
            <View className="flex-row">
                {[2, 3, 4].map((size, index) => (
                    <TouchableOpacity
                        key={size}
                        className={`flex-1 items-center py-4 border bg-white ${
                            index === 0 ? "border-l rounded-tl-lg rounded-bl-lg" : "border-l-0"
                        } ${
                            index === 2 ? "rounded-tr-lg rounded-br-lg" : ""
                        } ${
                            groupSize === size ? "border-2 border-[#1F2937] border-l-2" : "border-border"
                        }`}
                        onPress={() => onGroupSizeChange(size)}
                    >
                        <Text className={`text-xl font-bold ${
                            groupSize === size ? "text-[#1F2937]" : "text-[#1F2937]"
                        }`}>
                            {size}
                        </Text>
                        <Text className={`text-xs mt-0.5 ${
                            groupSize === size ? "text-[#1F2937]" : "text-[#9CA3AF]"
                        }`}>
                            Players
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* See friends with matching availability - only when all fields are filled (date, time, location) */}
            {selectedDate &&
                (parseFlexibleTeeTime(timeInputDraft.trim()) ?? selectedTime) &&
                location?.trim() &&
                onSeeMatchingAvailability && (
                <TouchableOpacity
                    onPress={onSeeMatchingAvailability}
                    disabled={loadingMatchingAvailability}
                    className="flex-row items-center justify-between bg-[#F0FDF4] border border-[#22C55E]/30 rounded-lg px-4 py-4 mt-6"
                    style={{ borderRadius: 8 }}
                    activeOpacity={0.8}
                >
                    <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-lg bg-[#DCFCE7] items-center justify-center mr-3">
                            <Users size={20} color="#22C55E" strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-semibold text-[#1F2937]">
                                See friends with matching availability?
                            </Text>
                            <Text className="text-sm text-[#6B7280] mt-0.5">
                                Find players in your network who are free this date and time
                            </Text>
                        </View>
                    </View>
                    {loadingMatchingAvailability ? (
                        <ActivityIndicator size="small" color="#22C55E" />
                    ) : (
                        <ChevronRight size={20} color="#22C55E" strokeWidth={2} />
                    )}
                </TouchableOpacity>
            )}

            <View style={{ height: 120 }} />
        </ScrollView>
    );
}
