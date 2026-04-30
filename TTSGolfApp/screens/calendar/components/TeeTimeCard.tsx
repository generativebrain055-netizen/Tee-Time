import React, { memo, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
} from "react-native";
import {
  Clock,
  MapPin,
  MoreHorizontal,
  Check,
  Users,
  ChevronRight,
  X,
  MessageCircle,
  Pencil,
  UserRoundCog,
  CalendarX2,
  LogOut,
} from "lucide-react-native";
import { CalendarTeeTime } from "../types";
import { CALENDAR_COLORS } from "../constants";
import { formatTeeTimeDate, formatTeeTimeTime } from "../utils";
import { isSameLocalCalendarDayAsToday, parseCalendarDateLocal } from "../../../utils/formatting";
import { attendanceApi, teeTimeApi } from "../../../services/api";
import { useAuthStore } from "../../../stores";
import { useToast } from "../../../ui/feedback";
import { useUser } from "../../../contexts/UserContext";
import { getDisplayTeeTimeStatus } from "../../../utils/teeTimeStatusDisplay";

// Import tick icon
const TickIcon = require('../../../assets/Tick.png');
const CrossIcon = require('../../../assets/Cross.png');

const PRIMARY_GREEN = "#5EBC68";
const IN_PROGRESS_ORANGE = "#F59E0B";

function isFutureTeeDate(dateStr?: string): boolean {
  if (!dateStr) return false;
  const cal = parseCalendarDateLocal(String(dateStr));
  if (Number.isNaN(cal.getTime())) return false;
  const teeDay = new Date(cal.getFullYear(), cal.getMonth(), cal.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return teeDay.getTime() > today.getTime();
}

interface TeeTimeCardProps {
  teeTime: CalendarTeeTime;
  onPress?: (teeTimeId: string) => void;
  onCancelSuccess?: () => void;
  /** Organizer-only: navigate to pre–tee time check-in. */
  onPreTeeTimeCheck?: (teeTimeId: string, courseLine: string) => void;
  /** Open tee time chat thread */
  onOpenTeeTimeChat?: (teeTimeId: string) => void;
}

const CANCEL_PENALTY_CONFIRMED = 10;
const CANCEL_PENALTY_LATE = 5;

function getStatusDisplay(status: CalendarTeeTime["status"]) {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmed",
        icon: Check,
        color: PRIMARY_GREEN,
      };
    case "in_progress":
      return {
        label: "In progress",
        icon: Clock,
        color: IN_PROGRESS_ORANGE,
      };
    case "completed":
      return {
        label: "Completed",
        icon: Check,
        color: "#6B7280",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        icon: Check,
        color: "#EF4444",
      };
    case "pending":
    default:
      return {
        label: "Pending",
        icon: Clock,
        color: CALENDAR_COLORS.pendingText,
      };
  }
}

