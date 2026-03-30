/**
 * Social Rate History Screen
 * Displays user's social rate score change history
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../../ui";
import { socialRateApi, rosterApi } from "../../services/api";
import { logger } from "../../utils/logger";
import type { SocialRateLogEntry } from "../../services/api";

const COLORS = {
    primary: "#5EBC68",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    bg: "#F3F4F6",
    border: "#E5E7EB",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
};

const getReasonLabel = (reason: string): string => {
    const labels: Record<string, string> = {
        invite_accepted: "Accepted Invite",
        invite_declined_late: "Late Decline",
        cancellation_late: "Late Cancellation",
        cancellation_confirmed: "Cancelled Confirmed",
        no_show: "No Show",
        initial_score: "Initial Score",
        admin_adjustment: "Admin Adjustment",
    };
    return labels[reason] || reason.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

interface HistoryItemProps {
    entry: SocialRateLogEntry;
}

const HistoryItem = ({ entry }: HistoryItemProps) => {
    const isPositive = entry.delta > 0;
    const isNegative = entry.delta < 0;
    const DeltaIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const deltaColor = isPositive ? COLORS.success : isNegative ? COLORS.danger : COLORS.textSecondary;

    return (
        <View
            style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
            }}
        >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 15,
                            color: COLORS.textPrimary,
                            marginBottom: 4,
                        }}
                    >
                        {getReasonLabel(entry.reason)}
                    </Text>
                    {entry.reasonDetails && (
                        <Text
                            style={{
                                fontFamily: "Inter_400Regular",
                                fontSize: 13,
                                color: COLORS.textSecondary,
                                marginBottom: 4,
                            }}
                        >
                            {entry.reasonDetails}
                        </Text>
                    )}
                    {entry.teeTime && (
                        <Text
                            style={{
                                fontFamily: "Inter_400Regular",
                                fontSize: 13,
                                color: COLORS.textSecondary,
                            }}
                        >
                            {entry.teeTime.courseName} • {entry.teeTime.date}
                        </Text>
                    )}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <DeltaIcon size={16} color={deltaColor} />
                        <Text
                            style={{
                                fontFamily: "Inter_700Bold",
                                fontSize: 16,
                                color: deltaColor,
                            }}
                        >
                            {entry.delta > 0 ? "+" : ""}{entry.delta}
                        </Text>
                    </View>
                    <Text
                        style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 14,
                            color: COLORS.textPrimary,
                            marginTop: 4,
                        }}
                    >
                        {entry.previousScore} → {entry.newScore}
                    </Text>
                </View>
            </View>
            <Text
                style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: COLORS.textSecondary,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                }}
            >
                {formatDate(entry.createdAt)}
            </Text>
        </View>
    );
};

export default function SocialRateHistoryScreen({ navigation, route }: any) {
    const rosterId = route?.params?.rosterId as string | undefined;
    const memberName = route?.params?.memberName as string | undefined;

    const [history, setHistory] = useState<SocialRateLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentScore, setCurrentScore] = useState<number | null>(null);

    const loadHistory = useCallback(async () => {
        try {
            if (rosterId) {
                const res = await rosterApi.getMemberSocialHistory(rosterId, 50, 0);
                if (res.success) {
                    setCurrentScore(res.currentScore ?? null);
                    setHistory(res.history || []);
                }
            } else {
                const [scoreRes, historyRes] = await Promise.all([
                    socialRateApi.getCurrentScore(),
                    socialRateApi.getHistory(50, 0),
                ]);

                if (scoreRes.success) {
                    setCurrentScore(scoreRes.socialRate.currentScore);
                }

                if (historyRes.success) {
                    setHistory(historyRes.history);
                }
            }
        } catch (error) {
            logger.error("[SocialRateHistoryScreen] Failed to load history", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [rosterId]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory, rosterId]);

    const screenTitle = memberName ? `Social rate · ${memberName}` : "Social Rate History";

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadHistory();
    }, [loadHistory]);

    if (loading) {
        return (
            <ScreenShell>
                <AppHeader title={screenTitle} onBack={() => navigation?.goBack()} />
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell>
            <AppHeader title={screenTitle} onBack={() => navigation?.goBack()} />

            <ScrollView
                style={{ flex: 1, backgroundColor: COLORS.bg }}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
                }
            >
                {/* Current Score Card */}
                {currentScore !== null && (
                    <View
                        style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: 16,
                            padding: 24,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            alignItems: "center",
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: "Inter_400Regular",
                                fontSize: 14,
                                color: COLORS.textSecondary,
                                marginBottom: 8,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                            }}
                        >
                            Current Social Rate
                        </Text>
                        <Text
                            style={{
                                fontFamily: "Inter_700Bold",
                                fontSize: 48,
                                color: COLORS.primary,
                            }}
                        >
                            {currentScore}
                        </Text>
                        <Text
                            style={{
                                fontFamily: "Inter_400Regular",
                                fontSize: 13,
                                color: COLORS.textSecondary,
                                marginTop: 8,
                                textAlign: "center",
                            }}
                        >
                            Score range: 0-200
                        </Text>
                    </View>
                )}

                {/* History List */}
                <View style={{ marginBottom: 16 }}>
                    <Text
                        style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 18,
                            color: COLORS.textPrimary,
                            marginBottom: 12,
                        }}
                    >
                        Score History
                    </Text>
                    {history.length === 0 ? (
                        <View
                            style={{
                                backgroundColor: "#FFFFFF",
                                borderRadius: 12,
                                padding: 32,
                                alignItems: "center",
                                borderWidth: 1,
                                borderColor: COLORS.border,
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: "Inter_500Medium",
                                    fontSize: 15,
                                    color: COLORS.textSecondary,
                                    textAlign: "center",
                                }}
                            >
                                No history yet
                            </Text>
                            <Text
                                style={{
                                    fontFamily: "Inter_400Regular",
                                    fontSize: 13,
                                    color: COLORS.textSecondary,
                                    marginTop: 4,
                                    textAlign: "center",
                                }}
                            >
                                {rosterId
                                    ? "No social rate changes recorded for this member yet."
                                    : "Your social rate changes will appear here"}
                            </Text>
                        </View>
                    ) : (
                        history.map((entry) => <HistoryItem key={entry.id} entry={entry} />)
                    )}
                </View>
            </ScrollView>
        </ScreenShell>
    );
}
