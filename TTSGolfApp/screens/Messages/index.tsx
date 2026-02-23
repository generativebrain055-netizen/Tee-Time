import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ListRenderItem,
  StyleSheet,
} from "react-native";
import { Edit3, MessageCircle } from "lucide-react-native";
import { messagesApi } from "../../services/api";
import type { ConversationListItem } from "../../services/api/messagesApi";
import { ScreenShell, AppHeader, AppBottomNav } from "../../ui";
import { useColors } from "../../ui/theme/ThemeContext";
import { spacing, fontSize, palette, radii } from "../../ui/theme/tokens";
import type {
  MessageTab,
  AllConversationItem,
  TeeTimeConversationItem,
  GroupConversationItem,
  ConversationItem,
} from "./types";
import { getInitials, formatRelativeTime } from "./utils";
import { getAvatarColor } from "../../utils/formatting";
import { logger } from "../../utils/logger";
import { AdsSection } from "../Home/components";
import { DEFAULT_AD_SLOTS } from "../Home/constants";

const TABS: MessageTab[] = ["All", "Tee Times", "Groups"];

function mapToAllItem(c: ConversationListItem): AllConversationItem {
  return {
    id: c.id,
    type: "all",
    recipientId: c.otherUserId ?? c.id,
    name: c.title,
    avatar: c.avatarUrl ?? undefined,
    lastMessage: c.lastMessage?.body ?? "Start a conversation",
    lastMessageTime: c.lastMessage?.created_at ? formatRelativeTime(c.lastMessage.created_at) : "",
    unread: c.unreadCount ?? 0,
  };
}

function mapToTeeTimeItem(c: ConversationListItem): TeeTimeConversationItem {
  const avatars = c.participantAvatars ?? [];
  const count = c.participantCount ?? Math.max(avatars.length + 1, 2);
  return {
    id: c.id,
    type: "teeTime",
    teeTimeId: c.tee_time_id ?? c.id,
    title: c.title,
    courseName: c.subtitle,
    courseLocation: undefined,
    teeDate: "",
    teeTime: "",
    participantCount: count,
    participantInitials: c.participantInitials ?? "TT",
    participantAvatars: avatars,
    lastMessage: c.lastMessage?.body ?? "No messages yet",
    lastMessageTime: c.lastMessage?.created_at ? formatRelativeTime(c.lastMessage.created_at) : "",
    unread: c.unreadCount ?? 0,
  };
}

function mapToGroupItem(c: ConversationListItem): GroupConversationItem {
  const avatars = c.participantAvatars ?? [];
  const count = c.participantCount ?? (avatars.length > 0 ? avatars.length + 1 : undefined);
  return {
    id: c.id,
    type: "group",
    groupId: c.roster_group_id ?? c.id,
    name: c.title,
    initials: c.participantInitials ?? getInitials(c.title),
    color: getAvatarColor(c.id),
    lastMessage: c.lastMessage?.body ?? "No messages yet",
    lastMessageTime: c.lastMessage?.created_at ? formatRelativeTime(c.lastMessage.created_at) : "",
    unread: c.unreadCount ?? 0,
    participantCount: count ?? undefined,
    participantAvatars: avatars.length > 0 ? avatars : undefined,
  };
}

/** Figma 503-1008, 785-352, 503-1393; 914-343 (Messages All mixed instance) */
const FIGMA_ROW_HEIGHT = 88;
const FIGMA_AVATAR_SIZE = 54;
const FIGMA_ROW_PADDING_LEFT = 19;
const FIGMA_AVATAR_TO_TEXT_GAP = 13;
const FIGMA_SEPARATOR_MARGIN_LEFT = FIGMA_ROW_PADDING_LEFT + FIGMA_AVATAR_SIZE + FIGMA_AVATAR_TO_TEXT_GAP; // 86
const FIGMA_TAB_BAR_BG = "#F8F8F8";
const FIGMA_TAB_PILL_RADIUS = 26.5; // 53/2
const FIGMA_GROUP_AVATAR_BLUE = "#2563EB";
const FIGMA_TEE_TIME_AVATAR_SIZE = 36;

const AllRow = memo(
  ({ item, onPress }: { item: AllConversationItem; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.row, styles.rowBg]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitials}>{getInitials(item.name)}</Text>
          </View>
        )}
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTitleRow}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          {item.lastMessageTime ? (
            <Text style={[styles.rowTime, item.unread != null && item.unread > 0 ? styles.rowTimeUnread : null]}>{item.lastMessageTime}</Text>
          ) : null}
          {item.unread != null && item.unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unread}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.rowPreview} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
    </TouchableOpacity>
  )
);

