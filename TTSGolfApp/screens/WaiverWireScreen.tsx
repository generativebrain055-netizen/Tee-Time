/**
 * Waiver Wire Screen
 * Allows users to post availability and find playing partners
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
    Image,
    StyleSheet,
    Modal,
    TextInput,
} from "react-native";
import {
    Calendar,
    MapPin,
    Clock,
    Users,
    Plus,
    Edit2,
    Trash2,
    MessageCircle,
    Filter,
    ChevronDown,
    Check,
    X,
} from "lucide-react-native";
import { logger } from "../utils/logger";
import { ScreenShell, AppHeader } from "../ui";
import { rosterApi, TimeSlot, WaiverWireEntry } from "../services/api";
import { formatDateMMDDYYYY, parseCalendarDateLocal } from "../utils/formatting";
import { useAuthStore } from "../stores";
import { spacing, fontSize, radii, palette } from "../ui/theme/tokens";
import {
    requestForegroundPermissionsAsync,
    getCurrentPositionAsync,
    LOCATION_UNAVAILABLE,
} from "../utils/safeLocation";

const TIME_SLOTS: { key: TimeSlot; label: string }[] = [
    { key: 'morning', label: 'Morning' },
    { key: 'midday', label: 'Mid-Day' },
    { key: 'afternoon', label: 'Afternoon' },
    { key: 'anytime', label: 'Anytime' },
];

const DISTANCE_FILTERS = [
    { value: null, label: "All distances" },
    { value: 5, label: "Within 5 miles" },
    { value: 10, label: "Within 10 miles" },
    { value: 20, label: "Within 20 miles" },
    { value: 30, label: "Within 30 miles" },
    { value: 50, label: "Within 50 miles" },
];

export default function WaiverWireScreen({ navigation }: any) {
    const user = useAuthStore((s) => s.user);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [waiverWirePosts, setWaiverWirePosts] = useState<WaiverWireEntry[]>([]);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [rosterConnectionsOnly, setRosterConnectionsOnly] = useState(false);
    const [maxDistance, setMaxDistance] = useState<number | null>(null);
    const [showDistanceFilter, setShowDistanceFilter] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPost, setEditingPost] = useState<WaiverWireEntry | null>(null);
    
    // Post form state
    const [postDate, setPostDate] = useState(selectedDate);
    const [postTimeSlot, setPostTimeSlot] = useState<TimeSlot | undefined>(undefined);
    const [postCourse, setPostCourse] = useState("");
    const [postNotes, setPostNotes] = useState("");

    useEffect(() => {
        requestLocationPermission();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            loadWaiverWire();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, rosterConnectionsOnly, maxDistance, userLocation]);

    const requestLocationPermission = async () => {
        try {
            const { status } = await requestForegroundPermissionsAsync();
            if (status === "granted") {
                const location = await getCurrentPositionAsync({});
                setUserLocation({
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                });
            }
        } catch (error: any) {
            if (error?.message === LOCATION_UNAVAILABLE) {
                logger.warn("[WaiverWireScreen] Location native module not available");
                return;
            }
            logger.error("[WaiverWireScreen] Location error", error);
        }
    };

    const loadWaiverWire = useCallback(async () => {
        if (!selectedDate) return;
        
        try {
            setLoading(true);
            const options: any = {
                rosterConnectionsOnly,
            };
            
            if (maxDistance && userLocation) {
                options.maxDistance = maxDistance;
                options.lat = userLocation.lat;
                options.lng = userLocation.lng;
            }
            
            const response = await rosterApi.getWaiverWire(selectedDate, options);
            if (response.success) {
                setWaiverWirePosts(response.waiverWire || []);
            }
        } catch (error) {
            logger.error("[WaiverWireScreen] Failed to load waiver wire", error);
            Alert.alert("Error", "Failed to load waiver wire posts");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDate, rosterConnectionsOnly, maxDistance, userLocation]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadWaiverWire();
    }, [loadWaiverWire]);

    const handlePost = async () => {
        if (!postDate) {
            Alert.alert("Error", "Please select a date");
            return;
        }

        try {
            const response = await rosterApi.addToWaiverWire({
                availableDate: postDate,
                preferredTime: postTimeSlot,
                preferredCourse: postCourse.trim() || undefined,
                notes: postNotes.trim() || undefined,
            });

            if (response.success) {
                Alert.alert("Success", "Your availability has been posted!");
                setShowPostModal(false);
                resetPostForm();
                await loadWaiverWire();
            } else {
                Alert.alert("Error", "Failed to post availability");
            }
        } catch (error: any) {
            logger.error("[WaiverWireScreen] Post error", error);
            Alert.alert("Error", error.message || "Failed to post availability");
        }
    };

    const handleEdit = (post: WaiverWireEntry) => {
        if (!post || !post.availableDate) {
            Alert.alert("Error", "Unable to edit this post");
            return;
        }
        setEditingPost(post);
        setPostDate(post.availableDate);
        setPostTimeSlot(post.preferredTime);
        setPostCourse(post.preferredCourse || "");
        setPostNotes(post.notes || "");
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!editingPost || !postDate) return;

        try {
            const response = await rosterApi.updateWaiverWire(editingPost.availableDate, {
                availableDate: postDate,
                preferredTime: postTimeSlot,
                preferredCourse: postCourse.trim() || undefined,
                notes: postNotes.trim() || undefined,
            });

            if (response.success) {
                Alert.alert("Success", "Your post has been updated!");
                setShowEditModal(false);
                resetPostForm();
                setEditingPost(null);
                await loadWaiverWire();
            } else {
                Alert.alert("Error", "Failed to update post");
            }
        } catch (error: any) {
            logger.error("[WaiverWireScreen] Update error", error);
            Alert.alert("Error", error.message || "Failed to update post");
        }
    };

    const handleDelete = (post: WaiverWireEntry) => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this waiver wire post?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await rosterApi.removeFromWaiverWire(post.availableDate);
                            if (response.success) {
                                Alert.alert("Success", "Post deleted");
                                await loadWaiverWire();
                            }
                        } catch (error: any) {
                            logger.error("[WaiverWireScreen] Delete error", error);
                            Alert.alert("Error", error.message || "Failed to delete post");
                        }
                    },
                },
            ]
        );
    };

    const handleContact = (post: WaiverWireEntry) => {
        // Navigate to chat or friend profile
        if (post.user?.id) {
            navigation?.navigate("FriendProfile", { userId: post.user.id });
        } else {
            Alert.alert("Error", "Unable to contact this user");
        }
    };

    const resetPostForm = useCallback(() => {
        setPostDate(selectedDate);
        setPostTimeSlot(undefined);
        setPostCourse("");
        setPostNotes("");
    }, [selectedDate]);

    const formatDate = (dateStr: string) => {
        return formatDateMMDDYYYY(parseCalendarDateLocal(dateStr));
    };

    const getTimeSlotLabel = (slot?: TimeSlot) => {
        if (!slot) return "Not specified";
        return TIME_SLOTS.find(s => s.key === slot)?.label || slot;
    };

    const getCurrentWeekDates = useCallback(() => {
        const dates: string[] = [];
        const today = new Date();
        const startOfWeek = new Date(today);
        // Start of week (Sunday = 0, Monday = 1, etc.)
        // For US convention, week starts on Sunday
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    }, []);

    const weekDates = getCurrentWeekDates();
    const userPost = waiverWirePosts.find(p => p.user?.id === user?.id);

    if (loading && !waiverWirePosts.length) {
        return (
            <ScreenShell>
                <AppHeader title="Waiver Wire" onBack={() => navigation?.goBack()} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={palette.green500} />
                </View>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell>
            <AppHeader
                title="Waiver Wire"
                onBack={() => navigation?.goBack()}
                rightComponent={
                    <TouchableOpacity
                        onPress={() => {
                            resetPostForm();
                            setShowPostModal(true);
                        }}
                        style={styles.addButton}
                    >
                        <Plus size={20} color={palette.green600} strokeWidth={2.5} />
                    </TouchableOpacity>
                }
            />

            {/* Week Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekSelector}>
                {weekDates.map((date) => (
                    <TouchableOpacity
                        key={date}
                        style={[
                            styles.dateButton,
                            selectedDate === date && styles.dateButtonActive,
                        ]}
                        onPress={() => setSelectedDate(date)}
                    >
                        <Text
                            style={[
                                styles.dateButtonText,
                                selectedDate === date && styles.dateButtonTextActive,
                            ]}
                        >
                            {formatDate(date)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        rosterConnectionsOnly && styles.filterButtonActive,
                    ]}
                    onPress={() => setRosterConnectionsOnly(!rosterConnectionsOnly)}
                >
                    <Users size={16} color={rosterConnectionsOnly ? palette.green600 : palette.gray600} />
                    <Text
                        style={[
                            styles.filterButtonText,
                            rosterConnectionsOnly && styles.filterButtonTextActive,
                        ]}
                    >
                        Roster Only
                    </Text>
                </TouchableOpacity>

                <View style={{ position: "relative" }}>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setShowDistanceFilter(!showDistanceFilter)}
                    >
                        <MapPin size={16} color={palette.gray600} />
                        <Text style={styles.filterButtonText}>
                            {DISTANCE_FILTERS.find(f => f.value === maxDistance)?.label || "Distance"}
                        </Text>
                        <ChevronDown size={16} color={palette.gray600} />
                    </TouchableOpacity>

                    {showDistanceFilter && (
                        <View style={styles.distanceDropdown}>
                            {DISTANCE_FILTERS.map((filter) => (
                                <TouchableOpacity
                                    key={filter.value || "all"}
                                    style={[
                                        styles.distanceOption,
                                        maxDistance === filter.value && styles.distanceOptionActive,
                                    ]}
                                    onPress={() => {
                                        setMaxDistance(filter.value);
                                        setShowDistanceFilter(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.distanceOptionText,
                                            maxDistance === filter.value && styles.distanceOptionTextActive,
                                        ]}
                                    >
                                        {filter.label}
                                    </Text>
                                    {maxDistance === filter.value && (
                                        <Check size={16} color={palette.green600} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            {/* User's Post */}
            {userPost && (
                <View style={styles.userPostCard}>
                    <View style={styles.userPostHeader}>
                        <Text style={styles.userPostTitle}>Your Post</Text>
                        <View style={styles.userPostActions}>
                            <TouchableOpacity
                                onPress={() => handleEdit(userPost)}
                                style={styles.actionIcon}
                            >
                                <Edit2 size={18} color={palette.gray600} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleDelete(userPost)}
                                style={styles.actionIcon}
                            >
                                <Trash2 size={18} color={palette.red600} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.userPostContent}>
                        <View style={styles.userPostRow}>
                            <Clock size={16} color={palette.gray600} />
                            <Text style={styles.userPostText}>
                                {getTimeSlotLabel(userPost.preferredTime)}
                            </Text>
                        </View>
                        {userPost.preferredCourse && (
                            <View style={styles.userPostRow}>
                                <MapPin size={16} color={palette.gray600} />
                                <Text style={styles.userPostText}>{userPost.preferredCourse}</Text>
                            </View>
                        )}
                        {userPost.notes && (
                            <Text style={styles.userPostNotes}>{userPost.notes}</Text>
                        )}
                    </View>
                </View>
            )}

            {/* Posts List */}
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.green500} />
                }
            >
                {waiverWirePosts.filter(p => p.user?.id !== user?.id).length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Users size={48} color={palette.gray400} strokeWidth={1.5} />
                        <Text style={styles.emptyTitle}>No posts found</Text>
                        <Text style={styles.emptySubtitle}>
                            {rosterConnectionsOnly
                                ? "No roster connections have posted availability for this date."
                                : "No one has posted availability for this date."}
                        </Text>
                    </View>
                ) : (
                    waiverWirePosts
                        .filter(p => p.user?.id !== user?.id)
                        .map((post) => (
                            <View key={post.id} style={styles.postCard}>
                                <View style={styles.postHeader}>
                                    <View style={styles.postUserInfo}>
                                        {post.user?.avatar ? (
                                            <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
                                        ) : (
                                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                                <Text style={styles.avatarInitials}>
                                                    {(post.user?.name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.postUserDetails}>
                                            <Text style={styles.postUserName}>{post.user?.name || "Unknown User"}</Text>
                                            {post.user?.location && (
                                                <Text style={styles.postUserLocation}>{post.user.location}</Text>
                                            )}
                                            <View style={styles.postUserStats}>
                                                {post.user?.handicap !== undefined && post.user.handicap !== null && (
                                                    <Text style={styles.postUserStat}>HCP {post.user.handicap}</Text>
                                                )}
                                                {post.user?.socialRate !== undefined && post.user.socialRate !== null && (
                                                    <Text
                                                        style={[
                                                            styles.postUserStat,
                                                            post.user.socialRate >= 0 ? styles.socialRatePositive : styles.socialRateNegative,
                                                        ]}
                                                    >
                                                        Social Rate: {post.user.socialRate}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                    {post.distance !== undefined && post.distance !== null && (
                                        <Text style={styles.postDistance}>{post.distance.toFixed(1)} mi</Text>
                                    )}
                                </View>

                                <View style={styles.postContent}>
                                    <View style={styles.postRow}>
                                        <Clock size={16} color={palette.gray600} />
                                        <Text style={styles.postText}>
                                            {getTimeSlotLabel(post.preferredTime)}
                                        </Text>
                                    </View>
                                    {post.preferredCourse && (
                                        <View style={styles.postRow}>
                                            <MapPin size={16} color={palette.gray600} />
                                            <Text style={styles.postText}>{post.preferredCourse}</Text>
                                        </View>
                                    )}
                                    {post.notes && (
                                        <Text style={styles.postNotes}>{post.notes}</Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={styles.contactButton}
                                    onPress={() => handleContact(post)}
                                >
                                    <MessageCircle size={16} color={palette.green600} />
                                    <Text style={styles.contactButtonText}>Contact</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                )}
                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Post Modal */}
            <Modal visible={showPostModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Post Availability</Text>
                            <TouchableOpacity onPress={() => setShowPostModal(false)}>
                                <X size={24} color={palette.gray600} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.modalLabel}>Date</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePicker}>
                                {weekDates.map((date) => (
                                    <TouchableOpacity
                                        key={date}
                                        style={[
                                            styles.dateOption,
                                            postDate === date && styles.dateOptionActive,
                                        ]}
                                        onPress={() => setPostDate(date)}
                                    >
                                        <Text
                                            style={[
                                                styles.dateOptionText,
                                                postDate === date && styles.dateOptionTextActive,
                                            ]}
                                        >
                                            {formatDate(date)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={styles.modalLabel}>Time Slot</Text>
                            <View style={styles.timeSlotGrid}>
                                {TIME_SLOTS.map((slot) => (
                                    <TouchableOpacity
                                        key={slot.key}
                                        style={[
                                            styles.timeSlotButton,
                                            postTimeSlot === slot.key && styles.timeSlotButtonActive,
                                        ]}
                                        onPress={() => setPostTimeSlot(slot.key)}
                                    >
                                        <Text
                                            style={[
                                                styles.timeSlotButtonText,
                                                postTimeSlot === slot.key && styles.timeSlotButtonTextActive,
                                            ]}
                                        >
                                            {slot.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.modalLabel}>Preferred Course (Optional)</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Course name"
                                value={postCourse}
                                onChangeText={setPostCourse}
                            />

                            <Text style={styles.modalLabel}>Notes (Optional)</Text>
                            <TextInput
                                style={[styles.modalInput, styles.modalTextArea]}
                                placeholder="Additional details..."
                                value={postNotes}
                                onChangeText={setPostNotes}
                                multiline
                                numberOfLines={3}
                            />

                            <TouchableOpacity style={styles.modalSubmitButton} onPress={handlePost}>
                                <Text style={styles.modalSubmitButtonText}>Post</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Edit Modal */}
            <Modal visible={showEditModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Post</Text>
                            <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                <X size={24} color={palette.gray600} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.modalLabel}>Date</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePicker}>
                                {weekDates.map((date) => (
                                    <TouchableOpacity
                                        key={date}
                                        style={[
                                            styles.dateOption,
                                            postDate === date && styles.dateOptionActive,
                                        ]}
                                        onPress={() => setPostDate(date)}
                                    >
                                        <Text
                                            style={[
                                                styles.dateOptionText,
                                                postDate === date && styles.dateOptionTextActive,
                                            ]}
                                        >
                                            {formatDate(date)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={styles.modalLabel}>Time Slot</Text>
                            <View style={styles.timeSlotGrid}>
                                {TIME_SLOTS.map((slot) => (
                                    <TouchableOpacity
                                        key={slot.key}
                                        style={[
                                            styles.timeSlotButton,
                                            postTimeSlot === slot.key && styles.timeSlotButtonActive,
                                        ]}
                                        onPress={() => setPostTimeSlot(slot.key)}
                                    >
                                        <Text
                                            style={[
                                                styles.timeSlotButtonText,
                                                postTimeSlot === slot.key && styles.timeSlotButtonTextActive,
                                            ]}
                                        >
                                            {slot.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.modalLabel}>Preferred Course (Optional)</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Course name"
                                value={postCourse}
                                onChangeText={setPostCourse}
                            />

                            <Text style={styles.modalLabel}>Notes (Optional)</Text>
                            <TextInput
                                style={[styles.modalInput, styles.modalTextArea]}
                                placeholder="Additional details..."
                                value={postNotes}
                                onChangeText={setPostNotes}
                                multiline
                                numberOfLines={3}
                            />

                            <TouchableOpacity style={styles.modalSubmitButton} onPress={handleUpdate}>
                                <Text style={styles.modalSubmitButtonText}>Update</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },
    addButton: {
        padding: 8,
    },
    weekSelector: {
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: palette.gray200,
        paddingVertical: spacing.sm,
    },
    dateButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        marginHorizontal: spacing.xs,
        borderRadius: radii.md,
        backgroundColor: palette.gray100,
    },
    dateButtonActive: {
        backgroundColor: palette.green600,
    },
    dateButtonText: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.sm,
        color: palette.gray700,
    },
    dateButtonTextActive: {
        fontFamily: "Inter_600SemiBold",
        color: "#FFFFFF",
    },
    filtersContainer: {
        flexDirection: "row",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: palette.gray200,
        gap: spacing.sm,
    },
    filterButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: radii.md,
        backgroundColor: palette.gray100,
    },
    filterButtonActive: {
        backgroundColor: palette.green50,
    },
    filterButtonText: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.sm,
        color: palette.gray700,
    },
    filterButtonTextActive: {
        fontFamily: "Inter_600SemiBold",
        color: palette.green600,
    },
    distanceDropdown: {
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: spacing.xs,
        backgroundColor: "#FFFFFF",
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: palette.gray200,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1000,
        minWidth: 150,
    },
    distanceOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: palette.gray100,
    },
    distanceOptionActive: {
        backgroundColor: palette.green50,
    },
    distanceOptionText: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.sm,
        color: palette.gray700,
    },
    distanceOptionTextActive: {
        fontFamily: "Inter_600SemiBold",
        color: palette.green600,
    },
    userPostCard: {
        margin: spacing.lg,
        padding: spacing.md,
        backgroundColor: palette.green50,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: palette.green200,
    },
    userPostHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    userPostTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.base,
        color: palette.green700,
    },
    userPostActions: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    actionIcon: {
        padding: spacing.xs,
    },
    userPostContent: {
        gap: spacing.xs,
    },
    userPostRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    userPostText: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.sm,
        color: palette.gray700,
    },
    userPostNotes: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.sm,
        color: palette.gray600,
        marginTop: spacing.xs,
    },
    scrollView: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    emptyContainer: {
        paddingTop: spacing["7xl"],
        alignItems: "center",
        paddingHorizontal: spacing["3xl"],
    },
    emptyTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.lg,
        color: palette.gray900,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.sm,
        color: palette.gray500,
        textAlign: "center",
    },
    postCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        padding: spacing.md,
        backgroundColor: "#FFFFFF",
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: palette.gray200,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    postHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.sm,
    },
    postUserInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: spacing.md,
    },
    avatarPlaceholder: {
        backgroundColor: palette.gray200,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitials: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.base,
        color: palette.gray500,
    },
    postUserDetails: {
        flex: 1,
    },
    postUserName: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.base,
        color: palette.gray900,
    },
    postUserLocation: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.xs,
        color: palette.gray500,
        marginTop: 2,
    },
    postUserStats: {
        flexDirection: "row",
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    postUserStat: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.xs,
        color: palette.gray600,
    },
    socialRatePositive: {
        color: palette.green600,
    },
    socialRateNegative: {
        color: palette.red600,
    },
    postDistance: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.xs,
        color: palette.gray500,
    },
    postContent: {
        marginTop: spacing.sm,
        gap: spacing.xs,
    },
    postRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    postText: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.sm,
        color: palette.gray700,
    },
    postNotes: {
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.sm,
        color: palette.gray600,
        marginTop: spacing.xs,
    },
    contactButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        marginTop: spacing.md,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.lg,
        backgroundColor: palette.green50,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: palette.green200,
    },
    contactButtonText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.sm,
        color: palette.green600,
    },
    bottomSpacer: {
        height: spacing["4xl"],
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: radii.lg,
        borderTopRightRadius: radii.lg,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: palette.gray200,
    },
    modalTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.lg,
        color: palette.gray900,
    },
    modalBody: {
        padding: spacing.lg,
    },
    modalLabel: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.sm,
        color: palette.gray900,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    datePicker: {
        marginBottom: spacing.md,
    },
    dateOption: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginRight: spacing.sm,
        borderRadius: radii.md,
        backgroundColor: palette.gray100,
    },
    dateOptionActive: {
        backgroundColor: palette.green600,
    },
    dateOptionText: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.sm,
        color: palette.gray700,
    },
    dateOptionTextActive: {
        fontFamily: "Inter_600SemiBold",
        color: "#FFFFFF",
    },
    timeSlotGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    timeSlotButton: {
        flex: 1,
        minWidth: "45%",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: palette.gray100,
        alignItems: "center",
    },
    timeSlotButtonActive: {
        backgroundColor: palette.green600,
    },
    timeSlotButtonText: {
        fontFamily: "Inter_500Medium",
        fontSize: fontSize.base,
        color: palette.gray700,
    },
    timeSlotButtonTextActive: {
        fontFamily: "Inter_600SemiBold",
        color: "#FFFFFF",
    },
    modalInput: {
        borderWidth: 1,
        borderColor: palette.gray300,
        borderRadius: radii.md,
        padding: spacing.md,
        fontFamily: "Inter_400Regular",
        fontSize: fontSize.base,
        color: palette.gray900,
        marginBottom: spacing.md,
    },
    modalTextArea: {
        height: 80,
        textAlignVertical: "top",
    },
    modalSubmitButton: {
        backgroundColor: palette.green600,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        alignItems: "center",
        marginTop: spacing.md,
    },
    modalSubmitButtonText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: fontSize.base,
        color: "#FFFFFF",
    },
});
