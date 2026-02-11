import React, { memo } from "react";
import { View, Text } from "react-native";
import { COLORS } from "../../../constants/colors";

interface Props {
    homeCourse?: string;
}

const HomeCourseCard = memo(({ homeCourse }: Props) => {
    if (!homeCourse) return null;

    return (
        <View className="px-5 mb-6">
            <Text className="text-base font-bold mb-3" style={{ color: COLORS.textMain }}>Home course</Text>
            <View className="rounded-md p-4" style={{ backgroundColor: COLORS.white }}>
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-primary-light justify-center items-center">
                        <Text className="text-lg">⛳</Text>
                    </View>
                    <Text className="text-[15px] font-medium" style={{ color: COLORS.textMain }}>{homeCourse}</Text>
                </View>
            </View>
        </View>
    );
});

export default HomeCourseCard;
