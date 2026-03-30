import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, MoreVertical, Users } from "lucide-react-native";
import { COLORS, FIGMA } from "../styles";
import { ChatInfo } from "../types";

interface ChatHeaderProps {
  chatInfo: ChatInfo;
  onBack: () => void;
  onMenuPress: () => void;
}

/** Figma 1379-5818: Chat - Expanded field – group header with avatar stack and "N players" */
const GROUP_STACK_SIZE = FIGMA.headerGroupStackSize ?? 47;
const BADGE_SIZE = FIGMA.headerGroupStackBadgeSize ?? 22;

export const ChatHeader = memo(({ chatInfo, onBack, onMenuPress }: ChatHeaderProps) => {
  const insets = useSafeAreaInsets();
  const isRosterGroupChat = !!chatInfo.groupId && !chatInfo.teeTimeId;
  const groupPhotoUri =
    isRosterGroupChat && chatInfo.img && String(chatInfo.img).trim()
      ? String(chatInfo.img).trim()
      : null;
  const isExpandedGroup =
    chatInfo.isGroup &&
    !groupPhotoUri &&
    (chatInfo.participantCount != null || (chatInfo.participantAvatars?.length ?? 0) > 0);
  const avatars = chatInfo.participantAvatars ?? [];
  const count = chatInfo.participantCount ?? Math.max(avatars.length + 1, 2);
  const displaySubtitle =
    chatInfo.participantCount != null
      ? `${chatInfo.participantCount} players`
      : chatInfo.subtitle;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 48) },
        FIGMA.headerShadow,
      ]}
    >
      <View style={styles.row}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={8}>
          <ArrowLeft size={20} color="#4B5563" strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.titleRow}
          onPress={chatInfo.onHeaderPress}
          activeOpacity={chatInfo.isGroup ? 0.7 : 1}
          disabled={!chatInfo.isGroup}
        >
          <View style={styles.avatarWrap}>
            {chatInfo.isGroup ? (
              groupPhotoUri ? (
                <Image source={{ uri: groupPhotoUri }} style={styles.avatar} />
              ) : isExpandedGroup ? (
                <View style={[styles.groupStack, { width: GROUP_STACK_SIZE, height: GROUP_STACK_SIZE }]}>
                  {avatars.length >= 1 ? (
                    <Image source={{ uri: avatars[0] }} style={[styles.groupStackCircle, styles.groupStackFirst]} />
                  ) : (
                    <View style={[styles.groupStackCircle, styles.groupStackFirst, styles.groupStackPlaceholder]}>
                      <Users size={14} color={COLORS.white} />
                    </View>
                  )}
                  {avatars.length >= 2 ? (
                    <Image source={{ uri: avatars[1] }} style={[styles.groupStackCircle, styles.groupStackSecond]} />
                  ) : (
                    <View style={[styles.groupStackCircle, styles.groupStackSecond, styles.groupStackPlaceholder]} />
                  )}
                  {avatars.length >= 3 ? (
                    <Image source={{ uri: avatars[2] }} style={[styles.groupStackCircle, styles.groupStackThird]} />
                  ) : null}
                  <View style={[styles.groupStackBadge, { width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2 }]}>
                    <Text style={styles.groupStackBadgeText}>{count > 9 ? "9+" : String(count)}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.avatarGroup}>
                  <Users size={18} color={COLORS.white} />
                </View>
              )
            ) : (
              <Image source={{ uri: chatInfo.img }} style={styles.avatar} />
            )}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>
              {chatInfo.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {displaySubtitle}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress} hitSlop={8}>
          <MoreVertical size={20} color="#474747" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: FIGMA.headerHeight,
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    justifyContent: "flex-end",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 8,
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: FIGMA.avatarSizeHeader,
    height: FIGMA.avatarSizeHeader,
    borderRadius: FIGMA.avatarSizeHeader / 2,
    backgroundColor: "#E5E5E5",
  },
  avatarGroup: {
    width: FIGMA.avatarSizeHeader,
    height: FIGMA.avatarSizeHeader,
    borderRadius: FIGMA.avatarSizeHeader / 2,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  /** Figma 1379-5818: overlapping avatar stack in group chat header */
  groupStack: {
    position: "relative",
  },
  groupStackCircle: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    backgroundColor: "#E5E5E5",
  },
  groupStackFirst: { left: 0, top: 0 },
  groupStackSecond: { left: 12, top: 12 },
  groupStackThird: { left: 24, top: 0 },
  groupStackPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  groupStackBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#9D9D9D",
    borderWidth: 1.5,
    borderColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  groupStackBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.white,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: "600",
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textMain,
  },
  subtitle: {
    fontWeight: "500",
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSub,
    marginTop: 2,
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
