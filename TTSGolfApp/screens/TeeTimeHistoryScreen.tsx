import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { MapPin, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { teeTimeApi, TeeTimeHistoryEntry } from "../services/api";
import { logger } from "../utils/logger";
import { formatDateMMDDYYYY, parseCalendarDateLocal } from "../utils/formatting";

const COLORS = {
    primary: "#5EBC68",
    bg: "#F6F6F6",
    white: "#FFFFFF",
    text: "#1C1C1E",
    textSub: "#8A8A8E",
    border: "#E5E5EA",
    confirmed: "#2E7D32",
    confirmedBg: "#E8F5E9",
    pending: "#E65100",
    pendingBg: "#FFF3E0",
    declined: "#C62828",
    declinedBg: "#FFEBEE",
    completed: "#616161",
    completedBg: "#E0E0E0",
};

type FilterType = "all" | "upcoming" | "completed" | "cancelled" | "no_show";

const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
];

const formatDate = (dateStr: string) => {
    return formatDateMMDDYYYY(parseCalendarDateLocal(dateStr));
};

const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

const getStatusConfig = (status: string, attendanceStatus?: string) => {
    if (attendanceStatus === "no_show") {
        return { icon: AlertCircle, color: COLORS.declined, bg: COLORS.declinedBg, label: "No Show" };
    }
    switch (status) {
        case "completed":
            return { icon: CheckCircle, color: COLORS.confirmed, bg: COLORS.confirmedBg, label: "Completed" };
        case "cancelled":
            return { icon: XCircle, color: COLORS.declined, bg: COLORS.declinedBg, label: "Cancelled" };
        case "confirmed":
            return { icon: CheckCircle, color: COLORS.confirmed, bg: COLORS.confirmedBg, label: "Confirmed" };
        default:
            return { icon: Clock, color: COLORS.pending, bg: COLORS.pendingBg, label: "Pending" };
    }
};

interface HistoryItemProps {
    item: TeeTimeHistoryEntry;
    onPress: () => void;
}

const HistoryItem = memo(({ item, onPress }: HistoryItemProps) => {
    const statusConfig = getStatusConfig(item.status, item.attendanceStatus);
    const StatusIcon = statusConfig.icon;
    const isUpcoming = new Date(item.teeDate) >= new Date();

    return (
        <TouchableOpacity 
            className="bg-white rounded-md p-4 mb-3 shadow-sm"
            onPress={onPress} 
            activeOpacity={0.7}
        >
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-3">
                    <Text className="text-base font-semibold text-gray-900 mb-1" numberOfLines={1}>{item.courseName}</Text>
                    {item.courseLocation && (
                        <View className="flex-row items-center gap-1">
                            <MapPin size={12} color={COLORS.textSub} />
                            <Text className="text-[13px] text-gray-500" numberOfLines={1}>{item.courseLocation}</Text>
                        </View>
                    )}
                </View>
                <View 
                    className="flex-row items-center gap-1 px-2.5 py-1 rounded-md"
                    style={{ backgroundColor: statusConfig.bg }}
                >
                    <StatusIcon size={14} color={statusConfig.color} />
                    <Text className="text-xs font-semibold" style={{ color: statusConfig.color }}>{statusConfig.label}</Text>
                </View>
            </View>

            <View>
                <View className="flex-row gap-5 mb-3">
                    <View className="flex-row items-center gap-1.5">
                        <Calendar size={14} color={COLORS.textSub} />
                        <Text className="text-sm text-gray-900">{formatDate(item.teeDate)}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <Clock size={14} color={COLORS.textSub} />
                        <Text className="text-sm text-gray-900">{formatTime(item.teeTime)}</Text>
                    </View>
                </View>

                <View className="flex-row justify-between items-center pt-3 border-t border-gray-200">
                    <Text className="text-[13px] text-gray-500">
                        {item.userRole === "organizer" ? "Organizer" : "Participant"}
                    </Text>
                    <Text className="text-[13px] text-gray-500">
                        {item.participantCount}/{item.maxPlayers} players
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

interface FilterTabsProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

const FilterTabs = memo(({ activeFilter, onFilterChange }: FilterTabsProps) => (
    <View className="flex-row px-4 py-3 bg-white border-b border-gray-200 gap-2">
        {FILTERS.map((filter) => (
            <TouchableOpacity
                key={filter.key}
                className={`px-4 py-2 rounded-full ${activeFilter === filter.key ? 'bg-green-500' : 'bg-gray-100'}`}
                onPress={() => onFilterChange(filter.key)}
            >
                <Text className={`text-sm font-medium ${activeFilter === filter.key ? 'text-white' : 'text-gray-500'}`}>
                    {filter.label}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
));

export default function TeeTimeHistoryScreen({ navigation, route }: any) {
    const [history, setHistory] = useState<TeeTimeHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>(() => {
        const raw = route?.params?.initialFilter;
        if (raw && FILTERS.some((f) => f.key === raw)) return raw as FilterType;
        return "all";
    });

    const loadHistory = useCallback(async (selectedFilter: FilterType = filter) => {
        try {
            const response = await teeTimeApi.getHistory({ filter: selectedFilter, limit: 50 });
            if (response.success) {
                setHistory(response.history);
            }
        } catch (error) {
            logger.error("[TeeTimeHistoryScreen] Failed to load history", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => {
        void loadHistory(filter);
        // Initial fetch only; tab changes call loadHistory via handleFilterChange.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFilterChange = useCallback((newFilter: FilterType) => {
        setFilter(newFilter);
        setLoading(true);
        loadHistory(newFilter);
    }, [loadHistory]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadHistory();
    }, [loadHistory]);

    const handleItemPress = useCallback((item: TeeTimeHistoryEntry) => {
        navigation?.navigate("TeeTimeDetail", { teeTimeId: item.id });
    }, [navigation]);

    const renderItem = useCallback(({ item }: { item: TeeTimeHistoryEntry }) => (
        <HistoryItem item={item} onPress={() => handleItemPress(item)} />
    ), [handleItemPress]);

    const renderEmpty = useCallback(() => (
        <View className="items-center py-16 px-10">
            <Calendar size={48} color={COLORS.textSub} strokeWidth={1} />
            <Text className="text-lg font-semibold text-gray-900 mt-4 mb-2">No Tee Times</Text>
            <Text className="text-sm text-gray-500 text-center">
                {filter === "all"
                    ? "Your tee time history will appear here"
                    : `No ${filter} tee times found`}
            </Text>
        </View>
    ), [filter]);

    if (loading && !refreshing) {
        return (
            <ScreenShell>
                <AppHeader title="Tee Time History" onBack={() => navigation?.goBack()} />
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell>
            <AppHeader title="Tee Time History" onBack={() => navigation?.goBack()} />

            <FilterTabs activeFilter={filter} onFilterChange={handleFilterChange} />

            <FlashList
                data={history}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={COLORS.primary}
                    />
                }
            />
        </ScreenShell>
    );
}
