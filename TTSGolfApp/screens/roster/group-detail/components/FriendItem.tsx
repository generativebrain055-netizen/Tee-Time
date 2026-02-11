import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Check } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { Friend } from "../../../../services/api";

interface FriendItemProps {
    friend: Friend;
    isSelected: boolean;
    onToggle: () => void;
}

export const FriendItem = memo(({ friend, isSelected, onToggle }: FriendItemProps) => {
    const name = `${friend.firstName} ${friend.lastName}`;
    const initials = `${friend.firstName?.[0] || ""}${friend.lastName?.[0] || ""}`.toUpperCase();

    return (
        <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100" onPress={onToggle}>
            {friend.avatar ? (
                <Image source={{ uri: friend.avatar }} className="w-11 h-11 rounded-full mr-3" />
            ) : (
                <View className="w-11 h-11 rounded-full bg-gray-200 justify-center items-center mr-3">
                    <Text className="text-sm font-semibold" style={{ color: COLORS.textSub }}>{initials}</Text>
                </View>
            )}
            <Text className="flex-1 text-[15px] font-medium" style={{ color: COLORS.textMain }}>{name}</Text>
            <View className="w-6 h-6 rounded-full justify-center items-center border-2" style={isSelected ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : { borderColor: '#E5E7EB' }}>
                {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
            </View>
        </TouchableOpacity>
    );
});
