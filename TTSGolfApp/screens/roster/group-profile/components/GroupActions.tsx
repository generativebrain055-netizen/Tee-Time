import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MessageCircle, Calendar } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";

interface Props {
    onChat: () => void;
    onAddTeeTime: () => void;
}

const GroupActions = memo(({ onChat, onAddTeeTime }: Props) => (
    <View className="flex-row px-5 gap-3 mb-6">
        <TouchableOpacity className="flex-1 flex-row items-center justify-center rounded-md py-3.5 gap-2" style={{ backgroundColor: COLORS.primary }} onPress={onChat}>
            <MessageCircle size={18} color={COLORS.white} />
            <Text className="text-[15px] font-semibold" style={{ color: COLORS.white }}>Group Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 flex-row items-center justify-center rounded-md py-3.5 gap-2 border-[1.5px]" style={{ backgroundColor: COLORS.white, borderColor: COLORS.primary }} onPress={onAddTeeTime}>
            <Calendar size={18} color={COLORS.primary} />
            <Text className="text-[15px] font-semibold" style={{ color: COLORS.primary }}>Add Tee Time</Text>
        </TouchableOpacity>
    </View>
));

export default GroupActions;
