import React, { memo } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Clock, MapPin, Check, Calendar, Users } from "lucide-react-native";
import { MotiView } from "moti";
import { Card } from "react-native-paper";
import { UpcomingTeeTime } from "../types";
import { transitions } from "../../../theme/animations";

// Import tick icon
const TickIcon = require('../../../assets/Tick.png');

interface NextTeeTimeProps {
  teeTime: UpcomingTeeTime | null;
  currentUserId?: string;
  onPress?: (teeTimeId: string) => void;
  /** e.g. "Dec 30th" for empty state title */
  selectedDateLabel?: string;
}

const formatTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getDateSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

const formatDateWithSuffix = (dateStr: string): string => {
  const date = new Date(dateStr);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `${weekday}, ${month} ${day}${getDateSuffix(day)}`;
};

const getInitials = (name: string): string => {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getShortName = (name: string): string => {
  const parts = name.split(" ");
  const firstName = parts[0] || "";
  const lastInitial = parts[1] ? parts[1][0] : "";
  const shortName = lastInitial ? `${firstName} ${lastInitial}` : firstName;
  return shortName.length > 6 ? `${shortName.substring(0, 5)}...` : shortName;
};



function NextTeeTime({
  teeTime,
  currentUserId,
  onPress,
  selectedDateLabel,
}: NextTeeTimeProps) {
  if (!teeTime) {
    const emptyTitle = selectedDateLabel
      ? `Next tee time (${selectedDateLabel})`
      : "Next tee time";
    return (
      <View className="bg-white flex-1 px-4 py-4 pb-6">
        <Text className="font-sans-semibold text-sm text-gray-500 mb-4">{emptyTitle}</Text>
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={transitions.standard}
          className="flex-1 py-10 px-4 items-center justify-center bg-white rounded-2xl border border-gray-200"
        >
          <View className="mb-4 opacity-50">
            <Calendar size={40} color="#D1D5DB" strokeWidth={1.5} />
          </View>
          <Text className="font-sans-medium text-sm text-gray-500 text-center leading-5">
            No tee times scheduled{'\n'}for this day
          </Text>
        </MotiView>
      </View>
    );
  }

  const formattedDate = formatDateWithSuffix(teeTime.teeDate);

  return (
    <View className="bg-white pt-4 px-4 pb-6">
      <Text className="font-sans-semibold text-sm text-gray-500 mb-4">
        Next tee time ({formattedDate})
      </Text>
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={transitions.standard}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPress?.(teeTime.id)}
          className="bg-white rounded-2xl p-5 border-l-4 border-l-success"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-sans-bold text-base text-gray-900">{formattedDate}</Text>
            <View className="flex-row items-center gap-1.5 bg-green-50 rounded-full px-3 py-1.5">
              <Image 
                source={TickIcon} 
                className="w-3.5 h-3.5"
                resizeMode="contain"
              />
              <Text className="font-sans-semibold text-xs text-success-dark">Confirmed</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3 mb-3">
            <Clock size={18} color="#9CA3AF" />
            <Text className="font-sans-semibold text-base text-gray-900">{formatTime(teeTime.teeTime)}</Text>
          </View>

          <View className="flex-row items-start gap-3 mb-6">
            <MapPin size={18} color="#9CA3AF" style={{ marginTop: 2 }} />
            <View>
              <Text className="font-sans-semibold text-base text-gray-900">{teeTime.courseName}</Text>
              {teeTime.courseLocation && (
                <Text className="font-sans text-xs text-gray-500 mt-0.5">
                  {teeTime.courseLocation}
                </Text>
              )}
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <Users size={18} color="#9CA3AF" />
            <View className="flex-row items-start gap-4">
              {teeTime.participants.map((p, index) => {
                const isCurrentUser = p.userId === currentUserId;
                const displayName = isCurrentUser ? "You" : getShortName(p.name);
                return (
                  <View key={p.id || index} className="items-center gap-1 min-h-[70px]">
                    <View className="relative">
                      {p.avatar ? (
                        <Image
                          source={{ uri: p.avatar }}
                          className="w-12 h-12 rounded-full border-2 border-white"
                        />
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-success justify-center items-center border-2 border-white">
                          <Text className="font-sans-semibold text-sm text-white">
                            {getInitials(p.name)}
                          </Text>
                        </View>
                      )}
                      <View className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] items-center justify-center">
                        <Image 
                          source={TickIcon} 
                          className="w-[18px] h-[18px]"
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                    <Text className="font-sans-medium text-[10px] text-gray-600">{displayName}</Text>
                    {p.isCreator && (
                      <Text className="font-sans text-[9px] text-gray-400 -mt-0.5">(host)</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

export default memo(NextTeeTime);
