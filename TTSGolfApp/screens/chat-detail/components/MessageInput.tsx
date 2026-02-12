import React, { memo } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ImageIcon, Smile, Send } from "lucide-react-native";
import { COLORS, FIGMA } from "../styles";

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
}

export const MessageInput = memo(({ value, onChangeText, onSend }: MessageInputProps) => {
  const insets = useSafeAreaInsets();
  const canSend = value.trim().length > 0;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
          <ImageIcon size={20} color={COLORS.textSub} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.inputPlaceholder}
            value={value}
            onChangeText={onChangeText}
            multiline
            maxLength={10000}
          />
          <TouchableOpacity style={styles.emojiBtn} hitSlop={8}>
            <Smile size={20} color={COLORS.textSub} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnInactive]}
          onPress={onSend}
          disabled={!canSend}
          hitSlop={8}
        >
          <Send size={20} color={canSend ? COLORS.white : COLORS.textSub} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    minHeight: FIGMA.inputBarHeight,
    paddingHorizontal: 16,
    paddingTop: 31,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: FIGMA.inputRowHeight,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: FIGMA.inputRowHeight,
    backgroundColor: COLORS.inputBg,
    borderRadius: FIGMA.inputBorderRadius,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 44,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textMain,
    paddingVertical: 12,
    paddingRight: 8,
  },
  emojiBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendBtnActive: {
    backgroundColor: COLORS.primary,
  },
  sendBtnInactive: {
    backgroundColor: "#E5E7EB",
  },
});
