/**
 * Modern BottomNav Component with NativeWind
 * 
 * Navigation bar with optimized performance using memo and useCallback
 * Fully styled with Tailwind classes via NativeWind
 */
import React, { memo, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, type ViewStyle } from "react-native";
import {
  Home,
  Clock,
  MessageCircle,
  Users,
  User,
  type LucideIcon,
} from "lucide-react-native";
import { cn } from "../../utils/cn";

interface BottomNavProps {
  activeTab: string;
  navigation: any;
  onTabChange?: (tab: string) => void;
  className?: string;
  style?: ViewStyle;
}

interface TabConfig {
  name: string;
  icon: LucideIcon;
  screen: string;
}

const TABS: TabConfig[] = [
  { name: "Home", icon: Home, screen: "HomePage" },
  { name: "Availability", icon: Clock, screen: "Availability" },
  { name: "Messages", icon: MessageCircle, screen: "Messages" },
  { name: "Players", icon: Users, screen: "Roster" },
  { name: "Profile", icon: User, screen: "Profile" },
];

// Theme colors for icon states
const ICON_COLORS = {
  active: "#5EBC68",
  inactive: "#6B7280",
} as const;

/**
 * Memoized tab item to prevent re-renders
 */
interface TabItemProps {
  tab: TabConfig;
  isActive: boolean;
  onPress: (tab: TabConfig) => void;
}

const TabItem = memo(function TabItem({ tab, isActive, onPress }: TabItemProps) {
  const IconComponent = tab.icon;
  const handlePress = useCallback(() => onPress(tab), [tab, onPress]);

  return (
    <TouchableOpacity
      className="items-center justify-center py-1 px-2 flex-1"
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View className={cn(
        "items-center justify-center rounded-full p-2",
        isActive && "bg-primary-50"
      )}>
        <IconComponent
          size={24}
          color={isActive ? ICON_COLORS.active : ICON_COLORS.inactive}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </View>
      <Text
        className={cn(
          "text-[10px] mt-1 font-medium",
          isActive ? "text-primary" : "text-text-secondary"
        )}
      >
        {tab.name}
      </Text>
    </TouchableOpacity>
  );
});

/**
 * BottomNav - Main navigation component
 */
function BottomNavComponent({ 
  activeTab, 
  navigation, 
  onTabChange,
  className,
  style,
}: BottomNavProps) {
  const handlePress = useCallback(
    (tab: TabConfig) => {
      onTabChange?.(tab.name);
      if (navigation && tab.screen) {
        navigation.navigate(tab.screen);
      }
    },
    [navigation, onTabChange]
  );

  return (
    <View
      className={cn(
        "absolute bottom-0 left-0 right-0",
        "flex-row justify-around items-center",
        "py-2 pb-6",
        "bg-white",
        "border-t border-border-light",
        // Shadow for elevation
        "shadow-lg",
        className
      )}
      style={style}
    >
      {TABS.map((tab) => (
        <TabItem
          key={tab.name}
          tab={tab}
          isActive={activeTab === tab.name}
          onPress={handlePress}
        />
      ))}
    </View>
  );
}

export const BottomNav = memo(BottomNavComponent);
export default BottomNav;
