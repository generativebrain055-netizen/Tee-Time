import React, { memo } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { COLORS, FIGMA } from "../styles";
import { ChatMessage } from "../types";

interface MessageBubbleProps {
  message: ChatMessage;
  /** When set, system messages show long-press to turn into a group message */
  onConvertToGroupMessage?: (messageId: string) => void;
  /** When true, long-press shows Delete (sender or tee time organizer) */
  canDelete?: boolean;
  /** Callback when user confirms delete */
  onDelete?: (messageId: string) => void;
}

export const MessageBubble = memo(({ message, onConvertToGroupMessage, canDelete, onDelete }: MessageBubbleProps) => {
  const showLongPress = (message.isSystem && onConvertToGroupMessage) || (canDelete && onDelete);

  const handleLongPress = () => {
    if (!showLongPress) return;
    const buttons: Array<{ text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }> = [];
    if (canDelete && onDelete) {
      buttons.push({
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete message",
            "Remove this message from the conversation?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(message.id) },
            ]
          );
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
              { text: "Turn into group message", onPress: () => onConvertToGroupMessage(message.id) },
            ]
          );
        },
      });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Message", undefined, buttons);
  };

  const content = (
    <View style={[styles.row, message.isMe ? styles.rowSent : styles.rowOther]}>
      {!message.isMe && (
        <Image
          source={{ uri: message.senderImg }}
          style={styles.avatar}
        />
      )}
      <View
        style={[
          styles.bubble,
          message.isMe
            ? [styles.bubbleSent, FIGMA.bubbleSentRadius]
            : [styles.bubbleOther, FIGMA.bubbleOtherRadius],
        ]}
      >
        {message.imageUrl ? (
          <Image
            source={{ uri: message.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
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
      {message.isMe && <View style={styles.spacer} />}
    </View>
  );

  if (showLongPress) {
    return (
      <TouchableOpacity activeOpacity={1} onLongPress={handleLongPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

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
  avatar: {
    width: FIGMA.avatarSize,
    height: FIGMA.avatarSize,
    borderRadius: FIGMA.avatarSize / 2,
    backgroundColor: "#E5E5E5",
    marginRight: 8,
  },
  bubble: {
    maxWidth: "70%",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  image: {
    width: 200,
    maxWidth: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  bubbleSent: {
    backgroundColor: COLORS.myMessageBg,
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
