import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import { MapPin, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react-native";
import { Header } from "../components/common";
import { teeTimeApi, TeeTimeHistoryEntry } from "../services/api";

const COLORS = {
    primary: "#5DB075",
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
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
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
        <TouchableOpacity style={styles.historyCard} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
                <View style={styles.courseInfo}>
                    <Text style={styles.courseName} numberOfLines={1}>{item.courseName}</Text>
                    {item.courseLocation && (
                        <View style={styles.locationRow}>
                            <MapPin size={12} color={COLORS.textSub} />
                            <Text style={styles.locationText} numberOfLines={1}>{item.courseLocation}</Text>
                        </View>
                    )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <StatusIcon size={14} color={statusConfig.color} />
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.dateTimeRow}>
                    <View style={styles.infoItem}>
                        <Calendar size={14} color={COLORS.textSub} />
                        <Text style={styles.infoText}>{formatDate(item.teeDate)}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Clock size={14} color={COLORS.textSub} />
                        <Text style={styles.infoText}>{formatTime(item.teeTime)}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.roleText}>
                        {item.userRole === "creator" ? "Organizer" : "Participant"}
                    </Text>
                    <Text style={styles.playersText}>
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
    <View style={styles.filterContainer}>
        {FILTERS.map((filter) => (
            <TouchableOpacity
                key={filter.key}
                style={[styles.filterTab, activeFilter === filter.key && styles.filterTabActive]}
                onPress={() => onFilterChange(filter.key)}
            >
                <Text style={[styles.filterText, activeFilter === filter.key && styles.filterTextActive]}>
                    {filter.label}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
));

export default function TeeTimeHistoryScreen({ navigation }: any) {
    const [history, setHistory] = useState<TeeTimeHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>("all");

    const loadHistory = useCallback(async (selectedFilter: FilterType = filter) => {
        try {
            const response = await teeTimeApi.getHistory({ filter: selectedFilter, limit: 50 });
            if (response.success) {
                setHistory(response.history);
            }
        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => {
        loadHistory();
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
        <View style={styles.emptyContainer}>
            <Calendar size={48} color={COLORS.textSub} strokeWidth={1} />
            <Text style={styles.emptyTitle}>No Tee Times</Text>
            <Text style={styles.emptyText}>
                {filter === "all"
                    ? "Your tee time history will appear here"
                    : `No ${filter} tee times found`}
            </Text>
        </View>
    ), [filter]);

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Header title="Tee Time History" onBack={() => navigation?.goBack()} />

            <FilterTabs activeFilter={filter} onFilterChange={handleFilterChange} />

            <FlashList
                data={history}
                renderItem={renderItem}
                estimatedItemSize={140}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={COLORS.primary}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    filterContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 8,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.bg,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
    },
    filterText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
    },
    filterTextActive: {
        color: COLORS.white,
    },
    listContent: {
        padding: 16,
    },
    historyCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    courseInfo: {
        flex: 1,
        marginRight: 12,
    },
    courseName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 4,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    locationText: {
        fontSize: 13,
        color: COLORS.textSub,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    cardBody: {},
    dateTimeRow: {
        flexDirection: "row",
        gap: 20,
        marginBottom: 12,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.text,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    roleText: {
        fontSize: 13,
        color: COLORS.textSub,
    },
    playersText: {
        fontSize: 13,
        color: COLORS.textSub,
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
    },
});
