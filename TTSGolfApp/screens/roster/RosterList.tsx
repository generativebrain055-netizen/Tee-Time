import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { Calendar, MessageSquare, Star, StarOff, ChevronDown } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { RosterPerson, SortOption } from "./types";
import { rosterApi, RosterContact } from "../../services/api";

interface RosterListProps {
    onPersonClick: (person: RosterPerson) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "position", label: "Position" },
    { value: "socialRate", label: "Social Rate" },
    { value: "handicap", label: "Handicap" },
    { value: "name", label: "Name" },
    { value: "distance", label: "Distance" },
    { value: "membership", label: "Membership" },
];

export default function RosterList({ onPersonClick }: RosterListProps) {
    const [roster, setRoster] = useState<RosterContact[]>([]);
    const [onDeck, setOnDeck] = useState<RosterContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>("position");
    const [showSortMenu, setShowSortMenu] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [rosterRes, onDeckRes] = await Promise.all([
                rosterApi.getRoster(sortBy),
                rosterApi.getOnDeck(),
            ]);
            if (rosterRes.success) {
                setRoster(rosterRes.roster.filter((r) => !r.isOnDeck));
            }
            if (onDeckRes.success) {
                setOnDeck(onDeckRes.onDeck);
            }
        } catch (error) {
            console.error("Failed to load roster:", error);
            // Show empty state on error
            setRoster([]);
            setOnDeck([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sortBy]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
    }, [loadData]);

    const handleMoveToOnDeck = async (item: RosterContact) => {
        try {
            await rosterApi.moveMember(item.id, { isOnDeck: true, newPosition: onDeck.length });
            setRoster((prev) => prev.filter((r) => r.id !== item.id));
            setOnDeck((prev) => [...prev, { ...item, isOnDeck: true }]);
        } catch (error) {
            Alert.alert("Error", "Failed to move to On Deck");
        }
    };

    const handleMoveToRoster = async (item: RosterContact) => {
        try {
            await rosterApi.moveMember(item.id, { isOnDeck: false, newPosition: roster.length });
            setOnDeck((prev) => prev.filter((r) => r.id !== item.id));
            setRoster((prev) => [...prev, { ...item, isOnDeck: false }]);
        } catch (error) {
            Alert.alert("Error", "Failed to move to Roster");
        }
    };

    const toPerson = (item: RosterContact, index: number): RosterPerson => ({
        id: item.id,
        name: item.contact.name || "Unknown",
        sub: item.contact.handicap ? `HCP ${item.contact.handicap}` : item.contact.phone || "",
        img:
            item.contact.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.contact.name}`,
        phone: item.contact.phone,
        handicap: item.contact.handicap,
        socialRate: (item.contact as any).socialRate,
        isOnDeck: item.isOnDeck,
    });

    const SortDropdown = () => (
        <View style={styles.sortContainer}>
            <TouchableOpacity
                style={styles.sortButton}
                onPress={() => setShowSortMenu(!showSortMenu)}
            >
                <Text style={styles.sortLabel}>
                    Sort: {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </Text>
                <ChevronDown size={16} color={COLORS.textSub} />
            </TouchableOpacity>
            {showSortMenu && (
                <View style={styles.sortMenu}>
                    {SORT_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.sortMenuItem,
                                sortBy === option.value && styles.sortMenuItemActive,
                            ]}
                            onPress={() => {
                                setSortBy(option.value);
                                setShowSortMenu(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.sortMenuText,
                                    sortBy === option.value && styles.sortMenuTextActive,
                                ]}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );

    const RosterItem = ({
        item,
        index,
        isOnDeckSection,
    }: {
        item: RosterContact;
        index: number;
        isOnDeckSection: boolean;
    }) => {
        const person = toPerson(item, index);

        return (
            <TouchableOpacity style={styles.rosterItem} onPress={() => onPersonClick(person)}>
                <View style={styles.leftSection}>
                    <Text style={styles.rosterNumber}>{index + 1}</Text>
                    <Image source={{ uri: person.img }} style={styles.avatar} />
                    <View style={styles.rosterInfo}>
                        <Text style={styles.rosterName}>{person.name}</Text>
                        <View style={styles.statsRow}>
                            <Text style={styles.rosterSub}>{person.sub}</Text>
                            {person.socialRate && (
                                <Text style={styles.socialRate}>★ {person.socialRate.toFixed(1)}</Text>
                            )}
                        </View>
                    </View>
                </View>
                <View style={styles.rosterActions}>
                    <TouchableOpacity
                        style={[
                            styles.actionBtn,
                            isOnDeckSection ? styles.actionBtnYellow : styles.actionBtnGray,
                        ]}
                        onPress={() =>
                            isOnDeckSection ? handleMoveToRoster(item) : handleMoveToOnDeck(item)
                        }
                    >
                        {isOnDeckSection ? (
                            <Star size={16} color="#F59E0B" fill="#F59E0B" />
                        ) : (
                            <StarOff size={16} color={COLORS.textSub} />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnGreen}>
                        <Calendar size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnBlue}>
                        <MessageSquare size={16} color="#3B82F6" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <SortDropdown />
            </View>

            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Roster Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Roster</Text>
                    <Text style={styles.sectionCount}>{roster.length} players • Auto-invite</Text>
                </View>
                {roster.length > 0 ? (
                    roster.map((item, index) => (
                        <RosterItem key={item.id} item={item} index={index} isOnDeckSection={false} />
                    ))
                ) : (
                    <View style={styles.emptySection}>
                        <Text style={styles.emptyText}>No players in roster</Text>
                        <Text style={styles.emptySubtext}>
                            Add friends from Availability to your roster
                        </Text>
                    </View>
                )}

                {/* On Deck Section */}
                <View style={[styles.sectionHeader, styles.onDeckHeader]}>
                    <Text style={styles.sectionTitle}>On Deck</Text>
                    <Text style={styles.sectionCount}>{onDeck.length} reserves • Manual select</Text>
                </View>
                <View style={styles.onDeckInfo}>
                    <Text style={styles.onDeckInfoText}>
                        Reserve players that can be manually selected if Roster fails to fill tee time
                    </Text>
                </View>
                {onDeck.length > 0 ? (
                    onDeck.map((item, index) => (
                        <RosterItem key={item.id} item={item} index={index} isOnDeckSection={true} />
                    ))
                ) : (
                    <View style={styles.emptySection}>
                        <Text style={styles.emptyText}>No players on deck</Text>
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        zIndex: 100,
    },
    sortContainer: { position: "relative", zIndex: 100 },
    sortButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        gap: 4,
    },
    sortLabel: { fontSize: 13, color: COLORS.textMain, fontWeight: "500" },
    sortMenu: {
        position: "absolute",
        top: 36,
        left: 0,
        backgroundColor: COLORS.white,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        minWidth: 140,
        zIndex: 1000,
    },
    sortMenuItem: { paddingHorizontal: 14, paddingVertical: 10 },
    sortMenuItemActive: { backgroundColor: "#E8F5E9" },
    sortMenuText: { fontSize: 14, color: COLORS.textMain },
    sortMenuTextActive: { color: COLORS.primary, fontWeight: "600" },
    list: { flex: 1, paddingHorizontal: 16 },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        marginTop: 8,
    },
    onDeckHeader: {
        marginTop: 24,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingTop: 16,
    },
    sectionTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.textMain },
    sectionCount: { fontSize: 12, color: COLORS.textSub },
    onDeckInfo: {
        backgroundColor: "#FEF3C7",
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
    },
    onDeckInfoText: { fontSize: 12, color: "#92400E" },
    rosterItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F9FAFB",
    },
    leftSection: { flexDirection: "row", alignItems: "center", flex: 1 },
    rosterNumber: { fontSize: 14, fontWeight: "bold", color: COLORS.textMain, width: 24 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.divider },
    rosterInfo: { flex: 1, marginLeft: 12 },
    rosterName: { fontSize: 14, fontWeight: "bold", color: COLORS.textMain },
    statsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
    rosterSub: { fontSize: 12, color: COLORS.textSub },
    socialRate: { fontSize: 11, color: "#F59E0B", fontWeight: "600" },
    rosterActions: { flexDirection: "row", gap: 4 },
    actionBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
    },
    actionBtnGray: { backgroundColor: "#F3F4F6" },
    actionBtnYellow: { backgroundColor: "#FEF3C7" },
    actionBtnGreen: {
        width: 28,
        height: 28,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#E8F5E9",
    },
    actionBtnBlue: {
        width: 28,
        height: 28,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#E3F2FD",
    },
    emptySection: { alignItems: "center", paddingVertical: 24 },
    emptyText: { fontSize: 14, color: COLORS.textSub },
    emptySubtext: { fontSize: 12, color: COLORS.textSub, marginTop: 4 },
});
