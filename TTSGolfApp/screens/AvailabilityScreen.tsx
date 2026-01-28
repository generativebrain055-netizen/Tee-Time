import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Search, UserPlus, Clock, MapPin, Users, Info, Check, X } from "lucide-react-native";
import { BottomNav, Header } from "../components/common";
import { friendApi, DiscoveredUser } from "../services/api";
import { COLORS } from "../constants/colors";

type FilterType = "all" | "friends" | "nearby";

export default function AvailabilityScreen({ navigation }: any) {
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<DiscoveredUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>("all");
    const [sendingRequest, setSendingRequest] = useState<string | null>(null);
    const [respondingTo, setRespondingTo] = useState<string | null>(null);

    // Cache pending requests to get request IDs
    const pendingRequestsCache = useRef<Map<string, string>>(new Map());

    const fetchUsers = useCallback(async () => {
        try {
            const params: { location?: string; course?: string } = {};
            if (searchQuery) {
                params.location = searchQuery;
                params.course = searchQuery;
            }

            // Fetch users and pending requests in parallel
            const [usersResponse, pendingResponse] = await Promise.all([
                friendApi.discoverUsers(params),
                friendApi.getPendingRequests(),
            ]);

            if (usersResponse.success) {
                setUsers(usersResponse.users);
            }

            // Cache pending request IDs by sender ID
            if (pendingResponse.success && pendingResponse.requests) {
                pendingRequestsCache.current.clear();
                pendingResponse.requests.forEach((req: any) => {
                    pendingRequestsCache.current.set(req.sender.id, req.id);
                });
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const handleSearch = () => {
        setLoading(true);
        fetchUsers();
    };

    const handleAddFriend = async (userId: string) => {
        setSendingRequest(userId);
        try {
            const response = await friendApi.sendRequest(userId);
            if (response.success) {
                setUsers((prev) =>
                    prev.map((u) => (u.id === userId ? { ...u, friendshipStatus: "requested" } : u))
                );
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to send friend request");
        } finally {
            setSendingRequest(null);
        }
    };

    const handleViewProfile = (user: DiscoveredUser) => {
        navigation.navigate("FriendProfile", { userId: user.id, user });
    };

    const handleAcceptRequest = async (userId: string) => {
        setRespondingTo(userId);
        try {
            // Get the request ID from cache
            let requestId = pendingRequestsCache.current.get(userId);

            // If not in cache, fetch pending requests to find it
            if (!requestId) {
                const pendingRes = await friendApi.getPendingRequests();
                if (pendingRes.success && pendingRes.requests) {
                    const request = pendingRes.requests.find((r: any) => r.sender.id === userId);
                    if (request) {
                        requestId = request.id;
                        pendingRequestsCache.current.set(userId, request.id);
                    }
                }
            }

            if (!requestId) {
                Alert.alert("Error", "Friend request not found");
                return;
            }

            const response = await friendApi.respondToRequest(requestId, "accepted");
            if (response.success) {
                setUsers((prev) =>
                    prev.map((u) => (u.id === userId ? { ...u, friendshipStatus: "friend" } : u))
                );
                pendingRequestsCache.current.delete(userId);
                Alert.alert("Success", "Friend request accepted!");
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to accept request");
        } finally {
            setRespondingTo(null);
        }
    };

    const handleRejectRequest = async (userId: string) => {
        setRespondingTo(userId);
        try {
            // Get the request ID from cache
            let requestId = pendingRequestsCache.current.get(userId);

            // If not in cache, fetch pending requests to find it
            if (!requestId) {
                const pendingRes = await friendApi.getPendingRequests();
                if (pendingRes.success && pendingRes.requests) {
                    const request = pendingRes.requests.find((r: any) => r.sender.id === userId);
                    if (request) {
                        requestId = request.id;
                        pendingRequestsCache.current.set(userId, request.id);
                    }
                }
            }

            if (!requestId) {
                Alert.alert("Error", "Friend request not found");
                return;
            }

            const response = await friendApi.respondToRequest(requestId, "declined");
            if (response.success) {
                setUsers((prev) =>
                    prev.map((u) => (u.id === userId ? { ...u, friendshipStatus: "none" } : u))
                );
                pendingRequestsCache.current.delete(userId);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to decline request");
        } finally {
            setRespondingTo(null);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.homeCourse?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.location?.toLowerCase().includes(searchQuery.toLowerCase());

        if (filter === "friends") return matchesSearch && user.friendshipStatus === "friend";
        if (filter === "nearby") return matchesSearch && user.location;
        return matchesSearch;
    });

    const getStatusButton = (user: DiscoveredUser) => {
        if (sendingRequest === user.id || respondingTo === user.id) {
            return (
                <View style={styles.statusButton}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
            );
        }

        switch (user.friendshipStatus) {
            case "friend":
                // Friends only show info button - they're already in roster
                return (
                    <TouchableOpacity
                        style={[styles.statusButton, styles.infoButton]}
                        onPress={() => handleViewProfile(user)}
                    >
                        <Info size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                );
            case "requested":
                return (
                    <View style={[styles.statusButton, styles.requestedButton]}>
                        <Clock size={18} color={COLORS.requested} />
                    </View>
                );
            case "pending":
                // Show accept/reject buttons for incoming friend requests
                return (
                    <View style={styles.pendingActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => handleAcceptRequest(user.id)}
                        >
                            <Check size={18} color={COLORS.white} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleRejectRequest(user.id)}
                        >
                            <X size={18} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                );
            default:
                return (
                    <TouchableOpacity
                        style={[styles.statusButton, styles.addButton]}
                        onPress={() => handleAddFriend(user.id)}
                    >
                        <UserPlus size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                );
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <Header
                title="Availability"
                showBack={false}
            />

            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Search size={20} color={COLORS.textSub} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, course, or location..."
                        placeholderTextColor={COLORS.textSub}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
            </View>

            <View style={styles.filterContainer}>
                {(["all", "friends", "nearby"] as const).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f === "all" ? "All" : f === "friends" ? "Friends" : "Nearby"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : filteredUsers.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Users size={48} color={COLORS.textSub} />
                        <Text style={styles.emptyText}>No golfers found</Text>
                        <Text style={styles.emptySubtext}>Try searching by course or location</Text>
                    </View>
                ) : (
                    filteredUsers.map((user) => (
                        <TouchableOpacity
                            key={user.id}
                            style={styles.userCard}
                            onPress={() => handleViewProfile(user)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.userAvatar}>
                                {user.avatar ? (
                                    <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={styles.avatarInitial}>
                                        {user.firstName?.charAt(0) || "?"}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>
                                    {user.firstName} {user.lastName}
                                </Text>
                                <View style={styles.userMeta}>
                                    {user.handicap !== undefined && (
                                        <Text style={styles.handicapBadge}>HCP {user.handicap}</Text>
                                    )}
                                    {user.homeCourse && (
                                        <View style={styles.locationRow}>
                                            <MapPin size={12} color={COLORS.textSub} />
                                            <Text style={styles.locationText} numberOfLines={1}>
                                                {user.homeCourse}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            {getStatusButton(user)}
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <BottomNav activeTab="Availability" navigation={navigation} />
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    searchContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.white },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.bg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchInput: { flex: 1, fontSize: 15, color: COLORS.text, marginLeft: 10 },
    filterContainer: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: COLORS.bg,
    },
    filterTabActive: { backgroundColor: COLORS.primary },
    filterText: { fontSize: 14, fontWeight: "500", color: COLORS.textSub },
    filterTextActive: { color: COLORS.white },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    emptyState: { alignItems: "center", marginTop: 60 },
    emptyText: { fontSize: 18, fontWeight: "600", color: COLORS.text, marginTop: 16 },
    emptySubtext: { fontSize: 14, color: COLORS.textSub, marginTop: 4 },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    userAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    avatarImage: { width: 52, height: 52, borderRadius: 26 },
    avatarInitial: { fontSize: 22, fontWeight: "bold", color: COLORS.white },
    userInfo: { flex: 1, marginLeft: 14 },
    userName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
    userMeta: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 10 },
    handicapBadge: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.primary,
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
    locationText: { fontSize: 13, color: COLORS.textSub, flex: 1 },
    statusButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    addButton: { backgroundColor: "#E8F5E9" },
    infoButton: { backgroundColor: "#E8F5E9" },
    requestedButton: { backgroundColor: "#FEF3C7" },
    pendingActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    acceptButton: {
        backgroundColor: COLORS.primary,
    },
    rejectButton: {
        backgroundColor: "#EF4444",
    },
});
