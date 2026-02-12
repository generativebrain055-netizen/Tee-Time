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
} from "react-native";
import {
    Calendar,
    MapPin,
    Clock,
    Users,
    ChevronDown,
    Check,
    SlidersHorizontal,
    Search,
    X,
} from "lucide-react-native";
import { logger } from "../utils/logger";
import { ScreenShell, AppHeader } from "../ui";
import { teeTimeApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import * as Location from "expo-location";
import { GolfCourseAutocomplete } from "../components/GolfCourseAutocomplete";
import { CustomDatePicker } from "../ui/feedback";

interface OpenTeeTime {
    id: string;
    courseName: string;
    courseLocation?: string;
    teeDate: string;
    teeTime: string;
    maxPlayers: number;
    status: string;
    distanceRadius: number;
    distance?: number;
    creator: {
        id: string;
        firstName: string;
        lastName: string;
        username?: string;
        avatar?: string;
    };
    participants: Array<{
        userId: string;
        firstName: string;
        lastName: string;
        avatar?: string;
        handicap?: number;
        socialRate?: number;
    }>;
    participantCount: number;
    slotsOpen: number;
}

const DISTANCE_FILTERS = [
    { value: null, label: "All distances" },
    { value: 5, label: "Within 5 miles" },
    { value: 10, label: "Within 10 miles" },
    { value: 20, label: "Within 20 miles" },
    { value: 30, label: "Within 30 miles" },
    { value: 50, label: "Within 50 miles" },
];

const TIME_FILTERS = [
    { value: null, label: "All times" },
    { value: "morning", label: "Morning (5 AM - 12 PM)" },
    { value: "afternoon", label: "Afternoon (12 PM - 5 PM)" },
    { value: "evening", label: "Evening (5 PM - 10 PM)" },
];

export default function CommunityBoardScreen({ navigation }: any) {
    const user = useAuthStore((s) => s.user);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [openInvites, setOpenInvites] = useState<OpenTeeTime[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [maxDistance, setMaxDistance] = useState<number | null>(null);
    const [showDistanceFilter, setShowDistanceFilter] = useState(false);
    const [joining, setJoining] = useState<string | null>(null);
    
    // Additional filters
    const [filterDate, setFilterDate] = useState<string | null>(null);
    const [filterTime, setFilterTime] = useState<"morning" | "afternoon" | "evening" | null>(null);
    const [filterCourse, setFilterCourse] = useState<string>("");
    const [showTimeFilter, setShowTimeFilter] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDateForPicker, setSelectedDateForPicker] = useState<Date>(new Date());

    useEffect(() => {
        requestLocationPermission();
    }, []);

    useEffect(() => {
        if (userLocation) {
            loadOpenInvites();
        }
    }, [userLocation, loadOpenInvites]);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
                const location = await Location.getCurrentPositionAsync({});
                setUserLocation({
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                });
            } else {
                Alert.alert(
                    "Location Permission Required",
                    "Please enable location access to see Open invites near you.",
                    [{ text: "OK" }]
                );
            }
        } catch (error) {
            logger.error("[CommunityBoardScreen] Location error", error);
            Alert.alert("Error", "Failed to get location");
        }
    };

    const loadOpenInvites = useCallback(async () => {
        if (!userLocation) return;

        try {
            setLoading(true);
            const response = await teeTimeApi.getOpenInvites(
                userLocation.lat,
                userLocation.lng,
                maxDistance || undefined,
                {
                    date: filterDate || undefined,
                    time: filterTime || undefined,
                    course: filterCourse.trim() || undefined,
                }
            );

            if (response.success) {
                setOpenInvites(response.teeTimes || []);
            }
        } catch (error) {
            logger.error("[CommunityBoardScreen] Failed to load open invites", error);
            Alert.alert("Error", "Failed to load open invites");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userLocation, maxDistance, filterDate, filterTime, filterCourse]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadOpenInvites();
    }, [loadOpenInvites]);

    const handleJoin = async (teeTimeId: string) => {
        setJoining(teeTimeId);
        try {
            const response = await teeTimeApi.joinOpenInvite(teeTimeId);
            if (response.success) {
                Alert.alert("Joined!", "You've been added to this tee time.");
                await loadOpenInvites();
            }
        } catch (error: any) {
            logger.error("[CommunityBoardScreen] Join error", error);
            Alert.alert("Error", error.message || "Failed to join tee time");
        } finally {
            setJoining(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    if (loading && !userLocation) {
        return (
            <ScreenShell>
                <AppHeader title="Community Board" onBack={() => navigation?.goBack()} />
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5EBC68" />
                    <Text className="text-gray-500 mt-4">Getting your location...</Text>
                </View>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell>
            <AppHeader title="Community Board" onBack={() => navigation?.goBack()} />

            {/* Filters Section */}
            <View className="bg-white border-b border-gray-200">
                {/* Distance Filter */}
                <View className="px-5 py-3 border-b border-gray-100">
                    <TouchableOpacity
                        className="flex-row items-center justify-between"
                        onPress={() => {
                            setShowDistanceFilter(!showDistanceFilter);
                            setShowTimeFilter(false);
                        }}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center">
                            <SlidersHorizontal size={18} color="#6B7280" strokeWidth={2} />
                            <Text className="text-gray-700 font-semibold ml-2">
                                {DISTANCE_FILTERS.find(f => f.value === maxDistance)?.label || "All distances"}
                            </Text>
                        </View>
                        <ChevronDown
                            size={18}
                            color="#6B7280"
                            strokeWidth={2}
                            style={{ transform: [{ rotate: showDistanceFilter ? '180deg' : '0deg' }] }}
                        />
                    </TouchableOpacity>

                    {showDistanceFilter && (
                        <View className="mt-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                            {DISTANCE_FILTERS.map((filter) => (
                                <TouchableOpacity
                                    key={filter.value || 'all'}
                                    className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0"
                                    onPress={() => {
                                        setMaxDistance(filter.value);
                                        setShowDistanceFilter(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text className="text-gray-900 font-medium">
                                        {filter.label}
                                    </Text>
                                    {maxDistance === filter.value && (
                                        <Check size={18} color="#5EBC68" strokeWidth={2.5} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Time Filter */}
                <View className="px-5 py-3 border-b border-gray-100">
                    <TouchableOpacity
                        className="flex-row items-center justify-between"
                        onPress={() => {
                            setShowTimeFilter(!showTimeFilter);
                            setShowDistanceFilter(false);
                        }}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center">
                            <Clock size={18} color="#6B7280" strokeWidth={2} />
                            <Text className="text-gray-700 font-semibold ml-2">
                                {TIME_FILTERS.find(f => f.value === filterTime)?.label || "All times"}
                            </Text>
                        </View>
                        <ChevronDown
                            size={18}
                            color="#6B7280"
                            strokeWidth={2}
                            style={{ transform: [{ rotate: showTimeFilter ? '180deg' : '0deg' }] }}
                        />
                    </TouchableOpacity>

                    {showTimeFilter && (
                        <View className="mt-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                            {TIME_FILTERS.map((filter) => (
                                <TouchableOpacity
                                    key={filter.value || 'all'}
                                    className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0"
                                    onPress={() => {
                                        setFilterTime(filter.value as any);
                                        setShowTimeFilter(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text className="text-gray-900 font-medium">
                                        {filter.label}
                                    </Text>
                                    {filterTime === filter.value && (
                                        <Check size={18} color="#5EBC68" strokeWidth={2.5} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Date Filter */}
                <View className="px-5 py-3 border-b border-gray-100">
                    <TouchableOpacity
                        className="flex-row items-center justify-between"
                        onPress={() => {
                            if (filterDate) {
                                setFilterDate(null);
                            } else {
                                setShowDatePicker(true);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center">
                            <Calendar size={18} color="#6B7280" strokeWidth={2} />
                            <Text className="text-gray-700 font-semibold ml-2">
                                {filterDate ? new Date(filterDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Any date"}
                            </Text>
                        </View>
                        {filterDate ? (
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setFilterDate(null);
                                }}
                                className="ml-2"
                            >
                                <X size={16} color="#6B7280" strokeWidth={2} />
                            </TouchableOpacity>
                        ) : (
                            <ChevronDown size={18} color="#6B7280" strokeWidth={2} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Course Search Filter */}
                <View className="px-5 py-3">
                    <View className="flex-row items-center mb-2">
                        <Search size={18} color="#6B7280" strokeWidth={2} />
                        <Text className="text-gray-700 font-semibold ml-2">Course</Text>
                    </View>
                    <View className="flex-row items-center">
                        <View className="flex-1">
                            <GolfCourseAutocomplete
                                value={filterCourse}
                                onSelect={(course) => setFilterCourse(course.name)}
                                onChangeText={(text) => setFilterCourse(text)}
                                placeholder="Search courses..."
                            />
                        </View>
                        {filterCourse && (
                            <TouchableOpacity
                                onPress={() => setFilterCourse("")}
                                className="ml-2 p-2"
                            >
                                <X size={18} color="#6B7280" strokeWidth={2} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Date Picker Modal */}
            <CustomDatePicker
                visible={showDatePicker}
                value={selectedDateForPicker}
                onConfirm={(date) => {
                    setSelectedDateForPicker(date);
                    setFilterDate(date.toISOString().split('T')[0]);
                    setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
                minimumDate={new Date()}
                mode="date"
            />

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5EBC68" />
                </View>
            ) : openInvites.length === 0 ? (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5EBC68" />}
                >
                    <Text className="text-gray-500 text-center text-base">
                        No open invites found{maxDistance ? ` within ${maxDistance} miles` : ''}.
                    </Text>
                    <Text className="text-gray-400 text-center text-sm mt-2">
                        Check back later or create your own open invite!
                    </Text>
                </ScrollView>
            ) : (
                <ScrollView
                    className="flex-1 bg-gray-50"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5EBC68" />}
                >
                    <View className="px-5 py-4">
                        {openInvites.map((teeTime) => (
                            <TouchableOpacity
                                key={teeTime.id}
                                className="bg-white rounded-lg mb-4 p-4 shadow-sm border border-gray-200"
                                onPress={() => navigation?.navigate("TeeTimeDetail", { teeTimeId: teeTime.id })}
                                activeOpacity={0.7}
                            >
                                {/* Header */}
                                <View className="flex-row items-start justify-between mb-3">
                                    <View className="flex-1">
                                        <Text className="text-lg font-bold text-gray-900 mb-1">
                                            {teeTime.courseName}
                                        </Text>
                                        {teeTime.courseLocation && (
                                            <View className="flex-row items-center mt-1">
                                                <MapPin size={14} color="#6B7280" strokeWidth={2} />
                                                <Text className="text-sm text-gray-600 ml-1">
                                                    {teeTime.courseLocation}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {teeTime.distance !== null && teeTime.distance !== undefined && (
                                        <Text className="text-sm text-gray-500 ml-2">
                                            {teeTime.distance.toFixed(1)} mi
                                        </Text>
                                    )}
                                </View>

                                {/* Date & Time */}
                                <View className="flex-row items-center mb-3">
                                    <Calendar size={16} color="#6B7280" strokeWidth={2} />
                                    <Text className="text-sm text-gray-700 ml-2">
                                        {formatDate(teeTime.teeDate)}
                                    </Text>
                                    <Clock size={16} color="#6B7280" strokeWidth={2} className="ml-4" />
                                    <Text className="text-sm text-gray-700 ml-2">
                                        {formatTime(teeTime.teeTime)}
                                    </Text>
                                </View>

                                {/* Creator */}
                                <View className="flex-row items-center mb-3 pb-3 border-b border-gray-100">
                                    {teeTime.creator.avatar ? (
                                        <Image
                                            source={{ uri: teeTime.creator.avatar }}
                                            className="w-8 h-8 rounded-full"
                                        />
                                    ) : (
                                        <View className="w-8 h-8 rounded-full bg-green-500 items-center justify-center">
                                            <Text className="text-white text-xs font-semibold">
                                                {getInitials(teeTime.creator.firstName, teeTime.creator.lastName)}
                                            </Text>
                                        </View>
                                    )}
                                    <Text className="text-sm text-gray-700 ml-2">
                                        Hosted by {teeTime.creator.firstName} {teeTime.creator.lastName}
                                    </Text>
                                </View>

                                {/* Participants */}
                                <View className="mb-3">
                                    <View className="flex-row items-center mb-2">
                                        <Users size={16} color="#6B7280" strokeWidth={2} />
                                        <Text className="text-sm font-semibold text-gray-700 ml-2">
                                            {teeTime.participantCount} of {teeTime.maxPlayers} players
                                        </Text>
                                        {teeTime.slotsOpen > 0 && (
                                            <Text className="text-sm text-green-600 ml-2">
                                                ({teeTime.slotsOpen} spot{teeTime.slotsOpen > 1 ? 's' : ''} open)
                                            </Text>
                                        )}
                                    </View>

                                    {/* Participant Avatars with Profile Info */}
                                    {teeTime.participants.length > 0 && (
                                        <View className="mt-2">
                                            {teeTime.participants.map((participant, index) => (
                                                <TouchableOpacity
                                                    key={participant.userId}
                                                    className="flex-row items-center mb-2"
                                                    onPress={() => {
                                                        if (participant.userId) {
                                                            navigation?.navigate("FriendProfile", {
                                                                userId: participant.userId,
                                                            });
                                                        }
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    {participant.avatar ? (
                                                        <Image
                                                            source={{ uri: participant.avatar }}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                    ) : (
                                                        <View className="w-10 h-10 rounded-full bg-green-500 items-center justify-center">
                                                            <Text className="text-white text-xs font-semibold">
                                                                {getInitials(participant.firstName, participant.lastName)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View className="ml-2 flex-1">
                                                        <Text className="text-sm font-medium text-gray-900">
                                                            {participant.firstName} {participant.lastName}
                                                        </Text>
                                                        <View className="flex-row items-center mt-0.5">
                                                            {participant.handicap !== undefined && participant.handicap !== null && (
                                                                <Text className="text-xs text-gray-600">
                                                                    HCP {participant.handicap}
                                                                </Text>
                                                            )}
                                                            {participant.socialRate !== undefined && participant.socialRate !== null && (
                                                                <Text className={`text-xs ml-2 ${
                                                                    participant.socialRate >= 150 ? 'text-green-600' :
                                                                    participant.socialRate >= 100 ? 'text-gray-600' :
                                                                    'text-orange-600'
                                                                }`}>
                                                                    Social Rate: {participant.socialRate}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Join Button */}
                                {teeTime.slotsOpen > 0 && (
                                    <TouchableOpacity
                                        className="bg-green-600 rounded-lg py-3 items-center mt-2"
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            handleJoin(teeTime.id);
                                        }}
                                        disabled={joining === teeTime.id}
                                        activeOpacity={0.8}
                                    >
                                        {joining === teeTime.id ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text className="text-white font-semibold">
                                                Join Tee Time
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}
        </ScreenShell>
    );
}
