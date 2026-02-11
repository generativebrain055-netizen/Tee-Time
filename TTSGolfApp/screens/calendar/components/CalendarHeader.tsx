import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { CALENDAR_COLORS } from "../constants";

interface CalendarHeaderProps {
    onBack: () => void;
}

const CalendarHeader = memo(({ onBack }: CalendarHeaderProps) => (
    <View className="flex-row justify-between items-center px-4 pt-12 pb-4 bg-white">
        <TouchableOpacity className="w-10 h-10 justify-center items-center -ml-2" onPress={onBack}>
            <ArrowLeft size={24} color={CALENDAR_COLORS.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text-primary">Calendar</Text>
        <View className="w-10" />
    </View>
));

export default CalendarHeader;
