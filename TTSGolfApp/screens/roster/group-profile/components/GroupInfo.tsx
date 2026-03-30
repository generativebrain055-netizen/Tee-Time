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
    <View className="items-center px-5 mb-6" style={{ alignSelf: "stretch" }}>
        <Text
            className="text-2xl font-bold mb-2"
            style={{
                color: COLORS.textMain,
                textAlign: "center",
                lineHeight: 32,
                alignSelf: "stretch",
            }}
        >
            {name}
        </Text>
        {description ? (
            <Text
                className="text-sm mb-3"
                style={{ color: COLORS.textSub, textAlign: "center", lineHeight: 20, alignSelf: "stretch" }}
            >
                {description}
            </Text>
        ) : null}
        <View className="flex-row items-center justify-center gap-1.5">
            <Users size={14} color={COLORS.textSub} />
            <Text className="text-sm" style={{ color: COLORS.textSub }}>
                {memberCount} members
            </Text>
        </View>
    </View>
));

export default GroupInfo;
