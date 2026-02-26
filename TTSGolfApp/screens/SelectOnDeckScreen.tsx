import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { X, Check, Users, Search } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { rosterApi, teeTimeApi } from "../services/api";
import { logger } from "../utils/logger";
import { useAuthStore } from "../stores";
import { formatTime } from "../utils/formatting";
import type { RosterContact } from "../services/api/types/roster";
import type { TeeTime, TeeTimeParticipant } from "../services/api/types/teeTime";

const COLORS = {
  primary: "#5EBC68",
  white: "#FFFFFF",
  textSub: "#6B7280",
  textMain: "#111827",
  border: "#E5E7EB",
  placeholder: "#9CA3AF",
  selectedBg: "#5EBC68",
};

interface SelectOnDeckScreenProps {
  navigation: any;
  route: {
    params: {
      teeTimeId: string;
      spotsRemaining: number;
      courseName?: string;
      teeDate?: string;
      teeTime?: string;
      unfilledSlotAlert?: boolean;
    };
  };
}

function getDateSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function formatTeeDateAndTime(teeDate: string, teeTime: string): string {
  const date = new Date(teeDate);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const dateStr = `${weekday}, ${day}${getDateSuffix(day)} ${month} ${date.getFullYear()}`;
  const timeStr = formatTime(teeTime);
  return timeStr ? `${dateStr} - ${timeStr}` : dateStr;
}

function getShortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}`.trim();
  return parts[0] || "?";
}

const SlotCircle = memo(({
  participant,
  isCurrentUser,
  isEmpty,
}: {
  participant?: TeeTimeParticipant & { avatar?: string };
  isCurrentUser?: boolean;
  isEmpty: boolean;
}) => {
  if (isEmpty) {
    return (
      <View style={{ alignItems: "center", minWidth: 56 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: COLORS.border,
            backgroundColor: COLORS.white,
          }}
        />
      </View>
    );
  }
  const name = participant?.name ?? "?";
  const label = isCurrentUser ? "You" : getShortName(name);
  const avatar = participant?.avatar;
  const initial = name.charAt(0).toUpperCase();

  return (
    <View style={{ alignItems: "center", minWidth: 56 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: COLORS.primary,
          overflow: "hidden",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} />
        ) : (
          <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.textSub }}>{initial}</Text>
        )}
        <View
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: COLORS.primary,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Check size={12} color={COLORS.white} strokeWidth={3} />
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 11,
          color: COLORS.textMain,
          marginTop: 4,
          maxWidth: 56,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
});

const PlayerRow = memo(
  ({
    contact,
    isSelected,
    onPress,
    disabled,
  }: {
    contact: RosterContact;
    isSelected: boolean;
    onPress: () => void;
    disabled: boolean;
  }) => {
    const name = contact.contact?.name ?? "Unknown";
    const initial = name.charAt(0).toUpperCase();
    const avatar = contact.contact?.avatar;

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled && !isSelected}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: COLORS.white,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#F3F4F6",
            overflow: "hidden",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.textSub }}>{initial}</Text>
          )}
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: "500",
            color: COLORS.textMain,
            marginLeft: 12,
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled && !isSelected}
          activeOpacity={0.8}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 8,
            backgroundColor: isSelected ? COLORS.selectedBg : COLORS.white,
            borderWidth: isSelected ? 0 : 1,
            borderColor: COLORS.border,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: isSelected ? COLORS.white : COLORS.textMain,
            }}
          >
            {isSelected ? "Selected" : "+ Invite"}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  },
);

export default function SelectOnDeckScreen({ navigation, route }: SelectOnDeckScreenProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { teeTimeId, spotsRemaining, courseName, teeDate, teeTime, unfilledSlotAlert } =
    route.params;

  const [onDeckPlayers, setOnDeckPlayers] = useState<RosterContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teeTimeDetail, setTeeTimeDetail] = useState<{
    participants?: TeeTimeParticipant[];
    maxPlayers: number;
    teeDate: string;
    teeTime: string;
  } | null>(null);

  const currentUserId = user?.id;

  useEffect(() => {
    loadData();
  }, [teeTimeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [onDeckRes, teeTimeRes] = await Promise.all([
        rosterApi.getOnDeck(),
        unfilledSlotAlert ? teeTimeApi.getTeeTime(teeTimeId) : Promise.resolve(null),
      ]);
      if (onDeckRes.success && onDeckRes.onDeck) {
        setOnDeckPlayers(onDeckRes.onDeck);
      }
      if (teeTimeRes?.success && teeTimeRes.teeTime) {
        const tt = teeTimeRes.teeTime as TeeTime;
        setTeeTimeDetail({
          participants: tt.participants ?? [],
          maxPlayers: tt.maxPlayers ?? 4,
          teeDate: tt.teeDate,
          teeTime: tt.teeTime,
        });
      } else if (teeDate && teeTime) {
        setTeeTimeDetail({
          participants: [],
          maxPlayers: spotsRemaining + 1,
          teeDate,
          teeTime,
        });
      }
    } catch (error) {
      logger.error("[SelectOnDeckScreen] Error loading data", error);
      Alert.alert("Error", "Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length < spotsRemaining) return [...prev, id];
        return prev;
      });
    },
    [spotsRemaining],
  );

  const handleSendInvites = async () => {
    if (selectedIds.length === 0) {
      Alert.alert("Select Players", "Please select at least one player to invite.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await teeTimeApi.sendOnDeckInvites(teeTimeId, selectedIds);
      if (response.success) {
        Alert.alert(
          "Invites Sent!",
          `${selectedIds.length} player${selectedIds.length > 1 ? "s have" : " has"} been invited. First to respond will be added!`,
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
      } else {
        throw new Error((response as any).message || "Failed to send invites");
      }
    } catch (error: any) {
      logger.error("[SelectOnDeckScreen] Error sending invites", error);
      Alert.alert("Error", error?.message ?? "Failed to send invites");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPlayers = searchQuery.trim()
    ? onDeckPlayers.filter((p) =>
        (p.contact?.name ?? "")
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()),
      )
    : onDeckPlayers;

  const selectedPlayers = onDeckPlayers.filter((p) => selectedIds.includes(p.id));
  const unselectedPlayers = filteredPlayers.filter((p) => !selectedIds.includes(p.id));

  const displayDate = teeTimeDetail?.teeDate ?? teeDate ?? "";
  const displayTime = teeTimeDetail?.teeTime ?? teeTime ?? "";
  const maxPlayers = teeTimeDetail?.maxPlayers ?? 4;
  const participants = teeTimeDetail?.participants ?? [];
  const dateTimeStr = displayDate && displayTime
    ? formatTeeDateAndTime(displayDate, displayTime)
    : [teeDate, teeTime].filter(Boolean).join(" • ") || "Tee time";

  if (loading) {
    return (
      <ScreenShell>
        <AppHeader
          title={unfilledSlotAlert ? "Invite more players" : "Select On-Deck Players"}
          onBack={() => navigation.goBack()}
        />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenShell>
    );
  }

  // —— Unfilled slot alert: modal-style "Invite more players" (match design) ——
  if (unfilledSlotAlert) {
    return (
      <Modal
        visible
        transparent
        animationType="slide"
        onRequestClose={() => navigation.goBack()}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
            onPress={() => navigation.goBack()}
          >
            <View
              style={{
                backgroundColor: COLORS.white,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                maxHeight: "92%",
                minHeight: 400,
              }}
              onStartShouldSetResponder={() => true}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Header */}
                <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={12}
                    style={{ alignSelf: "flex-start", marginBottom: 8 }}
                  >
                    <X size={24} color={COLORS.textMain} strokeWidth={2} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "700",
                      color: COLORS.textMain,
                      textAlign: "center",
                      marginBottom: 6,
                    }}
                  >
                    Invite more players
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: COLORS.textSub,
                      textAlign: "center",
                      lineHeight: 20,
                      paddingHorizontal: 8,
                    }}
                  >
                    Anyone you invite will be notified, and the first to accept fills the open
                    slots.
                  </Text>
                </View>

                {/* Slots open + date/time */}
                <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: COLORS.textMain,
                      marginBottom: 4,
                    }}
                  >
                    {spotsRemaining} slot{spotsRemaining !== 1 ? "s" : ""} still open
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.textSub, marginBottom: 12 }}>
                    {dateTimeStr}
                  </Text>

                  {/* Slot circles */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    {Array.from({ length: maxPlayers }).map((_, i) => {
                      const part = participants[i];
                      const isCurrentUser =
                        part?.userId && currentUserId && part.userId === currentUserId;
                      return (
                        <SlotCircle
                          key={i}
                          participant={part as (TeeTimeParticipant & { avatar?: string })}
                          isCurrentUser={isCurrentUser}
                          isEmpty={!part}
                        />
                      );
                    })}
                  </View>
                </View>

                {/* Search */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F3F4F6",
                    borderRadius: 10,
                    marginHorizontal: 20,
                    marginBottom: 12,
                    paddingHorizontal: 12,
                    height: 44,
                  }}
                >
                  <Search size={20} color={COLORS.placeholder} strokeWidth={2} />
                  <TextInput
                    placeholder="Search"
                    placeholderTextColor={COLORS.placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: COLORS.textMain,
                      marginLeft: 10,
                      paddingVertical: 0,
                    }}
                  />
                </View>

                {/* Selected players (N) */}
                {selectedPlayers.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: COLORS.textMain,
                        marginLeft: 20,
                        marginBottom: 4,
                      }}
                    >
                      Selected players ({selectedPlayers.length})
                    </Text>
                    {selectedPlayers.map((p) => (
                      <PlayerRow
                        key={p.id}
                        contact={p}
                        isSelected
                        onPress={() => togglePlayer(p.id)}
                        disabled={false}
                      />
                    ))}
                  </View>
                )}

                {/* Section label: "Selected players" when none, or list of available */}
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: COLORS.textMain,
                    marginLeft: 20,
                    marginBottom: 4,
                    marginTop: selectedPlayers.length > 0 ? 8 : 0,
                  }}
                >
                  {selectedPlayers.length > 0 ? "Available to invite" : "Selected players"}
                </Text>

                {/* List: unselected (or all if none selected) */}
                {unselectedPlayers.length === 0 ? (
                  <View
                    style={{
                      paddingVertical: 24,
                      alignItems: "center",
                      paddingHorizontal: 20,
                    }}
                  >
                    <Users size={40} color={COLORS.textSub} strokeWidth={1.5} />
                    <Text
                      style={{
                        fontSize: 15,
                        color: COLORS.textSub,
                        marginTop: 8,
                        textAlign: "center",
                      }}
                    >
                      {filteredPlayers.length === 0
                        ? "No players match your search."
                        : "All listed players are selected."}
                    </Text>
                  </View>
                ) : (
                  unselectedPlayers.map((p) => (
                    <PlayerRow
                      key={p.id}
                      contact={p}
                      isSelected={false}
                      onPress={() => togglePlayer(p.id)}
                      disabled={selectedIds.length >= spotsRemaining}
                    />
                  ))
                )}
              </ScrollView>

              {/* Footer: Send invites */}
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  paddingHorizontal: 20,
                  paddingTop: 12,
                  paddingBottom: insets.bottom + 12,
                  backgroundColor: COLORS.white,
                  borderTopWidth: 1,
                  borderTopColor: COLORS.border,
                }}
              >
                <TouchableOpacity
                  onPress={handleSendInvites}
                  disabled={selectedIds.length === 0 || submitting}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: selectedIds.length > 0 ? COLORS.primary : "#E5E7EB",
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: selectedIds.length > 0 ? COLORS.white : COLORS.textSub,
                      }}
                    >
                      {selectedIds.length > 0
                        ? `Send invites (${selectedIds.length})`
                        : "Send invites"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // —— Default: full-screen Select On-Deck (non–unfilled flow) ——
  const dateTimeLine = [teeDate, teeTime].filter(Boolean).join(" • ") || null;

  return (
    <ScreenShell>
      <AppHeader title="Select On-Deck Players" onBack={() => navigation.goBack()} />

      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.textMain }}>
            {spotsRemaining} spot{spotsRemaining > 1 ? "s" : ""} remaining
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSub, marginTop: 2 }}>
            {[courseName || "Your tee time", dateTimeLine].filter(Boolean).join(" • ") || "Your tee time"}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {onDeckPlayers.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
            <Users size={48} color={COLORS.textSub} strokeWidth={1.5} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.textMain, marginTop: 16, marginBottom: 8, textAlign: "center" }}>
              No On-Deck Players
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSub, textAlign: "center", lineHeight: 20 }}>
              Add players to On-Deck from your roster to use this feature.
            </Text>
          </View>
        ) : (
          <>
            <FlashList
              data={onDeckPlayers}
              renderItem={({ item }) => (
                <PlayerRow
                  contact={item}
                  isSelected={selectedIds.includes(item.id)}
                  onPress={() => togglePlayer(item.id)}
                  disabled={selectedIds.length >= spotsRemaining}
                />
              )}
              estimatedItemSize={72}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListHeaderComponent={
                <Text style={{ fontSize: 14, color: COLORS.textSub, paddingHorizontal: 16, paddingVertical: 12 }}>
                  Select up to {spotsRemaining} player{spotsRemaining > 1 ? "s" : ""} to invite
                </Text>
              }
            />
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: insets.bottom + 16,
                backgroundColor: COLORS.white,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
              }}
            >
              <TouchableOpacity
                onPress={handleSendInvites}
                disabled={selectedIds.length === 0 || submitting}
                activeOpacity={0.8}
                style={{
                  backgroundColor: selectedIds.length > 0 ? COLORS.primary : "#E5E7EB",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: selectedIds.length > 0 ? COLORS.white : COLORS.textSub,
                    }}
                  >
                    Send invites
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScreenShell>
  );
}
