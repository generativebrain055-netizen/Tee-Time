/**
 * Compose Message Screen (Figma "Composing a new message")
 * Recipient picker: multi-select for group message, single tap for direct.
 * Next button creates group conversation when multiple users selected.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { Search, Check } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { friendApi, messagesApi, rosterApi } from "../services/api";
import { spacing, fontSize, fontFamily, radii } from "../ui/theme/tokens";
import { useColors } from "../ui/theme/ThemeContext";
import { logger } from "../utils/logger";

interface Friend {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  username?: string;
}

export default function ComposeMessageScreen({ navigation }: any) {
  const colors = useColors();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredFriends(
        friends.filter(
          (f) =>
            `${f.firstName} ${f.lastName}`.toLowerCase().includes(query) ||
            f.username?.toLowerCase().includes(query),
        ),
      );
    } else {
      setFilteredFriends(friends);
    }
  }, [searchQuery, friends]);

  const loadFriends = async () => {
    try {
      const response = await friendApi.getFriends();
      if (response.success && response.friends) {
        setFriends(response.friends);
        setFilteredFriends(response.friends);
      }
    } catch (error) {
      logger.error("[ComposeMessageScreen] Failed to load friends", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = useCallback((friendId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  }, []);

  const handleNext = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (ids.length === 1) {
      const friendId = ids[0];
      const friend = friends.find((f) => f.id === friendId);
      if (!friend) return;
      try {
        const convRes = await messagesApi.getOrCreateConversation({ recipientId: friendId });
        if (convRes.success && convRes.conversation) {
          navigation?.navigate("ChatDetail", {
            chatInfo: {
              conversationId: convRes.conversation.id,
              recipientId: friendId,
              id: friendId,
              name: `${friend.firstName} ${friend.lastName}`,
              subtitle: "Direct message",
              img: friend.avatar,
              isGroup: false,
            },
          });
        }
      } catch (error) {
        logger.error("[ComposeMessageScreen] Failed to create conversation", error);
        Alert.alert("Error", "Could not start conversation. Please try again.");
      }
      return;
    }

    setCreating(true);
    try {
      const groupName = `Group ${Date.now()}`;
      const createRes = await rosterApi.createGroup({
        name: groupName,
        memberIds: ids,
      });
      if (!createRes.success || !createRes.group) {
        Alert.alert("Error", "Could not create group. Please try again.");
        return;
      }
      const groupId = createRes.group.id;
      const convRes = await messagesApi.getOrCreateConversation({ rosterGroupId: groupId });
      if (!convRes.success || !convRes.conversation) {
        Alert.alert("Error", "Group created but could not open chat. Please try again.");
        return;
      }
      const conv = convRes.conversation;
      navigation?.navigate("ChatDetail", {
        chatInfo: {
          conversationId: conv.id,
          groupId,
          id: groupId,
          name: conv.title ?? "Group",
          subtitle: "Group",
          isGroup: true,
          participantCount: conv.participantCount ?? ids.length + 1,
          participantAvatars: conv.participantAvatars,
        },
      });
    } catch (error: any) {
      logger.error("[ComposeMessageScreen] Failed to create group message", error);
      Alert.alert("Error", error?.message ?? "Could not create group chat. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [selectedIds, friends, navigation]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const displayFriends = useMemo(() => filteredFriends, [filteredFriends]);
  const hasSelection = selectedIds.size > 0;

  return (
    <ScreenShell>
      <AppHeader
        title="New message"
        onBack={() => navigation?.goBack()}
        rightComponent={
          hasSelection ? (
            <TouchableOpacity
              onPress={creating ? undefined : handleNext}
              disabled={creating}
              style={styles.nextButton}
            >
              {creating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.nextLabel, { color: colors.primary }]}>Next</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.container}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceSecondary }]}>
          <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search friends..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : displayFriends.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery.trim() ? "No friends found" : "No friends available"}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {displayFriends.map((friend) => {
              const isSelected = selectedIds.has(friend.id);
              return (
                <TouchableOpacity
                  key={friend.id}
                  style={[styles.friendRow, { borderBottomColor: colors.border }]}
                  onPress={() => toggleFriend(friend.id)}
                  activeOpacity={0.7}
                >
                  {friend.avatar ? (
                    <Image source={{ uri: friend.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceTertiary }]}>
                      <Text style={[styles.avatarText, { color: colors.textMuted }]}>
                        {getInitials(friend.firstName, friend.lastName)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {friend.firstName} {friend.lastName}
                    </Text>
                    {friend.username && (
                      <Text style={[styles.friendUsername, { color: colors.textSecondary }]} numberOfLines={1}>
                        @{friend.username}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                      <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    paddingVertical: spacing.xs,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing["4xl"],
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing["3xl"],
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  friendInfo: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  friendName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
  friendUsername: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: spacing["2xs"],
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minWidth: 56,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  nextLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
});
