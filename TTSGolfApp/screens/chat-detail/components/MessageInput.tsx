import React, { memo, useCallback, useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ImageIcon, Smile, Send } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import EmojiPicker from "rn-emoji-keyboard";
import { COLORS, FIGMA } from "../styles";

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** Called when user picks an image. Passes uri and base64 (for sending). */
  onPickImage?: (uri: string, base64?: string) => void;
  /** Called when user selects an emoji from the picker (emoji icon tap). */
  onEmojiSelected?: (emoji: string) => void;
}

export const MessageInput = memo(({ value, onChangeText, onSend, onPickImage, onEmojiSelected }: MessageInputProps) => {
  const insets = useSafeAreaInsets();
  const canSend = value.trim().length > 0;
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const handleImagePress = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Gallery access",
        "Please allow photo library access to attach images."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "Images",
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onPickImage?.(asset.uri, asset.base64 ?? undefined);
    }
  }, [onPickImage]);

  const handleEmojiSelected = useCallback(
    (ev: { emoji: string }) => {
      onEmojiSelected?.(ev.emoji);
      setEmojiPickerOpen(false);
    },
    [onEmojiSelected]
  );

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.iconBtn} hitSlop={8} onPress={handleImagePress}>
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
          <TouchableOpacity style={styles.emojiBtn} hitSlop={8} onPress={() => setEmojiPickerOpen(true)}>
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
      <EmojiPicker
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onEmojiSelected={handleEmojiSelected}
        enableSearchBar
        enableRecentlyUsed
        defaultHeight="40%"
        expandedHeight="80%"
      />
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
