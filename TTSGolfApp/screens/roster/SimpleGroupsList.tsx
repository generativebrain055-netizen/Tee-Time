import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { Users, Calendar } from "lucide-react-native";
import { useColors, useTheme } from "../../ui/theme";
import { rosterApi } from "../../services/api";
import { logger } from "../../utils/logger";

interface SimpleGroupsListProps {
    onGroupClick: (groupId: string) => void;
    navigation?: any;
    refreshTrigger?: number | null;
}

const getInitials = (name: string): string => {
    const words = name.split(" ");
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const GroupItem = memo(({ group, onPress, colors, theme }: { group: any; onPress: () => void; colors: any; theme: any; }) => {
    const avatarUri = group.avatar || group.icon || (group.members && group.members.length > 0 && group.members[0].avatar);
    const hasAvatar = !!avatarUri;
    const upcomingCount =
        group.upcomingTeeTimeCount ??
        group.upcoming_tee_time_count ??
        (typeof group.upcomingTeeTimes === "number" ? group.upcomingTeeTimes : 0);
    
    return (
        <TouchableOpacity 
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 20,
                backgroundColor: "#FFFFFF",
            }}
        >
            {/* Avatar or Initials */}
            {hasAvatar ? (
                <Image 
                    source={{ uri: avatarUri }} 
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                    }}
                />
            ) : (
                <View 
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: group.color || colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text style={{ fontFamily: theme.fontFamily.bold, fontSize: 18, color: "#FFFFFF" }} numberOfLines={1}>
                        {getInitials(group.name || "")}
                    </Text>
                </View>
            )}

            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#111827" }}>
                    {group.name}
                </Text>
                
                {/* Members Count */}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <Users size={13} color="#9CA3AF" strokeWidth={2} />
                    <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 13, color: "#9CA3AF", marginLeft: 6 }}>
                        {group.memberCount || group.members?.length || 0} members{group.hasPendingInvites ? " (pending)" : ""}
                    </Text>
                </View>

                {upcomingCount > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                        <Calendar size={13} color="#9CA3AF" strokeWidth={2} />
                        <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 13, color: "#9CA3AF", marginLeft: 6 }}>
                            {upcomingCount} upcoming tee time{upcomingCount !== 1 ? "s" : ""}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

GroupItem.displayName = "GroupItem";

export default function SimpleGroupsList({ onGroupClick, navigation, refreshTrigger }: SimpleGroupsListProps) {
    const colors = useColors();
    const theme = useTheme();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadGroups = useCallback(async () => {
        try {
            const response = await rosterApi.getGroups();
            if (response.success) {
                setGroups(response.groups || []);
            }
        } catch (error) {
            logger.error("[SimpleGroupsList] Failed to load groups", error);
            setGroups([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    useEffect(() => {
        if (refreshTrigger != null && refreshTrigger > 0) loadGroups();
    }, [refreshTrigger, loadGroups]);

    // Refetch when returning from GroupProfile (or any push) so left/deleted groups disappear.
    useEffect(() => {
        const unsub = navigation?.addListener?.("focus", () => {
            loadGroups();
        });
        return () => {
            if (typeof unsub === "function") unsub();
        };
    }, [navigation, loadGroups]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadGroups();
    }, [loadGroups]);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (groups.length === 0) {
        return (
            <ScrollView 
                style={{ flex: 1, backgroundColor: "#FFFFFF" }}
                contentContainerStyle={{ flex: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
                    <Text style={{ 
                        fontFamily: theme.fontFamily.bold, 
                        fontSize: 20, 
                        color: "#111827",
                        marginBottom: 12,
                        textAlign: "center",
                    }}>
                        Build a group
                    </Text>
                    <Text style={{ 
                        fontFamily: theme.fontFamily.regular, 
                        fontSize: 15, 
                        color: "#6B7280",
                        textAlign: "center",
                        lineHeight: 22,
                        marginBottom: 24,
                    }}>
                        Create a group for your regular golfing buddies. Quickly invite the same players, lock in tee times faster, and keep all communication in one place with built-in group messaging.
                    </Text>
                    <TouchableOpacity
                        style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: 32,
                            paddingVertical: 14,
                            borderRadius: 10,
                        }}
                        onPress={() => navigation?.navigate?.('CreateGroup')}
                    >
                        <Text style={{ 
                            fontFamily: theme.fontFamily.semiBold,
                            fontSize: 15, 
                            color: "#FFFFFF",
                        }}>
                            Create group
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: "#FFFFFF" }}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                />
            }
        >
            {groups.map((group, index) => (
                <React.Fragment key={group.id || index}>
                    <GroupItem 
                        group={group} 
                        onPress={() => onGroupClick(group.id)}
                        colors={colors}
                        theme={theme}
                    />
                    {index < groups.length - 1 && (
                        <View style={{ height: 1, backgroundColor: "#F3F4F6", marginLeft: 76 }} />
                    )}
                </React.Fragment>
            ))}
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}
