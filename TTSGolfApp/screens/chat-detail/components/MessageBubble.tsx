import React, { memo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { COLORS, FIGMA } from "../styles";
import { ChatMessage } from "../types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble = memo(({ message }: MessageBubbleProps) => (
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
      <Text style={[styles.body, message.isMe ? styles.bodySent : styles.bodyOther]}>
        {message.message}
      </Text>
      <Text style={[styles.time, message.isMe ? styles.timeSent : styles.timeOther]}>
        {message.time}
      </Text>
    </View>
    {message.isMe && <View style={styles.spacer} />}
  </View>
));

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
