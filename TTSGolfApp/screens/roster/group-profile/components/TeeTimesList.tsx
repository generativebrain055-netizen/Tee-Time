import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Calendar, ChevronRight } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { TeeTime } from "../../../../services/api";
import { formatTeeTimeDate } from "../utils";

interface TeeTimeCardProps {
    teeTime: TeeTime;
}

const TeeTimeCard = memo(({ teeTime }: TeeTimeCardProps) => (
    <View className="flex-row items-center rounded-md p-3 mb-2" style={{ backgroundColor: COLORS.white }}>
        <View className="w-11 h-11 rounded-full justify-center items-center mr-3" style={{ backgroundColor: COLORS.primaryLight }}>
            <Calendar size={20} color={COLORS.primary} />
        </View>
        <View className="flex-1">
            <Text className="text-[15px] font-semibold mb-0.5" style={{ color: COLORS.textMain }}>{teeTime.courseName}</Text>
            <Text className="text-[13px]" style={{ color: COLORS.textSub }}>{formatTeeTimeDate(teeTime.teeDate)} • {teeTime.teeTime}</Text>
        </View>
        <ChevronRight size={20} color={COLORS.textSub} />
    </View>
));

interface Props {
    teeTimes: TeeTime[];
    onAddTeeTime: () => void;
}

const TeeTimesList = memo(({ teeTimes, onAddTeeTime }: Props) => (
    <View className="px-5 mb-6">
        <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold" style={{ color: COLORS.textMain }}>Upcoming tee times</Text>
            <TouchableOpacity>
                <Text className="text-sm font-medium" style={{ color: COLORS.primary }}>See all</Text>
            </TouchableOpacity>
        </View>

        {teeTimes.length > 0 ? (
            teeTimes.map((teeTime) => (
                <TeeTimeCard key={teeTime.id} teeTime={teeTime} />
            ))
        ) : (
            <View className="rounded-md p-6 items-center" style={{ backgroundColor: COLORS.white }}>
                <Text className="text-sm font-medium" style={{ color: COLORS.textSub }}>No upcoming tee times</Text>
                <TouchableOpacity className="mt-3 px-4 py-2 rounded-md" style={{ backgroundColor: COLORS.primary }} onPress={onAddTeeTime}>
                    <Text className="text-sm font-semibold" style={{ color: COLORS.white }}>Create one now</Text>
                </TouchableOpacity>
            </View>
        )}
    </View>
));

export default TeeTimesList;
