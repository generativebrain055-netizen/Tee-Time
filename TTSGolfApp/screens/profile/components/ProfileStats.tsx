import React, { memo } from "react";
import { View, Text } from "react-native";
import { COLORS } from "../../../constants/colors";

interface StatBoxProps {
    value: string | number;
    label: string;
    color: string;
}

export const StatBox = memo(({ value, label, color }: StatBoxProps) => (
    <View className="flex-1 rounded-md p-4 items-center" style={{ backgroundColor: color }}>
        <Text className="text-2xl font-bold text-gray-900 mb-1">{value}</Text>
        <Text className="text-xs text-gray-500 font-medium">{label}</Text>
    </View>
));

interface ProfileStatsProps {
    roundsPlayed: number;
    coursesPlayed: number;
    socialScore: string;
}

const ProfileStats = memo(({ roundsPlayed, coursesPlayed, socialScore }: ProfileStatsProps) => (
    <View className="flex-row px-5 gap-3 mb-6">
        <StatBox value={roundsPlayed} label="Rounds" color="#E3F2FD" />
        <StatBox value={coursesPlayed} label="Courses" color="#E8F5E9" />
        <StatBox value={socialScore} label="Social Score" color="#F3E5F5" />
    </View>
));

export default ProfileStats;
