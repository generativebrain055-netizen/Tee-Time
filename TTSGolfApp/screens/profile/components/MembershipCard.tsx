import React, { memo } from "react";
import { View, Text } from "react-native";
import { COLORS } from "../../../constants/colors";

interface MembershipCardProps {
    homeCourse?: string;
}

const MembershipCard = memo(({ homeCourse }: MembershipCardProps) => (
    <View className="px-5 mb-6">
        <Text className="text-base font-bold text-gray-900 mb-3">Active memberships</Text>
        <View className="bg-white rounded-md p-4">
            {homeCourse ? (
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-blue-100 justify-center items-center">
                        <Text className="text-lg">⛳</Text>
                    </View>
                    <Text className="text-[15px] font-medium text-gray-900">{homeCourse}</Text>
                </View>
            ) : (
                <Text className="text-sm font-medium text-gray-500">No active memberships</Text>
            )}
        </View>
    </View>
));

export default MembershipCard;
