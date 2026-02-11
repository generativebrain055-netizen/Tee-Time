import React, { memo } from "react";
import { View, Text } from "react-native";
import { Users } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";

interface Props {
    name: string;
    description?: string;
    memberCount: number;
}

const GroupInfo = memo(({ name, description, memberCount }: Props) => (
    <View className="items-center px-5 mb-5">
        <Text className="text-2xl font-bold mb-1" style={{ color: COLORS.textMain }}>{name}</Text>
        {description && <Text className="text-sm text-center mb-2" style={{ color: COLORS.textSub }}>{description}</Text>}
        <View className="flex-row items-center gap-1">
            <Users size={14} color={COLORS.textSub} />
            <Text className="text-sm" style={{ color: COLORS.textSub }}>{memberCount} members</Text>
        </View>
    </View>
));

export default GroupInfo;
