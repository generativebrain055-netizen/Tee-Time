import React, { memo } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { X } from "lucide-react-native";
import { COLORS } from "../styles";

interface ChatActionsMenuProps {
    visible: boolean;
    onClose: () => void;
}

export const ChatActionsMenu = memo(({ visible, onClose }: ChatActionsMenuProps) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity className="flex-1 bg-black/50 justify-end" activeOpacity={1} onPress={onClose}>
            <View className="bg-white rounded-t-[20px] pb-10">
                <View className="flex-row justify-between items-center px-5 py-5 border-b border-border">
                    <Text className="text-lg font-semibold text-[#111827]">Chat actions</Text>
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color={COLORS.textMain} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity className="px-5 py-4">
                    <Text className="text-base text-[#111827]">Mute</Text>
                </TouchableOpacity>
                <View className="h-px bg-[#E5E5E5] mx-5" />
                <TouchableOpacity className="px-5 py-4">
                    <Text className="text-base text-[#EF4444]">Delete chat</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
));
