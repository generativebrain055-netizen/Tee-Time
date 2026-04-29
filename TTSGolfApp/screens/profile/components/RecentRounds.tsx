import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";
import { TeeTime } from "../../../services/api";
import { formatDateMMDDYYYY, parseCalendarDateLocal } from "../../../utils/formatting";

interface RecentRoundCardProps {
    teeTime: TeeTime;
    onPress?: () => void;
}

const formatDate = (dateStr: string): string => {
    return formatDateMMDDYYYY(parseCalendarDateLocal(dateStr));
};

const getInitials = (name: string): string => {
    return name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "??";
};

export const RecentRoundCard = memo(({ teeTime, onPress }: RecentRoundCardProps) => (
    <TouchableOpacity className="flex-row items-center bg-white rounded-md p-3 mb-2" onPress={onPress} activeOpacity={0.7}>
        <View className="w-12 h-12 rounded-md bg-blue-100 justify-center items-center mr-3">
            <Text className="text-base font-bold text-blue-600">{getInitials(teeTime.courseName)}</Text>
        </View>
        <View className="flex-1">
            <Text className="text-[15px] font-semibold text-gray-900 mb-0.5" numberOfLines={1}>{teeTime.courseName}</Text>
            <Text className="text-[13px] text-gray-500">{formatDate(teeTime.teeDate)}</Text>
        </View>
        <ChevronRight size={20} color={COLORS.textSub} />
    </TouchableOpacity>
));

interface RecentRoundsProps {
    rounds: TeeTime[];
    onSeeAll?: () => void;
    onRoundPress?: (teeTime: TeeTime) => void;
}

const RecentRounds = memo(({ rounds, onSeeAll, onRoundPress }: RecentRoundsProps) => (
    <View className="px-5 mb-6">
        <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold text-gray-900">Recent rounds</Text>
            {onSeeAll && (
                <TouchableOpacity onPress={onSeeAll}>
                    <Text className="text-sm font-medium text-blue-600">See all</Text>
                </TouchableOpacity>
            )}
        </View>
        {rounds.length > 0 ? (
            rounds.map((round) => (
                <RecentRoundCard
                    key={round.id}
                    teeTime={round}
                    onPress={() => onRoundPress?.(round)}
                />
            ))
        ) : (
            <View className="bg-white rounded-md p-6 items-center">
                <Text className="text-sm font-medium text-gray-500">No recent rounds</Text>
                <Text className="text-[13px] text-gray-500 mt-1">Your completed rounds will appear here</Text>
            </View>
        )}
    </View>
));

export default RecentRounds;
