import React, { memo } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Image as ImageIcon, Smile, Send } from "lucide-react-native";
import { COLORS } from "../styles";

interface MessageInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
}

export const MessageInput = memo(({ value, onChangeText, onSend }: MessageInputProps) => (
    <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.inputButton}>
            <ImageIcon size={24} color={COLORS.textSub} />
        </TouchableOpacity>
        <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textSub}
            value={value}
            onChangeText={onChangeText}
            multiline
        />
        <TouchableOpacity style={styles.inputButton}>
            <Smile size={24} color={COLORS.textSub} />
        </TouchableOpacity>
        <TouchableOpacity
            style={[styles.sendButton, value.trim() && styles.sendButtonActive]}
            onPress={onSend}
            disabled={!value.trim()}
        >
            <Send size={20} color={value.trim() ? COLORS.white : COLORS.textSub} />
        </TouchableOpacity>
    </View>
));

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
        paddingBottom: 28,
    },
    inputButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.secondary,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: COLORS.textMain,
        maxHeight: 100,
        minHeight: 40,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.secondary,
        marginLeft: 8,
    },
    sendButtonActive: { backgroundColor: COLORS.primary },
});
