import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from "react-native";
import {
    Calendar,
    MapPin,
    Clock,
    Check,
    X,
    Users,
    AlertTriangle,
    Timer,
} from "lucide-react-native";
import { logger } from "../utils/logger";
import { ScreenShell, AppHeader } from "../ui";
import { useColors } from "../ui/theme/ThemeContext";
import { useToast } from "../ui/feedback";
import { useUser } from "../contexts/UserContext";
import { inviteApi, Invite } from "../services/api";
import { formatRemainingClock } from "../utils/formatting";

const COLORS = {
    primary: "#5EBC68",
    white: "#FFFFFF",
    red: "#EF4444",
    textSub: "#6B7280",
};

type InviteRespondApiResult = {
    success: boolean;
    message?: string;
    code?: string;
    status?: string;
    socialRateDelta?: number;
    newSocialRate?: number;
};

// Helper for status badge colors
const getStatusBadgeClass = (status: string): string => {
    switch (status) {
        case "pending": return "bg-amber-100";
        case "accepted": return "bg-emerald-100";
        case "declined": return "bg-red-100";
        case "expired": return "bg-gray-100";
        case "waitlist": return "bg-indigo-100";
        default: return "bg-gray-100";
    }
};

export default function InvitesScreen({ navigation }: any) {
    const { fetchProfile } = useUser();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<"pending" | "sent">("pending");
    const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
    const [sentInvites, setSentInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [responding, setResponding] = useState<string | null>(null);

    useEffect(() => {
        loadInvites();
    }, []);

    const loadInvites = async () => {
        try {
            const [pendingRes, sentRes] = await Promise.all([
                inviteApi.getPendingInvites(),
                inviteApi.getSentInvites(),
            ]);
            if (pendingRes.success) setPendingInvites(pendingRes.invites);
            if (sentRes.success) setSentInvites(sentRes.invites);
        } catch (error) {
            logger.error("[InvitesScreen] Failed to load invites", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadInvites();
        setRefreshing(false);
    }, []);

    const handleRespond = async (inviteId: string, response: "accepted" | "declined") => {
        console.log("🔵 [InvitesScreen] handleRespond CALLED", { inviteId, response });
        setResponding(inviteId);
        try {
            console.log("🔵 [InvitesScreen] About to call inviteApi.respondToInvite", { inviteId, response });
            logger.info("[InvitesScreen] Attempting to respond to invite", {
                inviteId,
                response,
            });
            
            const result = (await inviteApi.respondToInvite(
                inviteId,
                response
            )) as InviteRespondApiResult;
            
            console.log("🟢 [InvitesScreen] inviteApi.respondToInvite SUCCESS", { inviteId, response, result });
            logger.info("[InvitesScreen] Invite response received", {
                inviteId,
                response,
                success: result.success,
            });
            
            if (result.success) {
                // Remove invite from pending list
                setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
                
                // Refresh invites list to ensure UI is updated
                await loadInvites();
                
                // Show Social Rate change in real-time and refresh profile
                const delta = result.socialRateDelta;
                const newScore = result.newSocialRate;
                if (delta != null && delta !== 0 && typeof fetchProfile === "function") {
                    await fetchProfile(true);
                    const sign = delta > 0 ? "+" : "";
                    const msg = newScore != null ? `${sign}${delta} Social Rate (${newScore})` : `${sign}${delta} Social Rate`;
                    toast?.show({ message: msg, type: delta > 0 ? "success" : "info" });
                }

                const acceptTitle =
                    response === "accepted"
                        ? result.status === "waitlist"
                            ? "Waitlist"
                            : "Accepted!"
                        : "Declined";
                const acceptBody =
                    result.message ||
                    (response === "accepted"
                        ? result.status === "waitlist"
                            ? "You're on the waitlist for this tee time."
                            : "You've been added to the tee time!"
                        : "You've declined the invite.");
                Alert.alert(acceptTitle, acceptBody);
            } else {
                console.warn("🟡 [InvitesScreen] Response not successful", { inviteId, response, result });
                logger.warn("[InvitesScreen] Invite response was not successful", {
                    inviteId,
                    response,
                    result,
                });
                const full = result.code === "TEE_TIME_FULL";
                Alert.alert(
                    full ? "Tee time full" : "Error",
                    result.message || "Failed to respond to invite. Please try again."
                );
            }
        } catch (error: any) {
            console.error("🔴 [InvitesScreen] ERROR in handleRespond", {
                inviteId,
                response,
                error: error.message,
                code: error.code,
                statusCode: error.statusCode,
                stack: error.stack,
            });
            logger.error("[InvitesScreen] Error responding to invite", {
                inviteId,
                response,
                error: error.message,
                stack: error.stack,
                code: error.code,
                statusCode: error.statusCode,
            });
            Alert.alert(
                "Error",
                error.message || "Failed to respond to invite. Please check your connection and try again."
            );
        } finally {
            setResponding(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    };

    const TabBar = () => (
        <View className="flex-row bg-white px-4 pb-3 gap-3">
            <TouchableOpacity
                className={`flex-1 py-2.5 rounded-md items-center ${activeTab === "pending" ? "bg-green-600" : "bg-gray-100"}`}
                onPress={() => setActiveTab("pending")}
            >
                <Text className={`text-sm font-semibold ${activeTab === "pending" ? "text-white" : "text-gray-500"}`}>
                    Received ({pendingInvites.length})
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                className={`flex-1 py-2.5 rounded-md items-center ${activeTab === "sent" ? "bg-green-600" : "bg-gray-100"}`}
                onPress={() => setActiveTab("sent")}
            >
                <Text className={`text-sm font-semibold ${activeTab === "sent" ? "text-white" : "text-gray-500"}`}>
                    Sent ({sentInvites.length})
                </Text>
            </TouchableOpacity>
        </View>
    );

    const PendingInviteCard = ({ invite }: { invite: Invite }) => {
        const handleCardPress = () => {
            navigation?.navigate("InviteDetail", { inviteId: invite.id });
        };
        const [countdown, setCountdown] = useState<string | null>(null);
        const [isUrgent, setIsUrgent] = useState(false);
        const [isCountdownExpired, setIsCountdownExpired] = useState(false);
        const statusRaw = String((invite as any).status || "pending").toLowerCase();
        const isAccepted = statusRaw === "accepted";
        const isDeclined = statusRaw === "declined";
        const isServerExpired = statusRaw === "expired";
        const isExpired = isServerExpired || isCountdownExpired;
        const isHistorical = isAccepted || isDeclined || isExpired;
        const canRespond = statusRaw === "pending" && !isExpired;

        // Real-time countdown timer - updates every second
        useEffect(() => {
            if (!invite.expiresAt) {
                setCountdown(null);
                return;
            }

            const calculateCountdown = () => {
                const expiresAt = new Date(invite.expiresAt!);
                const now = new Date();
                const diffMs = expiresAt.getTime() - now.getTime();

                if (diffMs <= 0) {
                    setIsCountdownExpired(true);
                    setIsUrgent(true);
                    setCountdown(null);
                    return;
                }

                const totalSecs = Math.floor(diffMs / 1000);
                setIsUrgent(totalSecs < 3600); // Urgent if < 1 hour
                setCountdown(formatRemainingClock(diffMs, true));
            };

            calculateCountdown();
            const interval = setInterval(calculateCountdown, 1000);
            return () => clearInterval(interval);
        }, [invite.expiresAt]);

        return (
            <TouchableOpacity
                onPress={handleCardPress}
                activeOpacity={0.9}
            >
            <View 
                className={`rounded-md p-4 mb-3.5 shadow-sm ${
                    isHistorical
                        ? "bg-gray-100 border border-gray-300"
                        : `bg-white ${isUrgent ? "border border-red-200" : ""}`
                }`}
                style={{ elevation: 3 }}
            >
                {/* Header */}
                <View className="flex-row justify-between items-center mb-3.5">
                    <View className="flex-row items-center">
                        <View className={`w-10 h-10 rounded-full justify-center items-center mr-3 ${
                            isHistorical ? "bg-gray-500" : (isUrgent ? "bg-red-600" : "bg-green-600")
                        }`}>
                            <Users size={18} color={COLORS.white} />
                        </View>
                        <View>
                            <Text className={`text-base font-semibold ${isHistorical ? "text-gray-600" : "text-gray-900"}`}>
                                {invite.inviter?.firstName} {invite.inviter?.lastName}
                            </Text>
                            <Text className={`text-[13px] mt-px ${isHistorical ? "text-gray-500" : "text-gray-500"}`}>
                                {isAccepted ? "invite accepted" : isDeclined ? "invite declined" : isExpired ? "invite expired" : "invited you to play"}
                            </Text>
                        </View>
                    </View>
                    {isHistorical && (
                        <View className={`px-2.5 py-1 rounded-md ${isDeclined ? "bg-gray-300" : "bg-gray-300"}`}>
                            <Text className="text-xs font-semibold text-gray-700">
                                {isAccepted ? "Accepted" : isDeclined ? "Declined" : "Expired"}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Details Section */}
                <View className={`rounded-md p-3.5 mb-3.5 ${isHistorical ? "bg-gray-200" : "bg-gray-50"}`}>
                    <View className="flex-row items-center">
                        <View className="w-8 h-8 rounded-md bg-green-100 justify-center items-center mr-3">
                            <MapPin size={16} color={COLORS.primary} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[11px] text-gray-500 uppercase tracking-wide">Course</Text>
                            <Text className={`text-[15px] font-semibold mt-0.5 ${isHistorical ? "text-gray-600" : "text-gray-900"}`}>{invite.courseName}</Text>
                        </View>
                    </View>

                    <View className="h-px bg-gray-200 my-3" />

                    <View className="flex-row">
                        <View className="flex-1 flex-row items-center">
                            <View className="w-8 h-8 rounded-md bg-green-100 justify-center items-center mr-3">
                                <Calendar size={16} color={COLORS.primary} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[11px] text-gray-500 uppercase tracking-wide">Date</Text>
                                <Text className={`text-[15px] font-semibold mt-0.5 ${isHistorical ? "text-gray-600" : "text-gray-900"}`}>{formatDate(invite.teeDate)}</Text>
                            </View>
                        </View>
                        <View className="flex-1 flex-row items-center">
                            <View className="w-8 h-8 rounded-md bg-green-100 justify-center items-center mr-3">
                                <Clock size={16} color={COLORS.primary} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[11px] text-gray-500 uppercase tracking-wide">Time</Text>
                                <Text className={`text-[15px] font-semibold mt-0.5 ${isHistorical ? "text-gray-600" : "text-gray-900"}`}>{invite.teeTime}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Countdown Timer - Always show response window info */}
                <View className={`rounded-md p-3.5 mb-3.5 border ${
                    isHistorical
                        ? "bg-gray-200 border-gray-300"
                        : !invite.expiresAt 
                        ? "bg-gray-100 border-gray-200" 
                        : isUrgent 
                            ? "bg-red-50 border-red-200" 
                            : "bg-amber-50 border-amber-200"
                }`}>
                    <View className="flex-row items-center justify-center gap-2 mb-3">
                        <Timer size={16} color={invite.expiresAt ? (isUrgent ? "#DC2626" : "#D97706") : "#6B7280"} />
                        <Text className={`text-[13px] font-semibold uppercase tracking-wide ${
                            isHistorical
                                ? "text-gray-600"
                                : !invite.expiresAt 
                                ? "text-gray-500" 
                                : isUrgent 
                                    ? "text-red-600" 
                                    : "text-amber-600"
                        }`}>
                            {isDeclined ? "Invite Declined" : (!invite.expiresAt ? "Response Window" : isExpired ? "Invite Expired" : "Time Remaining")}
                        </Text>
                    </View>

                    {invite.expiresAt && !isHistorical && !isExpired && countdown && (
                        <View className="flex-row items-center justify-center">
                            <View className={`rounded-md py-3 px-4 min-w-[180px] items-center ${isUrgent ? "bg-red-100" : "bg-amber-100"}`}>
                                <Text
                                    className={`text-[30px] font-bold ${isUrgent ? "text-red-600" : "text-amber-800"}`}
                                    style={{ fontVariant: ["tabular-nums"] }}
                                >
                                    {countdown}
                                </Text>
                            </View>
                        </View>
                    )}

                    {invite.expiresAt && isExpired && (
                        <Text className="text-[13px] text-gray-700 text-center leading-[18px]">
                            This invite has expired. The spot may have been offered to someone else.
                        </Text>
                    )}

                    {isDeclined && (
                        <Text className="text-[13px] text-gray-700 text-center leading-[18px]">
                            You declined this invite.
                        </Text>
                    )}
                    {isAccepted && (
                        <Text className="text-[13px] text-gray-700 text-center leading-[18px]">
                            You accepted this invite.
                        </Text>
                    )}

                    {!invite.expiresAt && (
                        <Text className="text-[13px] text-gray-500 text-center leading-[18px]">
                            No deadline set — respond at your convenience
                        </Text>
                    )}
                </View>

                {/* Action Buttons */}
                {canRespond && (
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className={`flex-1 flex-row items-center justify-center py-3.5 rounded-md gap-2 ${
                                "bg-red-100"
                            }`}
                            onPress={() => handleRespond(invite.id, "declined")}
                            disabled={responding === invite.id}
                        >
                            {responding === invite.id ? (
                                <ActivityIndicator size="small" color={COLORS.red} />
                            ) : (
                                <>
                                    <X size={18} color={COLORS.red} />
                                    <Text className="text-[15px] font-semibold text-red-500">Decline</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 flex-row items-center justify-center py-3.5 rounded-md gap-2 ${
                                "bg-green-600"
                            }`}
                            onPress={() => handleRespond(invite.id, "accepted")}
                            disabled={responding === invite.id}
                        >
                            {responding === invite.id ? (
                                <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                                <>
                                    <Check size={18} color={COLORS.white} />
                                    <Text className="text-[15px] font-semibold text-white">Accept</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                {!canRespond && isAccepted && (
                    <View className="flex-row">
                        <View className="flex-1 flex-row items-center justify-center py-3.5 rounded-md gap-2 bg-green-600">
                            <Check size={18} color={COLORS.white} />
                            <Text className="text-[15px] font-semibold text-white">Accepted</Text>
                        </View>
                    </View>
                )}
                {!canRespond && isDeclined && (
                    <View className="flex-row">
                        <View className="flex-1 flex-row items-center justify-center py-3.5 rounded-md gap-2 bg-red-100">
                            <X size={18} color={COLORS.red} />
                            <Text className="text-[15px] font-semibold text-red-500">Declined</Text>
                        </View>
                    </View>
                )}
            </View>
            </TouchableOpacity>
        );
    };

    const SentInviteCard = ({ invite }: { invite: Invite }) => (
        <View className="bg-white rounded-md p-4 mb-3.5 shadow-sm" style={{ elevation: 3 }}>
            <View className="flex-row justify-between items-center mb-3.5">
                <Text className="text-base font-bold text-gray-900 flex-1">{invite.courseName}</Text>
                <View className={`px-2.5 py-1 rounded-md ${getStatusBadgeClass(invite.status)}`}>
                    <Text className="text-xs font-semibold text-gray-900 capitalize">{invite.status}</Text>
                </View>
            </View>
            <View className="mt-1">
                <View className="flex-row items-center mb-2">
                    <Calendar size={16} color={COLORS.textSub} />
                    <Text className="text-sm text-gray-900 ml-2">{formatDate(invite.teeDate)}</Text>
                </View>
                <View className="flex-row items-center mb-2">
                    <Users size={16} color={COLORS.textSub} />
                    <Text className="text-sm text-gray-900 ml-2">
                        To: {invite.invitee?.name || invite.invitee?.phone}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <ScreenShell>
            <AppHeader title="Invites" onBack={() => navigation?.goBack()} />
            <TabBar />

            <ScrollView
                className="flex-1 p-4"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : activeTab === "pending" ? (
                    pendingInvites.length > 0 ? (
                        pendingInvites.map((invite) => (
                            <PendingInviteCard key={invite.id} invite={invite} />
                        ))
                    ) : (
                        <View className="items-center py-16">
                            <Calendar size={48} color="#D1D5DB" />
                            <Text className="text-lg font-bold text-gray-900 mt-4">No Pending Invites</Text>
                            <Text className="text-sm text-gray-500 text-center mt-2 px-8">
                                When someone invites you to a tee time, it will appear here
                            </Text>
                        </View>
                    )
                ) : sentInvites.length > 0 ? (
                    sentInvites.map((invite) => <SentInviteCard key={invite.id} invite={invite} />)
                ) : (
                    <View className="items-center py-16">
                        <Users size={48} color="#D1D5DB" />
                        <Text className="text-lg font-bold text-gray-900 mt-4">No Sent Invites</Text>
                        <Text className="text-sm text-gray-500 text-center mt-2 px-8">
                            Create a tee time and invite your golf buddies!
                        </Text>
                    </View>
                )}
                <View className="h-5" />
            </ScrollView>
        </ScreenShell>
    );
}
