/**
 * Compose Message Screen (Figma "Composing a new message")
 * Recipient picker: Friends + Roster + On Deck (anyone with userId). Multi-select for group, single for direct.
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

/** Unified recipient: friend or roster/on-deck contact with userId */
interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  username?: string;
  source?: "friend" | "roster" | "onDeck";
}

function toRecipientFromFriend(f: { id: string; firstName: string; lastName: string; avatar?: string; username?: string }): Recipient {
  return {
    id: f.id,
    firstName: f.firstName ?? "",
    lastName: f.lastName ?? "",
    avatar: f.avatar,
    username: f.username,
    source: "friend",
  };
}

function toRecipientFromRosterContact(entry: { contact?: { userId?: string; name?: string; avatar?: string } }): Recipient | null {
  const userId = entry.contact?.userId;
  if (!userId) return null;
  const name = entry.contact?.name ?? "";
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") ?? "";
  return {
    id: userId,
    firstName,
    lastName,
    avatar: entry.contact?.avatar,
    source: "roster",
  };
}

export default function ComposeMessageScreen({ navigation }: any) {
  const colors = useColors();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [filteredRecipients, setFilteredRecipients] = useState<Recipient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRecipients();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredRecipients(
        recipients.filter(
          (r) =>
            `${r.firstName} ${r.lastName}`.trim().toLowerCase().includes(query) ||
            r.username?.toLowerCase().includes(query),
        ),
      );
    } else {
      setFilteredRecipients(recipients);
    }
  }, [searchQuery, recipients]);

  const loadRecipients = async () => {
    try {
      const [friendsRes, rosterRes, onDeckRes, blockedRes] = await Promise.all([
        friendApi.getFriends(),
        rosterApi.getRoster(),
        rosterApi.getOnDeck(),
        friendApi.getBlockedUsers(),
      ]);
      const blockedIds = new Set<string>();
      if (blockedRes.success && Array.isArray(blockedRes.blockedUsers)) {
        (blockedRes.blockedUsers as { id?: string }[]).forEach((u) => {
          if (u.id) blockedIds.add(u.id);
        });
      }
      const byId = new Map<string, Recipient>();
      if (friendsRes.success && friendsRes.friends) {
        friendsRes.friends.forEach((f) => {
          if (!blockedIds.has(f.id)) byId.set(f.id, toRecipientFromFriend(f));
        });
      }
      if (rosterRes.success && rosterRes.roster) {
        rosterRes.roster.forEach((entry) => {
          const r = toRecipientFromRosterContact(entry);
          if (r && !blockedIds.has(r.id) && !byId.has(r.id)) byId.set(r.id, r);
        });
      }
      if (onDeckRes.success && onDeckRes.onDeck) {
        onDeckRes.onDeck.forEach((entry) => {
          const r = toRecipientFromRosterContact(entry);
          if (r && !blockedIds.has(r.id)) {
            const existing = byId.get(r.id);
            if (!existing) byId.set(r.id, { ...r, source: "onDeck" });
            else if (existing.source === "roster") byId.set(r.id, { ...existing, source: "onDeck" });
          }
        });
      }
      const list = Array.from(byId.values());
      setRecipients(list);
      setFilteredRecipients(list);
    } catch (error) {
      logger.error("[ComposeMessageScreen] Failed to load recipients", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = useCallback((recipientId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipientId)) next.delete(recipientId);
      else next.add(recipientId);
      return next;
    });
  }, []);

  const handleNext = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (ids.length === 1) {
      const recipientId = ids[0];
      const recipient = recipients.find((r) => r.id === recipientId);
      if (!recipient) return;
      try {
        const convRes = await messagesApi.getOrCreateConversation({ recipientId });
        if (convRes.success && convRes.conversation) {
          navigation?.navigate("ChatDetail", {
            chatInfo: {
              conversationId: convRes.conversation.id,
              recipientId,
              id: recipientId,
              name: `${recipient.firstName} ${recipient.lastName}`.trim() || "Unknown",
              subtitle: "Direct message",
              img: recipient.avatar,
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
  }, [selectedIds, recipients, navigation]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const displayRecipients = useMemo(() => filteredRecipients, [filteredRecipients]);
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
            placeholder="Search friends, roster & on deck..."
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
        ) : displayRecipients.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery.trim() ? "No one found" : "No contacts with messaging available"}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {displayRecipients.map((recipient) => {
              const isSelected = selectedIds.has(recipient.id);
              const displayName = `${recipient.firstName} ${recipient.lastName}`.trim() || "Unknown";
              return (
                <TouchableOpacity
                  key={recipient.id}
                  style={[styles.friendRow, { borderBottomColor: colors.border }]}
                  onPress={() => toggleRecipient(recipient.id)}
                  activeOpacity={0.7}
                >
                  {recipient.avatar ? (
                    <Image source={{ uri: recipient.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceTertiary }]}>
                      <Text style={[styles.avatarText, { color: colors.textMuted }]}>
                        {getInitials(recipient.firstName, recipient.lastName)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {recipient.username ? (
                      <Text style={[styles.friendUsername, { color: colors.textSecondary }]} numberOfLines={1}>
                        @{recipient.username}
                      </Text>
                    ) : recipient.source === "roster" || recipient.source === "onDeck" ? (
                      <Text style={[styles.friendUsername, { color: colors.textSecondary }]} numberOfLines={1}>
                        {recipient.source === "onDeck" ? "On deck" : "Roster"}
                      </Text>
                    ) : null}
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
