import React, { memo, useEffect } from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Bell } from "lucide-react-native";
import { MotiView } from "moti";
import { notificationApi } from "../../../services/api";
import { transitions } from "../../../theme/animations";
import { colorTokens } from "../../../theme/tokens";
import { cn } from "../../../utils/cn";

interface HeaderProps {
  onNotificationPress: () => void;
}

function Header({ onNotificationPress }: HeaderProps) {
  const [unreadCount, setUnreadCount] = React.useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await notificationApi.getUnreadCount();
        if (response.success) setUnreadCount(response.count ?? 0);
      } catch {
        // Non-critical
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View className="bg-white">
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transitions.snappy}
        className="flex-row justify-between items-center px-4 pt-3 pb-5 bg-white"
      >
        <View>
          <Image
            source={require("../../../assets/compact-logo.png")}
            style={{ width: 75, height: 75, resizeMode: 'contain' }}
          />
        </View>
        <TouchableOpacity
          className={cn("p-2 rounded-full relative")}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <Bell size={24} color={colorTokens.text.primary} strokeWidth={2} />
          {unreadCount > 0 && (
            <View
              className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-white"
              style={{ borderWidth: 1.5 }}
            />
          )}
        </TouchableOpacity>
      </MotiView>
      <View className="h-px bg-gray-200" />
    </View>
  );
}

export default memo(Header);
