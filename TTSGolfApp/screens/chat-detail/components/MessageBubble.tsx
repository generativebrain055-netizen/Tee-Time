import React, { memo } from "react";
import { View, Text, Image } from "react-native";
import { COLORS } from "../styles";
import { ChatMessage } from "../types";

interface MessageBubbleProps {
    message: ChatMessage;
}

export const MessageBubble = memo(({ message }: MessageBubbleProps) => (
    <View
        className={`flex-row mb-4 items-end ${
            message.isMe ? "justify-end" : "justify-start"
        }`}
    >
        {!message.isMe && (
            <Image source={{ uri: message.senderImg }} className="w-8 h-8 rounded-[16px] bg-[#E5E5E5] mr-2" />
        )}
        <View
            className={`max-w-[70%] rounded-md px-4 py-2.5 ${
                message.isMe 
                    ? "bg-[#E8F4FD] rounded-br-[4px]" 
                    : "bg-white rounded-bl-[4px]"
            }`}
            style={message.isMe ? {} : { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
        >
            <Text className={`text-[15px] leading-5 ${message.isMe ? "text-[#111827]" : "text-[#111827]"}`}>
                {message.message}
            </Text>
            <Text className={`text-[11px] mt-1 ${message.isMe ? "text-text-secondary text-right" : "text-text-secondary"}`}>
                {message.time}
            </Text>
        </View>
        {message.isMe && <View className="w-10" />}
    </View>
));
