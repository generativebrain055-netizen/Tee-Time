import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ListRenderItem,
} from "react-native";
import { Edit3, MessageCircle } from "lucide-react-native";
import { MotiView } from "moti";
import { Card } from "react-native-paper";
import { friendApi, rosterApi } from "../../services/api";
import { useTeeTimeStore } from "../../stores";
import { ScreenShell, AppHeader, AppBottomNav } from "../../ui";
import { useColors } from "../../ui/theme/ThemeContext";
import { transitions } from "../../ui/motion/presets";
import type { Friend } from "../../services/api";
import type { RosterGroup } from "../../services/api";
import type { TeeTime } from "../../services/api";
import type {
  MessageTab,
  AllConversationItem,
  TeeTimeConversationItem,
  GroupConversationItem,
  ConversationItem,
} from "./types";
import { getInitials } from "./utils";
import { formatTime } from "../../utils/formatting";
import { cn } from "../../utils/cn";

const TABS: MessageTab[] = ["All", "Tee Times", "Groups"];

function buildAllItems(friends: Friend[]): AllConversationItem[] {
  return friends.map((f) => ({
    id: f.id,
    type: "all" as const,
    recipientId: f.id,
    name: `${f.firstName ?? ""} ${f.lastName ?? ""}`.trim() || "Unknown",
    avatar: f.avatar,
    lastMessage: "Start a conversation",
    lastMessageTime: "",
    unread: 0,
  }));
}

function buildTeeTimeItems(teeTimes: TeeTime[]): TeeTimeConversationItem[] {
  return teeTimes.map((tt) => {
    const d = new Date(tt.teeDate);
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    const time = formatTime(tt.teeTime);
    const title = `${month} ${day} @ ${tt.courseName} - ${time}`;
    const participants = tt.participants ?? [];
    const initials =
      participants.length >= 2
        ? participants
            .slice(0, 2)
            .map((p) => (p.name || "?")[0])
            .join("")
            .toUpperCase()
        : "TR";
    return {
      id: tt.id,
      type: "teeTime" as const,
      teeTimeId: tt.id,
      title,
      courseName: tt.courseName,
      courseLocation: tt.courseLocation,
      teeDate: tt.teeDate,
      teeTime: tt.teeTime,
      participantCount: participants.length || tt.maxPlayers,
      participantInitials: initials,
      participantAvatars: participants.slice(0, 3).map((p) => p.avatar).filter(Boolean) as string[],
      lastMessage: participants[0]
        ? `${participants[0].name?.split(" ")[0] ?? "Someone"}: Looking forward to it!`
        : "No messages yet",
      lastMessageTime: "2m ago",
    };
  });
}

function buildGroupItems(groups: RosterGroup[]): GroupConversationItem[] {
  return groups.map((g) => ({
    id: g.id,
    type: "group" as const,
    groupId: g.id,
    name: g.name,
    initials: getInitials(g.name),
    color: g.color ?? "#3B82F6",
    lastMessage: "You: Maybe next week?",
    lastMessageTime: "1w ago",
    unread: 0,
  }));
}

const AllRow = memo(
  ({ item, onPress }: { item: AllConversationItem; onPress: () => void }) => (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ marginRight: 14 }}>
        {item.avatar ? (
          <Image
            source={{ uri: item.avatar }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
            }}
          />
        ) : (
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#E5E7EB",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#6B7280" }}>
              {getInitials(item.name)}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "600", color: "#111827", flex: 1, marginRight: 8 }} numberOfLines={1}>
            {item.name}
          </Text>
          {item.lastMessageTime ? (
            <Text style={{ fontSize: 13, color: "#9CA3AF" }}>{item.lastMessageTime}</Text>
          ) : null}
        </View>
        <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 4 }} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  )
);

const TeeTimeRow = memo(
  ({ item, onPress }: { item: TeeTimeConversationItem; onPress: () => void }) => (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ marginRight: 14 }}>
        {item.participantAvatars && item.participantAvatars.length > 0 ? (
          <Image
            source={{ uri: item.participantAvatars[0] }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
            }}
          />
        ) : (
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#22C55E",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              {item.participantInitials}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "600", color: "#111827", flex: 1, marginRight: 8 }} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 13, color: "#9CA3AF" }}>{item.lastMessageTime}</Text>
        </View>
        <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 4 }} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  )
);

