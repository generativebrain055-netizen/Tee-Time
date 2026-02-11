import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CalendarPlus, UserPlus, Search } from "lucide-react-native";
import { MotiView } from "moti";
import { transitions } from "../../../theme/animations";

interface QuickActionsProps {
  onCreateTeeTime: () => void;
  onInviteViaLink: () => void;
  onFindPlayers: () => void;
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
  index,
}: {
  icon: typeof CalendarPlus;
  label: string;
  onPress: () => void;
  index: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ ...transitions.standard, delay: index * 50 }}
      className="flex-1"
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        className="bg-white rounded-2xl py-5 px-3 items-center justify-center aspect-square"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <View className="mb-2">
          <Icon size={32} color="#22C55E" strokeWidth={2} />
        </View>
        <Text className="font-sans-semibold text-sm text-gray-900 text-center leading-5" numberOfLines={2}>
          {label}
        </Text>
      </TouchableOpacity>
    </MotiView>
  );
}

function QuickActions({
  onCreateTeeTime,
  onInviteViaLink,
  onFindPlayers,
}: QuickActionsProps) {
  return (
    <View className="px-5 py-5 bg-gray-50">
      <Text className="font-sans-bold text-lg text-gray-900 mb-4">Quick actions</Text>
      <View className="flex-row gap-3">
        <ActionButton
          icon={CalendarPlus}
          label={"Create\ntee time"}
          onPress={onCreateTeeTime}
          index={0}
        />
        <ActionButton
          icon={UserPlus}
          label={"Invite\nvia link"}
          onPress={onInviteViaLink}
          index={1}
        />
        <ActionButton
          icon={Search}
          label={"Find\nPlayers"}
          onPress={onFindPlayers}
          index={2}
        />
      </View>
    </View>
  );
}

export default memo(QuickActions);
