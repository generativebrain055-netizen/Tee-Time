import React, { memo } from "react";
import { View, Text } from "react-native";
import { COLORS } from "../../../../constants/colors";

interface StatBoxProps {
    value: string | number;
    label: string;
    color: string;
}

const StatBox = memo(({ value, label, color }: StatBoxProps) => (
    <View className="flex-1 rounded-md py-3.5 px-2 items-center justify-center" style={{ backgroundColor: color, minWidth: 0 }}>
        <Text
            className="text-2xl font-bold mb-1"
            style={{ color: COLORS.textMain, textAlign: "center" }}
        >
            {value}
        </Text>
        <Text
            className="text-xs font-medium"
            style={{ color: COLORS.textSub, textAlign: "center", lineHeight: 16 }}
            numberOfLines={2}
        >
            {label}
        </Text>
    </View>
));

interface Props {
    memberCount: number;
    avgHandicap: string;
    upcomingCount: number;
}

const GroupStats = memo(({ memberCount, avgHandicap, upcomingCount }: Props) => (
    <View className="flex-row px-4 gap-2 mb-6" style={{ alignSelf: "stretch" }}>
        <StatBox value={memberCount} label="Members" color="#E3F2FD" />
        <StatBox value={avgHandicap} label="Avg Handicap" color="#E8F5E9" />
        <StatBox value={upcomingCount} label="Upcoming" color="#F3E5F5" />
    </View>
));

export default GroupStats;