const TeeTimeCard = memo(({ teeTime, onPress, onCancelSuccess, onPreTeeTimeCheck, onOpenTeeTimeChat }: TeeTimeCardProps) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { fetchProfile } = useUser();
  const toast = useToast();
  const displayStatus = getDisplayTeeTimeStatus({
    status: teeTime.status,
    maxPlayers: teeTime.maxPlayers,
    participantCount: teeTime.participantCount,
  }) as CalendarTeeTime["status"];
  const statusDisplay = getStatusDisplay(displayStatus);
  const StatusIcon = statusDisplay.icon;
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  /** Guests only — leave the tee time (not "cancel event for everyone"). */
  const canLeaveAsParticipant =
    !teeTime.isOrganizer &&
    (displayStatus === "confirmed" ||
      displayStatus === "in_progress" ||
      teeTime.status === "pending");

  /** Host: end the tee time for all participants */
  const canHostCancelTeeTime =
    !!teeTime.isOrganizer &&
    displayStatus !== "completed" &&
    displayStatus !== "cancelled" &&
    teeTime.status !== "completed" &&
    teeTime.status !== "cancelled";

  /** "Is everyone here?" / check-in — only on the scheduled tee date; hosts confirmed or in session */
  const showPreTeeTimeCheck =
    !!onPreTeeTimeCheck &&
    !!teeTime.isOrganizer &&
    isSameLocalCalendarDayAsToday(teeTime.date) &&
    (displayStatus === "confirmed" || displayStatus === "in_progress");

  const checkInCourseLine = `${formatTeeTimeDate(teeTime.date)}, ${formatTeeTimeTime(teeTime.time)} – ${teeTime.course}`;
  const hideManagePlayersForFuture = isFutureTeeDate(teeTime.date);

  const handlePress = useCallback(() => {
    onPress?.(teeTime.id);
  }, [onPress, teeTime.id]);

  const handleHostCancelTeeTime = useCallback(() => {
    Alert.alert(
      "Cancel tee time?",
      "This cancels the tee time for everyone and notifies participants.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Cancel tee time",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await teeTimeApi.cancelTeeTime(teeTime.id);
              if (res.success) {
                toast?.show({ message: "Tee time cancelled", type: "success" });
                onCancelSuccess?.();
              }
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Could not cancel tee time.");
            }
          },
        },
      ],
    );
  }, [teeTime.id, onCancelSuccess, toast]);

  const handleMorePress = useCallback(() => {
    setShowOptionsModal(true);
  }, []);

  const closeOptionsModal = useCallback(() => {
    setShowOptionsModal(false);
  }, []);

  const openTeeTimeChat = useCallback(() => {
    closeOptionsModal();
    onOpenTeeTimeChat?.(teeTime.id);
  }, [closeOptionsModal, onOpenTeeTimeChat, teeTime.id]);

  const openEditDetails = useCallback(() => {
    closeOptionsModal();
    // No dedicated edit flow yet; route to detail.
    onPress?.(teeTime.id);
  }, [closeOptionsModal, onPress, teeTime.id]);

  const openManagePlayers = useCallback(() => {
    closeOptionsModal();
    if (onPreTeeTimeCheck) onPreTeeTimeCheck(teeTime.id, checkInCourseLine);
    else onPress?.(teeTime.id);
  }, [closeOptionsModal, onPreTeeTimeCheck, teeTime.id, checkInCourseLine, onPress]);

  const openLeaveTeeTime = useCallback(() => {
    closeOptionsModal();
    if (canLeaveAsParticipant) setShowCancelModal(true);
    else Alert.alert("Leave tee time", "You can't leave this tee time right now.");
  }, [closeOptionsModal, canLeaveAsParticipant]);

  const openCancelTeeTime = useCallback(() => {
    closeOptionsModal();
    handleHostCancelTeeTime();
  }, [closeOptionsModal, handleHostCancelTeeTime]);

  const hostOptions = [
    { key: "chat", label: "Open tee time chat", icon: MessageCircle, onPress: openTeeTimeChat },
    { key: "edit", label: "Edit details", icon: Pencil, onPress: openEditDetails },
    ...(!hideManagePlayersForFuture
      ? [{ key: "manage", label: "Manage players", icon: UserRoundCog, onPress: openManagePlayers }]
      : []),
    ...(canHostCancelTeeTime
      ? [{ key: "cancel", label: "Cancel tee time", icon: CalendarX2, onPress: openCancelTeeTime, danger: true }]
      : []),
  ];

  const memberOptions = [
    { key: "chat", label: "Open tee time chat", icon: MessageCircle, onPress: openTeeTimeChat },
    { key: "leave", label: "Leave tee time", icon: LogOut, onPress: openLeaveTeeTime, danger: true },
  ];

  const options = teeTime.isOrganizer ? hostOptions : memberOptions;
  const renderOptionRow = (opt: {
    key: string;
    label: string;
    icon: any;
    onPress: () => void;
    danger?: boolean;
  }) => {
    const Icon = opt.icon;
    const tint = opt.danger ? "#DC2626" : "#111827";
    return (
      <TouchableOpacity
        key={opt.key}
        onPress={opt.onPress}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 18,
          borderBottomWidth: 1,
          borderBottomColor: "#EFEFEF",
        }}
      >
        <Icon size={20} color={tint} strokeWidth={2} />
        <Text
          style={{
            marginLeft: 12,
            fontSize: 24 / 2,
            fontFamily: "Inter_500Medium",
            color: tint,
          }}
        >
          {opt.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const handlePreTeeTimeCheckPress = useCallback(() => {
    onPreTeeTimeCheck?.(teeTime.id, checkInCourseLine);
  }, [onPreTeeTimeCheck, teeTime.id, checkInCourseLine]);

  const handleConfirmCancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      const response = await attendanceApi.cancelParticipation(teeTime.id);
      setShowCancelModal(false);
      const delta = response.socialRateDelta;
      const newScore = response.newSocialRate;
      if (delta != null && delta !== 0 && typeof fetchProfile === "function") {
        await fetchProfile(true);
        const sign = delta > 0 ? "+" : "";
        const msg = newScore != null ? `${sign}${delta} Social Rate (${newScore})` : `${sign}${delta} Social Rate`;
        toast?.show({ message: msg, type: "info" });
      }
      Alert.alert("Cancelled", response.message || "Your tee time has been cancelled.");
      onCancelSuccess?.();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to cancel. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  }, [teeTime.id, onCancelSuccess, fetchProfile, toast]);

  const participants = teeTime.participants ?? [];

  return (
    <>
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Row 1: Date + Status pill + Three-dot menu */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_700Bold",
              color: "#111827",
              flex: 1,
            }}
          >
            {formatTeeTimeDate(teeTime.date)}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: displayStatus === "confirmed" ? PRIMARY_GREEN : "#E8F5E9",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
              }}
            >
              {displayStatus === "confirmed" ? (
                <Image source={TickIcon} style={{ width: 12, height: 12 }} resizeMode="contain" />
              ) : (
                <StatusIcon size={12} color={statusDisplay.color} strokeWidth={3} />
              )}
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_600SemiBold",
                  color: displayStatus === "confirmed" ? "#FFFFFF" : statusDisplay.color,
                }}
              >
                {statusDisplay.label}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleMorePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ padding: 4 }}
            >
              <MoreHorizontal size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={{ marginHorizontal: -20, paddingHorizontal: 20, marginBottom: -20, paddingBottom: 20 }}>
        {/* Time */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Clock size={18} color="#9CA3AF" />
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#374151" }}>
            {formatTeeTimeTime(teeTime.time)}
          </Text>
        </View>

        {/* Location */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
          <MapPin size={18} color="#9CA3AF" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#111827" }}>
              {teeTime.course}
            </Text>
            {teeTime.location ? (
              <Text style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular", marginTop: 2 }}>
                {teeTime.location}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Participants */}
        {participants.length > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Users size={18} color="#9CA3AF" />
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16, flex: 1, flexWrap: "wrap" }}>
              {participants.map((p) => {
                const isYou = currentUserId === p.userId;
                const isNoShow = p.attendanceStatus === "no_show" || p.status === "no_show";
                const parts = p.name.trim().split(/\s+/);
                const displayName = isYou
                  ? "You"
                  : parts.length >= 2
                    ? `${parts[0]} ${parts[1][0]}`
                    : p.name.length > 6
                      ? `${p.name.slice(0, 5)}...`
                      : p.name;
                return (
                  <View key={p.id} style={{ alignItems: "center", minWidth: 48 }}>
                    <View style={{ position: "relative" }}>
                      {p.avatar ? (
                        <Image
                          source={{ uri: p.avatar }}
                          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#FFFFFF" }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: "#F3F4F6",
                            justifyContent: "center",
                            alignItems: "center",
                            borderWidth: 2,
                            borderColor: "#FFFFFF",
                          }}
                        >
                          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#6B7280" }}>
                            {p.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </Text>
                        </View>
                      )}
                      <View
                        style={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          width: 18,
                          height: 18,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Image
                          source={isNoShow ? CrossIcon : TickIcon}
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 10,
                        color: "#6B7280",
                        textAlign: "center",
                        marginTop: 4,
                        maxWidth: 56,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {displayName}
                    </Text>
                    {p.isCreator && (
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 9, color: "#9CA3AF" }}>
                        (host)
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 14, color: "#9CA3AF", fontFamily: "Inter_500Medium" }}>
            No participants
          </Text>
        )}
        </TouchableOpacity>

        {showPreTeeTimeCheck ? (
          <TouchableOpacity
            onPress={handlePreTeeTimeCheckPress}
            activeOpacity={0.85}
            style={{
              marginTop: 16,
              marginHorizontal: -4,
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: "#F0FDF4",
              borderWidth: 1,
              borderColor: "rgba(94, 188, 104, 0.35)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_700Bold",
                  color: "#166534",
                }}
              >
                Is everyone here?
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: "#15803D",
                  marginTop: 4,
                }}
                numberOfLines={2}
              >
                {checkInCourseLine}
              </Text>
            </View>
            <ChevronRight size={22} color="#166534" />
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={showOptionsModal}
        transparent
        animationType="slide"
        onRequestClose={closeOptionsModal}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.15)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <View
              style={{
                height: 56,
                justifyContent: "center",
                borderBottomWidth: 1,
                borderBottomColor: "#EFEFEF",
                paddingHorizontal: 20,
              }}
            >
              <TouchableOpacity onPress={closeOptionsModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {options.map(renderOptionRow)}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center p-6">
          <View
            className="bg-white rounded-xl p-7 w-full max-w-[340px] items-center"
            style={{ elevation: 10, shadowColor: "#000", shadowRadius: 10, shadowOpacity: 0.2 }}
          >
            <Text className="text-xl font-bold text-gray-900 mb-3">Cancel participation?</Text>
            <Text className="text-base text-gray-500 text-center leading-6 mb-7">
              {teeTime.status === "confirmed"
                ? `You will lose ${CANCEL_PENALTY_CONFIRMED} points if you cancel. Confirm?`
                : "Are you sure you want to cancel your participation?"}
            </Text>
            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                className="flex-1 py-4 rounded-lg items-center bg-gray-100"
                onPress={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                <Text className="text-base font-semibold text-gray-900">No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-4 rounded-lg items-center bg-[#C62828]"
                onPress={handleConfirmCancel}
                disabled={isCancelling}
              >
                <Text className="text-base font-semibold text-white">
                  {isCancelling ? "Cancelling..." : "Yes"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});

export default TeeTimeCard;
