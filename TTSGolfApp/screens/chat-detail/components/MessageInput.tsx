import React, { memo } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Image as ImageIcon, Smile, Send } from "lucide-react-native";
import { COLORS } from "../styles";

interface MessageInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
}

export const MessageInput = memo(({ value, onChangeText, onSend }: MessageInputProps) => (
    <View className="flex-row items-center px-4 py-3 bg-white border-t border-border pb-7">
        <TouchableOpacity className="w-10 h-10 justify-center items-center">
            <ImageIcon size={24} color={COLORS.textSub} />
        </TouchableOpacity>
        <TextInput
            className="flex-1 bg-[#F3F4F6] rounded-[20px] px-4 py-2.5 text-[15px] text-[#111827] max-h-[100px] min-h-[40px]"
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textSub}
            value={value}
            onChangeText={onChangeText}
            multiline
        />
        <TouchableOpacity className="w-10 h-10 justify-center items-center">
            <Smile size={24} color={COLORS.textSub} />
        </TouchableOpacity>
        <TouchableOpacity
            className={`w-10 h-10 rounded-[20px] justify-center items-center ml-2 ${
                value.trim() ? "bg-primary" : "bg-[#F3F4F6]"
            }`}
            onPress={onSend}
            disabled={!value.trim()}
        >
            <Send size={20} color={value.trim() ? COLORS.white : COLORS.textSub} />
        </TouchableOpacity>
    </View>
));
