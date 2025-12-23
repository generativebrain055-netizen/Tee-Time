import React, { memo, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import { COLORS } from "../constants";
import { notificationApi } from "../../../services/api";

interface HeaderProps {
    onNotificationPress: () => void;
}

function Header({ onNotificationPress }: HeaderProps) {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const response = await notificationApi.getUnreadCount();
                if (response.success) {
                    setUnreadCount(response.count);
                }
            } catch (error) {
                // Silently fail - not critical
            }
        };

        fetchUnreadCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.logoMain}>TEE TIME</Text>
                <Text style={styles.logoSub}>Social</Text>
            </View>
            <TouchableOpacity style={styles.bellButton} onPress={onNotificationPress}>
                <Bell size={24} color={COLORS.text} strokeWidth={1.5} />
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    logoMain: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.text,
        letterSpacing: 1,
    },
    logoSub: {
        fontSize: 18,
        fontWeight: "500",
        fontStyle: "italic",
        color: COLORS.primary,
        marginTop: -4,
    },
    bellButton: {
        padding: 8,
        position: "relative",
    },
    badge: {
        position: "absolute",
        top: 2,
        right: 2,
        backgroundColor: "#EF4444",
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    badgeText: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "700",
    },
});

export default memo(Header);
