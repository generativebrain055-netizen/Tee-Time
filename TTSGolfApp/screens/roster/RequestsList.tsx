import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
}from "react-native";
import { X } from "lucide-react-native";
import { useColors, useTheme } from "../../ui/theme";
import { friendApi } from "../../services/api";
import { logger } from "../../utils/logger";

const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
};

const RequestItem = memo(({ item, onAccept, onDecline, isResponding, colors, theme }: { 
    item: any; 
    onAccept: () => void; 
    onDecline: () => void;
    isResponding: boolean;
    colors: any;
    theme: any;
}) => {
    // Handle different data structures - API returns sender nested object
    const firstName = item.sender?.firstName || item.firstName || item.contact?.firstName || item.name?.split(' ')[0] || '';
    const lastName = item.sender?.lastName || item.lastName || item.contact?.lastName || item.name?.split(' ')[1] || '';
    const avatar = item.sender?.avatar || item.avatar || item.contact?.avatar;
    const location = item.sender?.location || item.location || item.contact?.location || '';
    const displayName = firstName && lastName ? `${firstName} ${lastName}`.trim() : item.name || 'Unknown User';

    return (
        <View style={{
            marginHorizontal: 16,
            marginVertical: 8,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: "#E5E7EB",
        }}>
            {avatar ? (
                <Image 
                    source={{ uri: avatar }} 
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                    }}
                />
            ) : (
                <View style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "#E5E7EB",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 18, color: "#6B7280" }}>
                        {getInitials(firstName, lastName)}
                    </Text>
                </View>
            )}

            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 17, color: "#111827" }}>
                    {displayName}
                </Text>
                {location && (
                    <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 14, color: "#9CA3AF", marginTop: 3 }}>
                        {location}
                    </Text>
                )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity 
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: "#F3F4F6",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    activeOpacity={0.7}
                    onPress={onDecline}
                    disabled={isResponding}
                >
                    <X size={20} color="#6B7280" strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={{
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 22,
                        backgroundColor: "#22C55E",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    activeOpacity={0.7}
                    onPress={onAccept}
                    disabled={isResponding}
                >
                    <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 15, color: "#FFFFFF" }}>
                        Accept
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

RequestItem.displayName = "RequestItem";

export default function RequestsList() {
    const colors = useColors();
    const theme = useTheme();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [respondingId, setRespondingId] = useState<string | null>(null);

    const loadRequests = useCallback(async () => {
        try {
            const response = await friendApi.getPendingRequests();
            if (response.success) {
                setRequests(response.requests || []);
            }
        } catch (error) {
            logger.error("[RequestsList] Failed to load requests", error);
            setRequests([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadRequests();
    }, [loadRequests]);

    const handleAccept = useCallback(async (requestId: string) => {
        setRespondingId(requestId);
        try {
            await friendApi.respondToRequest(requestId, "accepted");
            setRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch (error) {
            logger.error("[RequestsList] Failed to accept request", error);
        } finally {
            setRespondingId(null);
        }
    }, []);

    const handleDecline = useCallback(async (requestId: string) => {
        setRespondingId(requestId);
        try {
            await friendApi.respondToRequest(requestId, "declined");
            setRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch (error) {
            logger.error("[RequestsList] Failed to decline request", error);
        } finally {
            setRespondingId(null);
        }
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (requests.length === 0) {
        return (
            <ScrollView 
                style={{ flex: 1, backgroundColor: "#F9FAFB" }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={{ alignItems: "center", paddingVertical: 80, paddingHorizontal: 40 }}>
                    <Text style={{ fontFamily: theme.fontFamily.medium, fontSize: 14, color: "#9CA3AF" }}>
                        No friend requests
                    </Text>
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: "#F9FAFB" }}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                />
            }
        >
            <View style={{ paddingTop: 8 }}>
                {requests.map((item) => (
                    <RequestItem 
                        key={item.id}
                        item={item} 
                        onAccept={() => handleAccept(item.id)}
                        onDecline={() => handleDecline(item.id)}
                        isResponding={respondingId === item.id}
                        colors={colors}
                        theme={theme}
                    />
                ))}
            </View>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}
