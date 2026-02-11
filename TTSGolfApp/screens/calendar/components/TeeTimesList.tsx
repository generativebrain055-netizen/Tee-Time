import React, { memo } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { Calendar } from "lucide-react-native";
import { CalendarTeeTime } from "../types";
import { CALENDAR_COLORS } from "../constants";
import { formatSelectedDate } from "../utils";
import TeeTimeCard from "./TeeTimeCard";

interface TeeTimesListProps {
    selectedDate: Date | null;
    teeTimes: CalendarTeeTime[];
    loading: boolean;
    onTeeTimePress?: (teeTimeId: string) => void;
    onCancelSuccess?: () => void;
}

const EmptyState = memo(() => (
    <View className="items-center py-10">
        <Calendar size={48} color={CALENDAR_COLORS.textSecondary} />
        <Text className="text-base text-[#8A8A8E] mt-3" style={{ fontFamily: 'Inter_500Medium' }}>No tee times scheduled</Text>
    </View>
));

const TeeTimesList = memo(({ selectedDate, teeTimes, loading, onTeeTimePress, onCancelSuccess }: TeeTimesListProps) => {
    if (!selectedDate) return null;

    return (
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
          showsVerticalScrollIndicator={true}
        >
            {loading ? (
                <ActivityIndicator size="large" color={CALENDAR_COLORS.primary} className="mt-5" />
            ) : teeTimes.length > 0 ? (
                teeTimes.map((teeTime) => (
                    <TeeTimeCard
                        key={teeTime.id}
                        teeTime={teeTime}
                        onPress={onTeeTimePress}
                        onCancelSuccess={onCancelSuccess}
                    />
                ))
            ) : (
                <EmptyState />
            )}
        </ScrollView>
    );
});

export default TeeTimesList;