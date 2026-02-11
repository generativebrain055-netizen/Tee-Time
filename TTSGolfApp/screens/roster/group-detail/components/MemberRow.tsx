import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { MoreHorizontal } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { RosterContact } from "../../../../services/api";

interface MemberRowProps {
    member: RosterContact;
    onMore: () => void;
}

export const MemberRow = memo(({ member, onMore }: MemberRowProps) => {
    const name = member.contact?.name || "Unknown";
    const avatar = member.contact?.avatar;
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    return (
        <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
            <View className="flex-row items-center gap-3">
                {avatar ? (
                    <Image source={{ uri: avatar }} className="w-11 h-11 rounded-full" style={{ backgroundColor: COLORS.divider }} />
                ) : (
                    <View className="w-11 h-11 rounded-full bg-gray-200 justify-center items-center">
                        <Text className="text-sm font-semibold" style={{ color: COLORS.textSub }}>{initials}</Text>
                    </View>
                )}
                <Text className="text-[15px] font-semibold" style={{ color: COLORS.textMain }}>{name}</Text>
            </View>
            <TouchableOpacity onPress={onMore}>
                <MoreHorizontal size={20} color={COLORS.textSub} />
            </TouchableOpacity>
        </View>
    );
});
