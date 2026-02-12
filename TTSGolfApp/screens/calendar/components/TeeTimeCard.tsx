import React, { memo, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { Clock, MapPin, MoreHorizontal, Check, Users } from "lucide-react-native";
import { CalendarTeeTime } from "../types";
import { CALENDAR_COLORS } from "../constants";
import { formatTeeTimeDate, formatTeeTimeTime } from "../utils";
import { attendanceApi } from "../../../services/api";
import { useAuthStore } from "../../../stores";

// Import tick icon
const TickIcon = require('../../../assets/Tick.png');

const PRIMARY_GREEN = "#5EBC68";
const IN_PROGRESS_ORANGE = "#F59E0B";

interface TeeTimeCardProps {
  teeTime: CalendarTeeTime;
  onPress?: (teeTimeId: string) => void;
  onCancelSuccess?: () => void;
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

const TeeTimeCard = memo(({ teeTime, onPress, onCancelSuccess }: TeeTimeCardProps) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const statusDisplay = getStatusDisplay(teeTime.status);
  const StatusIcon = statusDisplay.icon;
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handlePress = useCallback(() => {
    onPress?.(teeTime.id);
  }, [onPress, teeTime.id]);

  const handleMorePress = useCallback(() => {
    const canCancel = teeTime.status === "confirmed" || teeTime.status === "pending";
    if (Platform.OS === "ios") {
      const options = ["View details", ...(canCancel ? ["Cancel participation"] : []), "Cancel"];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: canCancel ? 1 : undefined },
        (i) => {
          if (i === 0) handlePress();
          else if (canCancel && i === 1) setShowCancelModal(true);
        }
      );
    } else {
      Alert.alert("Options", "", [
        { text: "View details", onPress: handlePress },
        ...(canCancel ? [{ text: "Cancel participation", onPress: () => setShowCancelModal(true) }] : []),
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [teeTime.status, handlePress]);

  const handleConfirmCancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      const response = await attendanceApi.cancelParticipation(teeTime.id);
      setShowCancelModal(false);
      Alert.alert("Cancelled", response.message || "Your tee time has been cancelled.");
      onCancelSuccess?.();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to cancel. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  }, [teeTime.id, onCancelSuccess]);

  const canCancel = teeTime.status === "confirmed" || teeTime.status === "pending";
  const participants = teeTime.participants ?? [];

  return (
    <>
      <TouchableOpacity
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          borderLeftWidth: 4,
          borderLeftColor: '#22C55E',
          padding: 20,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Row 1: Date + Status */}
        <View className="flex-row justify-between items-center mb-4">
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', fontFamily: 'Inter_700Bold' }}>
            {formatTeeTimeDate(teeTime.date)}
          </Text>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 6, 
            backgroundColor: '#E8F5E9', 
            paddingHorizontal: 12, 
            paddingVertical: 6, 
            borderRadius: 9999 
          }}>
            <StatusIcon size={12} color={statusDisplay.color} strokeWidth={3} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: statusDisplay.color, fontFamily: 'Inter_600SemiBold' }}>
              {statusDisplay.label}
            </Text>
          </View>
        </View>

        {/* Time */}
        <View className="flex-row items-center gap-3 mb-3">
          <Clock size={18} color="#9CA3AF" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', fontFamily: 'Inter_600SemiBold' }}>
            {formatTeeTimeTime(teeTime.time)}
          </Text>
        </View>

        {/* Location */}
        <View className="flex-row items-start gap-3 mb-6">
          <MapPin size={18} color="#9CA3AF" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', fontFamily: 'Inter_600SemiBold' }}>
              {teeTime.course}
            </Text>
            {teeTime.location ? (
              <Text style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                {teeTime.location}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Participants */}
        {participants.length > 0 ? (
          <View className="flex-row items-center gap-3">
            <Users size={18} color="#9CA3AF" />
            <View className="flex-row items-start gap-4">
              {participants.map((p) => {
                const isYou = currentUserId === p.userId;
                const displayName = isYou ? "You" : (p.name.length > 6 ? `${p.name.slice(0, 5)}...` : p.name);
                return (
                  <View key={p.id} style={{ alignItems: 'center', minHeight: 70 }}>
                    <View style={{ position: 'relative' }}>
                      {p.avatar ? (
                        <Image source={{ uri: p.avatar }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#FFFFFF' }} />
                      ) : (
                        <View style={{ 
                          width: 44, 
                          height: 44, 
                          borderRadius: 22, 
                          backgroundColor: '#F3F4F6', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          borderWidth: 2,
                          borderColor: '#FFFFFF'
                        }}>
                          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280' }}>
                            {p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </Text>
                        </View>
                      )}
                      <View style={{ 
                        position: 'absolute', 
                        bottom: -2, 
                        right: -2, 
                        width: 18,
                        height: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Image 
                          source={TickIcon} 
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                    <Text style={{ 
                      fontFamily: 'Inter_500Medium', 
                      fontSize: 10, 
                      color: '#6B7280', 
                      textAlign: 'center', 
                      marginTop: 4,
                      maxWidth: 56
                    }} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {p.isCreator && (
                      <Text style={{ 
                        fontFamily: 'Inter_400Regular', 
                        fontSize: 9, 
                        color: '#9CA3AF',
                        marginTop: 0
                      }}>
                        (host)
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 14, color: '#9CA3AF', fontFamily: 'Inter_500Medium' }}>
            No participants
          </Text>
        )}
      </TouchableOpacity>

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
            <Text className="text-xl font-bold text-gray-900 mb-3">Cancel Tee Time?</Text>
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