const GroupRow = memo(
  ({ item, onPress }: { item: GroupConversationItem; onPress: () => void }) => (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ marginRight: 14 }}>
        {item.avatar ? (
          <Image
            source={{ uri: item.avatar }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
            }}
          />
        ) : (
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: item.color ?? "#3B82F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#FFFFFF" }}>{item.initials}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "600", color: "#111827", flex: 1, marginRight: 8 }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 13, color: "#9CA3AF" }}>{item.lastMessageTime}</Text>
        </View>
        <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 4 }} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  )
);

function MessagesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<MessageTab>("All");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<RosterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colors = useColors();

  const upcomingTeeTimes = useTeeTimeStore((s) => s.upcomingTeeTimes);
  const fetchUpcoming = useTeeTimeStore((s) => s.fetchUpcoming);

  const loadData = useCallback(async () => {
    try {
      const [friendsRes, groupsRes] = await Promise.all([
        friendApi.getFriends(),
        rosterApi.getGroups(),
      ]);
      if (friendsRes.success && friendsRes.friends) setFriends(friendsRes.friends);
      if (groupsRes.success && groupsRes.groups) setGroups(groupsRes.groups);
      await fetchUpcoming(20);
    } catch (e) {
      console.warn("Messages load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchUpcoming]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const allItems = useMemo(() => buildAllItems(friends), [friends]);
  const teeTimeItems = useMemo(() => buildTeeTimeItems(upcomingTeeTimes), [upcomingTeeTimes]);
  const groupItems = useMemo(() => buildGroupItems(groups), [groups]);

  const currentList = useMemo(() => {
    if (activeTab === "All") return allItems;
    if (activeTab === "Tee Times") return teeTimeItems;
    return groupItems;
  }, [activeTab, allItems, teeTimeItems, groupItems]);

  const handleCompose = useCallback(() => {
    // Navigate to compose / friend picker when you add that screen
  }, []);

  const handleAllPress = useCallback(
    (item: AllConversationItem) => {
      navigation?.navigate("ChatDetail", {
        chatInfo: {
          id: item.id,
          recipientId: item.recipientId,
          name: item.name,
          subtitle: "Active now",
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
          id: item.teeTimeId,
          teeTimeId: item.teeTimeId,
          name: item.title,
          subtitle: item.courseName,
          isGroup: true,
        },
      });
    },
    [navigation]
  );

  const handleGroupPress = useCallback(
    (item: GroupConversationItem) => {
      navigation?.navigate("ChatDetail", {
        chatInfo: {
          id: item.groupId,
          groupId: item.groupId,
          name: item.name,
          subtitle: "Group",
          img: item.avatar,
          isGroup: true,
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, paddingVertical: 80 }}>
        <MessageCircle size={48} color="#9CA3AF" />
        <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", marginTop: 16 }}>
          No conversations yet
        </Text>
        <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 8 }}>
          Add friends from the Availability tab to start messaging
        </Text>
      </View>
    );
  }, [loading]);

  const unreadAllCount = allItems.filter((i) => i.unread && i.unread > 0).length;
  const tabLabel = (tab: MessageTab) =>
    tab === "All" && unreadAllCount > 0 ? `All (${unreadAllCount})` : tab;

  return (
    <ScreenShell>
      <AppHeader
        title="Messages"
        showBack={false}
        rightComponent={
          <TouchableOpacity onPress={handleCompose} style={{ padding: 4 }}>
            <Edit3 size={24} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      <View style={{
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        gap: 10,
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const label = tabLabel(tab);
          return (
            <TouchableOpacity
              key={tab}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: isActive ? "#22C55E" : "#FFFFFF",
                borderWidth: isActive ? 0 : 1,
                borderColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: isActive ? "#FFFFFF" : "#6B7280",
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
          <Text style={{ color: "#9CA3AF" }}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={
            currentList.length === 0 ? { flex: 1 } : { paddingBottom: 100 }
          }
          style={{ backgroundColor: "#FFFFFF" }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: "#F3F4F6", marginLeft: 94 }} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5EBC68"
            />
          }
        />
      )}

      <AppBottomNav activeTab="Messages" navigation={navigation} />
    </ScreenShell>
  );
}

export default memo(MessagesScreen);
