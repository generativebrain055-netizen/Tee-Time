import React, { memo } from "react";
import { Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../../../constants/colors";

interface ActionButtonProps {
    icon: any;
    label: string;
    onPress: () => void;
}

export const ActionButton = memo(({ icon: Icon, label, onPress }: ActionButtonProps) => (
    <TouchableOpacity className="items-center justify-center rounded-md w-24 h-20 gap-2" style={{ backgroundColor: COLORS.secondary }} onPress={onPress}>
        <Icon size={20} color={COLORS.textMain} />
        <Text className="text-[10px] font-semibold text-center px-1" style={{ color: COLORS.textSub }}>{label}</Text>
    </TouchableOpacity>
));
