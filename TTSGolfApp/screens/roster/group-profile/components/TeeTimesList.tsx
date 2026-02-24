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
    <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <Text style={{ fontFamily: "Inter", fontWeight: "600", fontSize: 18, lineHeight: 20, color: "#000000", marginBottom: 12 }}>Upcoming tee time</Text>
        {teeTimes.length > 0 ? (
            teeTimes.map((teeTime) => (
                <TeeTimeCard key={teeTime.id} teeTime={teeTime} />
            ))
        ) : (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Text style={{ fontFamily: "Inter", fontWeight: "400", fontSize: 14, lineHeight: 24, color: "#6C6C6C" }}>No upcoming tee times</Text>
            </View>
        )}
    </View>
));

export default TeeTimesList;
