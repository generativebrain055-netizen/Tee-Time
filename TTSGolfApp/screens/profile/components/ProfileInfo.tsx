import React, { memo } from "react";
import { View, Text } from "react-native";
import { MapPin } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";

interface ProfileInfoProps {
    fullName: string;
    location?: string;
    handicap?: number | string;
}

const ProfileInfo = memo(({ fullName, location, handicap }: ProfileInfoProps) => (
    <View className="items-center px-5 mb-5">
        <Text className="text-2xl font-bold text-gray-900 mb-1">{fullName}</Text>
        {location && (
            <View className="flex-row items-center gap-1 mb-1">
                <MapPin size={14} color={COLORS.textSub} />
                <Text className="text-sm text-gray-500">{location}</Text>
            </View>
        )}
        {handicap != null && (
            <Text className="text-sm text-gray-500 font-medium">Handicap: {handicap}</Text>
        )}
    </View>
));

export default ProfileInfo;
