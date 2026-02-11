import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { CheckCheck, Users } from "lucide-react-native";
import { COLORS, Message } from "./constants";

interface MessageItemProps {
    message: Message;
    onPress: () => void;
}

export function MessageItem({ message, onPress }: MessageItemProps) {
    return (
        <TouchableOpacity
            className={`flex-row px-4 py-3 border-b border-border ${
                message.isRead ? "bg-bg-light" : "bg-info-light"
            }`}
            onPress={onPress}
        >
            <View className="relative">
                <Image source={{ uri: message.img }} className="w-14 h-14 rounded-full bg-[#E5E5E5]" />
                {message.unread && message.unread > 0 && (
                    <View className="absolute bottom-0 right-0 bg-primary rounded-md min-w-[20px] h-5 justify-center items-center border-2 border-white">
                        <Text className="text-white text-[11px] font-bold">{message.unread}</Text>
                    </View>
                )}
            </View>
            <View className="flex-1 ml-3 justify-center">
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-base font-semibold text-[#111827] flex-1 mr-2" numberOfLines={1}>{message.name}</Text>
                    <Text className="text-[13px] text-text-secondary">{message.time}</Text>
                </View>
                <View className="flex-row items-center">
                    <Text className="text-sm text-text-secondary flex-1" numberOfLines={1}>{message.message}</Text>
                    {message.isRead && (
                        <CheckCheck size={16} color={COLORS.primary} style={{ marginLeft: 4 }} />
                    )}
                    {message.unread && message.unread > 0 && (
                        <View className="bg-primary rounded-md min-w-[20px] h-5 justify-center items-center ml-2">
                            <Text className="text-white text-[11px] font-bold">{message.unread}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

export function GroupMessageItem({ message, onPress }: MessageItemProps) {
    return (
        <TouchableOpacity className="flex-row px-4 py-3 bg-white border-b border-border" onPress={onPress}>
            <View className="relative">
                <View className="w-14 h-14 rounded-full bg-[#6B7280] justify-center items-center">
                    <Users size={24} color={COLORS.white} />
                </View>
                {message.unread && message.unread > 0 && (
                    <View className="absolute bottom-0 right-0 bg-primary rounded-md min-w-[20px] h-5 justify-center items-center border-2 border-white">
                        <Text className="text-white text-[11px] font-bold">{message.unread}</Text>
                    </View>
                )}
            </View>
            <View className="flex-1 ml-3 justify-center">
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-base font-semibold text-[#111827] flex-1 mr-2" numberOfLines={1}>{message.name}</Text>
                    <Text className="text-[13px] text-text-secondary">{message.time}</Text>
                </View>
                <Text className="text-sm text-text-secondary" numberOfLines={1}>{message.message}</Text>
            </View>
        </TouchableOpacity>
    );
}
