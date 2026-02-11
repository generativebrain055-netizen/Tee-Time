import React, { useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { Calendar, Clock } from "lucide-react-native";
import { COLORS } from "./constants";
import GolfCourseAutocomplete, { GolfCourse } from "../../components/GolfCourseAutocomplete";

interface InviteDetailsStepProps {
    selectedDate: Date | null;
    selectedTime: string | null;
    location: string;
    groupSize: number;
    onOpenDatePicker: () => void;
    onOpenTimePicker: () => void;
    onLocationChange: (text: string) => void;
    onCourseSelect?: (course: GolfCourse) => void;
    onGroupSizeChange: (size: number) => void;
}

const formatDateDisplay = (date: Date | null) => {
    if (!date) return "YYYY-MM-DD";
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
};

export default function InviteDetailsStep({
    selectedDate,
    selectedTime,
    location,
    groupSize,
    onOpenDatePicker,
    onOpenTimePicker,
    onLocationChange,
    onCourseSelect,
    onGroupSizeChange,
}: InviteDetailsStepProps) {
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
            <TouchableOpacity className="flex-row items-center justify-between bg-white border border-border rounded-md px-4 py-4" onPress={onOpenDatePicker}>
                <Text className={selectedDate ? "text-base text-[#1F2937]" : "text-base text-[#9CA3AF]"}>
                    {formatDateDisplay(selectedDate)}
                </Text>
                <Calendar size={20} color={COLORS.textSub} strokeWidth={1.5} />
            </TouchableOpacity>

            {/* Time Picker */}
            <Text className="text-base font-semibold text-[#1F2937] mb-3 mt-6">Pick a time</Text>
            <TouchableOpacity className="flex-row items-center justify-between bg-white border border-border rounded-md px-4 py-4" onPress={onOpenTimePicker}>
                <Text className={selectedTime ? "text-base text-[#1F2937]" : "text-base text-[#9CA3AF]"}>
                    {selectedTime || "10:00 AM"}
                </Text>
                <Clock size={20} color={COLORS.textSub} strokeWidth={1.5} />
            </TouchableOpacity>

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

            <View style={{ height: 120 }} />
        </ScrollView>
    );
}
