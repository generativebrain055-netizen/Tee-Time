import React, { memo, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
    Home,
    Clock,
    MessageCircle,
    Users,
    User,
    LucideIcon,
} from "lucide-react-native";
import { fontFamilies } from "../../theme/fonts";

const COLORS = {
    primary: "#5EBC68",
    textSub: "#6B7280",
    white: "#FFFFFF",
};

interface BottomNavProps {
    activeTab: string;
    navigation: any;
    onTabChange?: (tab: string) => void;
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

// Memoized tab item to prevent re-renders
interface TabItemProps {
    tab: TabConfig;
    isActive: boolean;
    onPress: (tab: TabConfig) => void;
}

const TabItem = memo(({ tab, isActive, onPress }: TabItemProps) => {
    const IconComponent = tab.icon;
    const handlePress = useCallback(() => onPress(tab), [tab, onPress]);

    return (
        <TouchableOpacity className="items-center" onPress={handlePress}>
            <IconComponent
                size={24}
                color={isActive ? COLORS.primary : COLORS.textSub}
                strokeWidth={isActive ? 2.5 : 2}
            />
            <Text
                style={{
                    fontFamily: isActive ? fontFamilies.semiBold : fontFamilies.medium,
                    fontSize: 10,
                    marginTop: 3,
                    color: isActive ? COLORS.primary : COLORS.textSub,
                }}
            >
                {tab.name}
            </Text>
        </TouchableOpacity>
    );
});

TabItem.displayName = 'TabItem';

function BottomNav({ activeTab, navigation, onTabChange }: BottomNavProps) {
    const handlePress = useCallback((tab: TabConfig) => {
        onTabChange?.(tab.name);
        if (navigation && tab.screen) {
            navigation.navigate(tab.screen);
        }
    }, [navigation, onTabChange]);

    return (
        <View className="absolute bottom-0 left-0 right-0 flex-row justify-around py-3 pb-[25px] bg-white border-t border-[#F0F0F0]" style={{ elevation: 10 }}>
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

export default memo(BottomNav);