const TeeTimeRow = memo(
  ({ item, onPress }: { item: TeeTimeConversationItem; onPress: () => void }) => {
    const avatars = item.participantAvatars ?? [];
    const showStack = avatars.length > 0;
    return (
      <TouchableOpacity
        style={[styles.row, styles.rowBg]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          {showStack ? (
            <View style={styles.teeTimeStack}>
              <Image source={{ uri: avatars[0] }} style={styles.teeTimeCircle} />
              {avatars.length >= 2 ? (
                <Image source={{ uri: avatars[1] }} style={[styles.teeTimeCircle, styles.teeTimeCircleSecond]} />
              ) : (
                <View style={[styles.teeTimeCircle, styles.teeTimeCircleSecond, styles.avatarTeeTime]}>
                  <Text style={styles.avatarInitialsTeeTime}>{item.participantInitials ?? "TT"}</Text>
                </View>
              )}
              <View style={styles.teeTimeBadge}>
                <Text style={styles.teeTimeBadgeText}>{String(item.participantCount || avatars.length + 1 || 2)}</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.avatar, styles.avatarTeeTime]}>
              <Text style={styles.avatarInitialsTeeTime}>{item.participantInitials ?? "TT"}</Text>
            </View>
          )}
        </View>
        <View style={styles.rowContent}>
          <View style={styles.rowTitleRow}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
            {item.lastMessageTime ? (
              <Text style={[styles.rowTime, item.unread != null && item.unread > 0 ? styles.rowTimeUnread : null]}>{item.lastMessageTime}</Text>
            ) : null}
            {item.unread != null && item.unread > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unread}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.rowPreview} numberOfLines={1}>{item.lastMessage}</Text>
        </View>
      </TouchableOpacity>
    );
  }
);

const GroupRow = memo(
  ({ item, onPress }: { item: GroupConversationItem; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.row, styles.rowBg]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarGroup, { backgroundColor: item.color ?? FIGMA_GROUP_AVATAR_BLUE }]}>
            <Text style={styles.avatarGroupInitials}>{item.initials}</Text>
          </View>
        )}
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTitleRow}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          {item.lastMessageTime ? (
            <Text style={[styles.rowTime, item.unread != null && item.unread > 0 ? styles.rowTimeUnread : null]}>{item.lastMessageTime}</Text>
          ) : null}
          {item.unread != null && item.unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unread}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.rowPreview} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
    </TouchableOpacity>
  )
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: FIGMA_ROW_HEIGHT,
    paddingLeft: FIGMA_ROW_PADDING_LEFT,
    paddingRight: FIGMA_ROW_PADDING_LEFT,
    paddingVertical: (FIGMA_ROW_HEIGHT - FIGMA_AVATAR_SIZE) / 2,
  },
  rowBg: {
    backgroundColor: palette.white,
  },
  avatarWrap: {
    marginRight: FIGMA_AVATAR_TO_TEXT_GAP,
  },
  avatar: {
    width: FIGMA_AVATAR_SIZE,
    height: FIGMA_AVATAR_SIZE,
    borderRadius: FIGMA_AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    backgroundColor: "#9D9D9D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTeeTime: {
    backgroundColor: palette.green500,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGroup: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.gray500,
  },
  avatarInitialsTeeTime: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.white,
  },
  avatarInitialsWhite: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.white,
  },
  avatarGroupInitials: {
    fontSize: 16,
    fontWeight: "500",
    color: palette.white,
  },
  teeTimeStack: {
    width: 52,
    height: 52,
    position: "relative",
  },
  teeTimeCircle: {
    position: "absolute",
    left: 16,
    top: 0,
    width: FIGMA_TEE_TIME_AVATAR_SIZE,
    height: FIGMA_TEE_TIME_AVATAR_SIZE,
    borderRadius: FIGMA_TEE_TIME_AVATAR_SIZE / 2,
    borderWidth: 1.5,
    borderColor: palette.white,
  },
  teeTimeCircleSecond: {
    left: 0,
    top: 15,
  },
  teeTimeBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DFDFDF",
    borderWidth: 0.7,
    borderColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
  },
  teeTimeBadgeText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#545454",
  },
  unreadBadge: {
    minWidth: 18,
    height: 14,
    borderRadius: 7,
    backgroundColor: palette.green500,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    fontSize: 10.2,
    fontWeight: "700",
    color: palette.white,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    color: "#1F2937",
    flex: 1,
    marginRight: 8,
  },
  rowTime: {
    fontSize: 12,
    lineHeight: 16,
    color: "#6B7280",
  },
  /** Figma 914-343: unread row time uses fontWeight 600 */
  rowTimeUnread: {
    fontWeight: "600",
  },
  rowPreview: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1F2937",
    marginTop: 4,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: FIGMA_TAB_BAR_BG,
    gap: 10,
  },
  tabPill: {
    paddingVertical: 3,
    paddingHorizontal: 14,
    borderRadius: FIGMA_TAB_PILL_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPillActive: {
    backgroundColor: palette.green500,
  },
  tabPillInactive: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  tabLabelInactive: {
    fontWeight: "400",
    color: "#000000",
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F1F1",
    marginLeft: FIGMA_SEPARATOR_MARGIN_LEFT,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing["4xl"],
    paddingVertical: spacing["7xl"],
  },
  emptyIcon: { marginBottom: spacing.lg },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: palette.gray900,
    marginTop: spacing.lg,
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: palette.gray500,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});

function MessagesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<MessageTab>("All");
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colors = useColors();

  const loadData = useCallback(async () => {
    try {
      const res = await messagesApi.listConversations();
      if (res.success && res.conversations) setConversations(res.conversations);
    } catch (e) {
      logger.warn("[MessagesScreen] Messages load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const allItems = useMemo(
    () => conversations.filter((c) => c.type === "direct").map(mapToAllItem),
    [conversations]
  );
  const teeTimeItems = useMemo(
    () => conversations.filter((c) => c.type === "tee_time").map(mapToTeeTimeItem),
    [conversations]
  );
  const groupItems = useMemo(
    () => conversations.filter((c) => c.type === "group").map(mapToGroupItem),
    [conversations]
  );

  const currentList = useMemo(() => {
    if (activeTab === "All") return allItems;
    if (activeTab === "Tee Times") return teeTimeItems;
    return groupItems;
  }, [activeTab, allItems, teeTimeItems, groupItems]);

  const handleCompose = useCallback(() => {
    navigation?.navigate("ComposeMessage");
  }, [navigation]);

  const handleAllPress = useCallback(
    (item: AllConversationItem) => {
      navigation?.navigate("ChatDetail", {
        chatInfo: {
          conversationId: item.id,
          recipientId: item.recipientId,
          id: item.id,
          name: item.name,
          subtitle: "Direct message",
          img: item.avatar,
          isGroup: false,
        },
      });
    },
    [navigation]
  );

  const handleTeeTimePress = useCallback(
    (item: TeeTimeConversationItem) => {
      navigation?.navigate("ChatDetail", {
        chatInfo: {
          conversationId: item.id,
          teeTimeId: item.teeTimeId,
          id: item.teeTimeId,
          name: item.title,
          subtitle: item.courseName,
          isGroup: true,
          /** Figma 1269-2492 Tee Time Chat - Detailed: header shows "N players" + avatar stack */
          participantCount: item.participantCount,
          participantAvatars: item.participantAvatars,
        },
      });
    },
    [navigation]
  );

  const handleGroupPress = useCallback(
    (item: GroupConversationItem) => {
      navigation?.navigate("ChatDetail", {
        chatInfo: {
          conversationId: item.id,
          groupId: item.groupId,
          id: item.groupId,
          name: item.name,
          subtitle: "Group",
          img: item.avatar,
          isGroup: true,
          participantCount: item.participantCount,
          participantAvatars: item.participantAvatars,
        },
      });
    },
    [navigation]
  );

  const renderItem: ListRenderItem<ConversationItem> = useCallback(
    ({ item }) => {
      if (item.type === "all")
        return <AllRow item={item} onPress={() => handleAllPress(item)} />;
      if (item.type === "teeTime")
        return <TeeTimeRow item={item} onPress={() => handleTeeTimePress(item)} />;
      return <GroupRow item={item} onPress={() => handleGroupPress(item)} />;
    },
    [handleAllPress, handleTeeTimePress, handleGroupPress]
  );

  const keyExtractor = useCallback((item: ConversationItem) => item.id, []);

  const listEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyWrap}>
        <MessageCircle size={48} color={palette.gray400} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptySub}>
          Add friends from the Availability tab to start messaging
        </Text>
      </View>
    );
  }, [loading]);

  const totalUnreadAll = allItems.reduce((s, i) => s + (i.unread ?? 0), 0);
  const totalUnreadTeeTimes = teeTimeItems.reduce((s, i) => s + (i.unread ?? 0), 0);
  const totalUnreadGroups = groupItems.reduce((s, i) => s + (i.unread ?? 0), 0);
  const tabLabel = (tab: MessageTab) => {
    if (tab === "All" && totalUnreadAll > 0) return `All (${totalUnreadAll})`;
    if (tab === "Tee Times" && totalUnreadTeeTimes > 0) return `Tee Times (${totalUnreadTeeTimes})`;
    if (tab === "Groups" && totalUnreadGroups > 0) return `Groups (${totalUnreadGroups})`;
    return tab;
  };

  return (
    <ScreenShell>
      <AppHeader
        title="Messages"
        showBack={false}
        rightComponent={
          <TouchableOpacity onPress={handleCompose} style={{ padding: spacing.xs }}>
            <Edit3 size={24} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const label = tabLabel(tab);
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabPill, isActive ? styles.tabPillActive : styles.tabPillInactive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabLabel, isActive ? { color: palette.white } : styles.tabLabelInactive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={[styles.emptyWrap, { backgroundColor: palette.white }]}>
          <Text style={{ color: palette.gray400 }}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={<AdsSection title="Sponsored" slots={DEFAULT_AD_SLOTS} />}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={
            currentList.length === 0 ? { flex: 1 } : { paddingBottom: 100 }
          }
          style={{ backgroundColor: palette.white }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.green500}
            />
          }
        />
      )}

      <AppBottomNav activeTab="Messages" navigation={navigation} />
    </ScreenShell>
  );
}

export default memo(MessagesScreen);
