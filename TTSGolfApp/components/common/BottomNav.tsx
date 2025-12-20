import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
    Home,
    Clock,
    MessageCircle,
    Users,
    User,
} from "lucide-react-native";

const COLORS = {
    primary: "#5DB075",
    textSub: "#6B7280",
    white: "#FFFFFF",
};

interface BottomNavProps {
    activeTab: string;
    navigation: any;
    onTabChange?: (tab: string) => void;
}

const TABS = [
    { name: "Home", icon: Home, screen: "HomePage" },
    { name: "Availability", icon: Clock, screen: "Availability" },
    { name: "Messages", icon: MessageCircle, screen: "Messages" },
    { name: "Players", icon: Users, screen: "Roster" },
    { name: "Profile", icon: User, screen: "Profile" },
];

export default function BottomNav({ activeTab, navigation, onTabChange }: BottomNavProps) {
    const handlePress = (tab: typeof TABS[0]) => {
        onTabChange?.(tab.name);
        if (navigation && tab.screen) {
            (navigation as any).navigate(tab.screen);
        }
    };

    return (
        <View style={styles.bottomNav}>
            {TABS.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.name;
                return (
                    <TouchableOpacity
                        key={tab.name}
                        style={styles.bottomNavItem}
                        onPress={() => handlePress(tab)}
                    >
                        <IconComponent
                            size={24}
                            color={isActive ? COLORS.primary : COLORS.textSub}
                            strokeWidth={isActive ? 2.5 : 2}
                        />
                        <Text
                            style={[
                                styles.bottomNavLabel,
                                { color: isActive ? COLORS.primary : COLORS.textSub },
                            ]}
                        >
                            {tab.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bottomNav: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 12,
        paddingBottom: 25,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: "#F0F0F0",
        elevation: 10,
    },
    bottomNavItem: {
        alignItems: "center",
    },
    bottomNavLabel: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: "500",
    },
});
