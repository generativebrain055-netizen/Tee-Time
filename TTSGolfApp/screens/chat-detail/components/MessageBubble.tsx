import React, { memo, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { MoreVertical, FileText } from "lucide-react-native";
import { COLORS, FIGMA } from "../styles";
import { ChatMessage } from "../types";
import { ChatImagePreviewModal } from "./ChatImagePreviewModal";

interface MessageBubbleProps {
  message: ChatMessage;
  /** When set, system messages show long-press / menu to turn into a group message */
  onConvertToGroupMessage?: (messageId: string) => void;
  /** When true, user may delete (own message, tee time organizer, etc.) */
  canDelete?: boolean;
  onDelete?: (messageId: string) => void;
  /** Edit own message text (sender only); omit for messages you cannot edit */
  onEdit?: (messageId: string, currentText: string) => void;
}

export const MessageBubble = memo(
  ({
    message,
    onConvertToGroupMessage,
    canDelete,
    onDelete,
    onEdit,
  }: MessageBubbleProps) => {
    const [previewOpen, setPreviewOpen] = useState(false);

    const canEditOwn = !!(onEdit && message.isMe && !message.isSystem);

    const showMessageActions = useCallback(() => {
      const buttons: Array<{
        text: string;
        style?: "default" | "cancel" | "destructive";
        onPress?: () => void;
      }> = [];

      if (canEditOwn && onEdit) {
        buttons.push({
          text: "Edit",
          onPress: () => onEdit(message.id, message.message ?? ""),
        });
      }

      if (canDelete && onDelete) {
        buttons.push({
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Delete message", "Remove this message from the conversation?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(message.id) },
            ]);
          },
        });
      }

      if (message.isSystem && onConvertToGroupMessage) {
        buttons.push({
          text: "Turn into group message",
          onPress: () => {
            Alert.alert(
              "Turn into group message",
              "This will show the message as sent by you in the group chat.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Turn into group message",
                  onPress: () => onConvertToGroupMessage(message.id),
                },
              ]
            );
          },
        });
      }

      if (buttons.length === 0) return;
      buttons.push({ text: "Cancel", style: "cancel" });
      Alert.alert("Message", undefined, buttons);
    }, [
      canEditOwn,
      onEdit,
      canDelete,
      onDelete,
      message.id,
      message.message,
      message.isSystem,
      onConvertToGroupMessage,
    ]);

    const hasAnyAction =
      (canEditOwn && onEdit) ||
      (canDelete && onDelete) ||
      (message.isSystem && onConvertToGroupMessage);

    const showOverflowDot =
      message.isMe &&
      !message.isSystem &&
      hasAnyAction &&
      (onEdit || (canDelete && onDelete));

    const content = (
      <View style={[styles.row, message.isMe ? styles.rowSent : styles.rowOther]}>
        {!message.isMe && (
          <Image source={{ uri: message.senderImg }} style={styles.avatar} />
        )}
        <View style={styles.bubbleColumn}>
          <View
            style={[
              styles.bubble,
              message.isMe
                ? [
                    styles.bubbleSent,
                    FIGMA.bubbleSentRadius,
                    showOverflowDot ? styles.bubbleSentWithMenu : null,
                  ]
                : [styles.bubbleOther, FIGMA.headerShadow],
            ]}
          >
            {showOverflowDot ? (
              <Pressable
                onPress={showMessageActions}
                style={styles.ownOverflow}
                hitSlop={8}
                accessibilityLabel="Message actions"
              >
                <MoreVertical size={18} color={COLORS.timeSent} />
              </Pressable>
            ) : null}
            {message.imageUrl ? (
              <Pressable
                onPress={() => setPreviewOpen(true)}
                accessibilityRole="image"
                accessibilityLabel="View image full screen"
              >
                <Image
                  source={{ uri: message.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </Pressable>
            ) : null}
            {message.fileUrl ? (
              <Pressable
                onPress={() => {
                  Linking.openURL(message.fileUrl!).catch(() => {
                    Alert.alert("Could not open file", "Try again later.");
                  });
                }}
                style={[
                  styles.fileRow,
                  message.isMe ? styles.fileRowSent : styles.fileRowOther,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open attachment ${message.fileName ?? "file"}`}
              >
                <FileText
                  size={18}
                  color={message.isMe ? "#333333" : COLORS.primary}
                />
                <Text
                  style={[styles.fileName, message.isMe ? styles.bodySent : styles.bodyOther]}
                  numberOfLines={2}
                >
                  {message.fileName?.trim() || "Attachment"}
                </Text>
                <Text
                  style={[
                    styles.fileOpenHint,
                    message.isMe ? styles.timeSent : styles.timeOther,
                  ]}
                >
                  Open
                </Text>
              </Pressable>
            ) : null}
            {message.message ? (
              <Text style={[styles.body, message.isMe ? styles.bodySent : styles.bodyOther]}>
                {message.message}
              </Text>
            ) : null}
            <Text style={[styles.time, message.isMe ? styles.timeSent : styles.timeOther]}>
              {message.time}
            </Text>
          </View>
        </View>
        {message.isMe && <View style={styles.spacer} />}
      </View>
    );

    const wrapped =
      hasAnyAction ? (
        <Pressable
          onLongPress={showMessageActions}
          delayLongPress={Platform.OS === "android" ? 450 : 400}
        >
          {content}
        </Pressable>
      ) : (
        content
      );

    return (
      <>
        {wrapped}
        {message.imageUrl ? (
          <ChatImagePreviewModal
            visible={previewOpen}
            imageUrl={message.imageUrl}
            onClose={() => setPreviewOpen(false)}
          />
        ) : null}
      </>
    );
  }
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  rowSent: {
    justifyContent: "flex-end",
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  bubbleColumn: {
    maxWidth: "78%",
  },
  avatar: {
    width: FIGMA.avatarSize,
    height: FIGMA.avatarSize,
    borderRadius: FIGMA.avatarSize / 2,
    backgroundColor: "#E5E5E5",
    marginRight: 8,
  },
  bubble: {
    maxWidth: "100%",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    position: "relative",
  },
  ownOverflow: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    padding: 4,
  },
  image: {
    width: 200,
    maxWidth: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    maxWidth: "100%",
  },
  fileRowSent: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  fileRowOther: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  fileName: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  fileOpenHint: {
    fontSize: 12,
    fontWeight: "600",
  },
  bubbleSent: {
    backgroundColor: COLORS.myMessageBg,
    paddingTop: 14,
  },
  /** Extra top space for ⋮ row; paddingRight keeps body/file text from sitting under the button */
  bubbleSentWithMenu: {
    paddingTop: 22,
    paddingRight: 40,
  },
  bubbleOther: {
    backgroundColor: COLORS.otherMessageBg,
    ...FIGMA.headerShadow,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  bodySent: {
    color: "#000000",
  },
  bodyOther: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMain,
  },
  time: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  timeSent: {
    color: COLORS.timeSent,
    textAlign: "right",
  },
  timeOther: {
    color: COLORS.timeOther,
  },
  spacer: {
    width: 40,
  },
});
