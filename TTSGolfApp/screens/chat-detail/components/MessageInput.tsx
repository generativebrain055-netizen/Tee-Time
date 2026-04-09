import React, { memo, useCallback, useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ImageIcon, Paperclip, Smile, Send } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import EmojiPicker from "rn-emoji-keyboard";
import { COLORS, FIGMA } from "../styles";

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** Called when user picks an image. Passes uri and base64 (for sending). */
  onPickImage?: (uri: string, base64?: string) => void;
  /** Called when user picks a document (PDF, etc.). Base64 payload for API. */
  onPickFile?: (file: { base64: string; fileName: string; fileMime?: string }) => void;
  /** Called when user selects an emoji from the picker (emoji icon tap). */
  onEmojiSelected?: (emoji: string) => void;
  /** When true, input and all actions are non-interactive (e.g. blocked 1:1 chat). */
  disabled?: boolean;
}

export const MessageInput = memo(
  ({
    value,
    onChangeText,
    onSend,
    onPickImage,
    onPickFile,
    onEmojiSelected,
    disabled = false,
  }: MessageInputProps) => {
  const insets = useSafeAreaInsets();
  const canSend = !disabled && value.trim().length > 0;
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const handleImagePress = useCallback(async () => {
    if (disabled) return;
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
  }, [onPickImage, disabled]);

  const MAX_FILE_BYTES = 10 * 1024 * 1024;

  const handleFilePress = useCallback(async () => {
    if (disabled || !onPickFile) return;
    try {
      // Dynamic import so the rest of the app loads even if the dev client was built before
      // expo-document-picker was added; native module is only required when attaching a file.
      const { getDocumentAsync } = await import("expo-document-picker");
      const result = await getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (asset.size != null && asset.size > MAX_FILE_BYTES) {
        Alert.alert("File too large", "Maximum attachment size is 10 MB.");
        return;
      }
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      onPickFile({
        base64,
        fileName: asset.name || "attachment",
        fileMime: asset.mimeType ?? undefined,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (
        msg.includes("native module") ||
        msg.includes("ExpoDocumentPicker") ||
        msg.includes("Cannot find")
      ) {
        Alert.alert(
          "Attachment needs a fresh native build",
          "Your installed app was built before file attachments were added. From the TTSGolfApp folder run:\n\nnpx expo run:ios\nor\nnpx expo run:android\n\nThen open the new build (clear cache: npx expo start -c)."
        );
        return;
      }
      Alert.alert("Could not read file", "Try another file.");
    }
  }, [onPickFile, disabled]);

  const handleEmojiSelected = useCallback(
    (ev: { emoji: string }) => {
      onEmojiSelected?.(ev.emoji);
      setEmojiPickerOpen(false);
    },
    [onEmojiSelected]
  );

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }, disabled && styles.containerDisabled]}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.iconBtn}
          hitSlop={8}
          onPress={handleImagePress}
          disabled={disabled}
        >
          <ImageIcon size={20} color={COLORS.textSub} />
        </TouchableOpacity>
        {onPickFile ? (
          <TouchableOpacity
            style={styles.iconBtn}
            hitSlop={8}
            onPress={handleFilePress}
            disabled={disabled}
          >
            <Paperclip size={20} color={COLORS.textSub} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.inputPlaceholder}
            value={value}
            onChangeText={onChangeText}
            multiline
            maxLength={10000}
            editable={!disabled}
          />
          <TouchableOpacity
            style={styles.emojiBtn}
            hitSlop={8}
            onPress={() => !disabled && setEmojiPickerOpen(true)}
            disabled={disabled}
          >
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
  }
);

const styles = StyleSheet.create({
  container: {
    minHeight: FIGMA.inputBarHeight,
    paddingHorizontal: 16,
    paddingTop: 31,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  containerDisabled: {
    opacity: 0.55,
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
