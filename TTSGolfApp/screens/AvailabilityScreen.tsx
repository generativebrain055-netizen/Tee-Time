import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Image,
    ActivityIndicator,
    Modal,
} from "react-native";
import { ChevronRight, ChevronDown, CheckCircle, Check } from "lucide-react-native";
import { availabilityApi, type DayOfWeek, type TimeSlotType } from "../services/api/availabilityApi";
import { rosterApi } from "../services/api";
import { ScreenShell, AppBottomNav } from "../ui";
import { useAuthStore } from "../stores";

// Types
interface FriendInfo {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
}

interface DateTab {
    label: string;
    subLabel: string;
    date: Date;
    dayOfWeek: DayOfWeek;
    isToday: boolean;
    isAvailable: boolean;
}

interface TimeSlotData {
    id: TimeSlotType;
    label: string;
    friends: FriendInfo[];
}

interface FriendAvailability {
    dayOfWeek: DayOfWeek;
    timeSlot: TimeSlotType;
}

const DAY_MAP: Record<number, DayOfWeek> = {
    0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

const TIME_SLOTS: { id: TimeSlotType; label: string }[] = [
    { id: 'morning', label: 'Morning (7-9)' },
    { id: 'late_morning', label: 'Late morning (9-12)' },
    { id: 'afternoon', label: 'Afternoon (12-3)' },
    { id: 'late_afternoon', label: 'Late afternoon (3-5)' },
    { id: 'evening', label: 'Evening (5-8)' },
];

// Date pill component
const DatePill = memo(({ 
    tab, 
    isSelected, 
    onPress 
}: { 
    tab: DateTab; 
    isSelected: boolean;
    onPress: () => void;
}) => (
    <View style={{ marginRight: 12, position: 'relative' }}>
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                width: 110,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: (tab.isAvailable || isSelected) ? '#22C55E' : '#D1D5DB',
                backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 15,
                color: '#111827',
                marginBottom: 2,
            }}>
                {tab.label}
            </Text>
            <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                color: '#6B7280',
            }}>
                {tab.subLabel}
            </Text>
        </TouchableOpacity>
        {tab.isAvailable && (
            <View style={{
                position: 'absolute',
                bottom: -5,
                left: '50%',
                transform: [{ translateX: -30 }],
                backgroundColor: '#22C55E',
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 10,
                zIndex: 10,
            }}>
                <Text style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 9,
                    color: '#FFFFFF',
                }}>
                    Available
                </Text>
            </View>
        )}
    </View>
));

// Build date tabs for the next 4 days
function buildDateTabs(): DateTab[] {
    const tabs: DateTab[] = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dow = d.getDay();
        const isToday = i === 0;

        tabs.push({
            label: isToday ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[dow],
            subLabel: `${d.getDate()} ${monthNames[d.getMonth()]}`,
            date: d,
            dayOfWeek: DAY_MAP[dow],
            isToday,
            isAvailable: false,
        });
    }
    return tabs;
}

// Time slot row component
const TimeSlotRow = memo(({ 
    slot, 
    isExpanded, 
    onToggle,
    onPress,
}: { 
    slot: TimeSlotData; 
    isExpanded: boolean;
    onToggle: () => void;
    onPress: () => void;
}) => {
    if (slot.friends.length === 0) return null;

    const visibleAvatars = slot.friends.slice(0, 5);
    const remainingCount = slot.friends.length - visibleAvatars.length;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="py-4 px-4 border-b border-border-light bg-white"
        >
            <View className="flex-row items-center justify-between mb-3">
                <Text className="font-sans text-base text-text-secondary">
                    {slot.label}: <Text className="font-sans-bold text-text-primary">{slot.friends.length} {slot.friends.length === 1 ? 'friend' : 'friends'} available</Text>
                </Text>
                <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
            </View>
            <View className="flex-row items-center">
                {visibleAvatars.map((friend, index) => (
                    <View
                        key={friend.id}
                        className={`w-[52px] h-[52px] rounded-full overflow-hidden items-center justify-center border-2 border-white ${
                            friend.avatar ? '' : 'bg-primary'
                        } ${index < visibleAvatars.length - 1 || remainingCount > 0 ? '-mr-2' : ''}`}
                        style={{ borderRadius: 26 }}
                    >
                        {friend.avatar ? (
                            <Image
                                source={{ uri: friend.avatar }}
                                className="w-[52px] h-[52px]"
                                style={{ borderRadius: 26 }}
                            />
                        ) : (
                            <Text className="font-sans-semibold text-base text-white">
                                {`${friend.firstName?.[0] || ''}${friend.lastName?.[0] || ''}`}
                            </Text>
                        )}
                    </View>
                ))}
                {remainingCount > 0 && (
                    <View
                        className="w-[52px] h-[52px] rounded-full bg-bg-muted items-center justify-center border-2 border-white -ml-2 z-10"
                    >
                        <Text className="font-sans-bold text-base text-text-secondary">
                            +{remainingCount}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

function AvailabilityScreen({ navigation }: any) {
    const currentUserId = useAuthStore((s) => s.user?.id);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dateTabs, setDateTabs] = useState<DateTab[]>(() => buildDateTabs());
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);
    const [expandedSlots, setExpandedSlots] = useState<Set<TimeSlotType>>(new Set());
    const [timeSlots, setTimeSlots] = useState<TimeSlotData[]>([]);
    const [needsUpdate, setNeedsUpdate] = useState(false);
    const [userAvailability, setUserAvailability] = useState<{ dayOfWeek: DayOfWeek; timeSlot: TimeSlotType }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'roster' | 'onDeck' | 'groups'>('roster');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlotData | null>(null);
    const isMountedRef = React.useRef(true);

    const selectedTab = useMemo(() => dateTabs[selectedTabIndex], [dateTabs, selectedTabIndex]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const toggleSlot = useCallback((slotId: TimeSlotType) => {
        setExpandedSlots(prev => {
            const next = new Set(prev);
            if (next.has(slotId)) {
                next.delete(slotId);
            } else {
                next.add(slotId);
            }
            return next;
        });
    }, []);

    const fetchData = useCallback(async () => {
        const currentTab = dateTabs[selectedTabIndex];
        if (!currentTab) return;
        
        if (!isMountedRef.current) return;
        setLoading(true);
        setError(null);
        
        try {
            // 1. Fetch user's own availability
            const userAvailResponse = await availabilityApi.getUserAvailability();
            
            if (!isMountedRef.current) return;
            
            if (userAvailResponse.success && userAvailResponse.data) {
                const userSlots = userAvailResponse.data.map(slot => ({
                    dayOfWeek: slot.day_of_week,
                    timeSlot: slot.time_slot,
                }));
                setUserAvailability(userSlots);
                
                // Check if user has availability set for any day
                setNeedsUpdate(userSlots.length === 0);
                
                // Update date tabs with user's availability
                setDateTabs(prev => prev.map(tab => ({
                    ...tab,
                    isAvailable: userSlots.some(s => s.dayOfWeek === tab.dayOfWeek),
                })));
            } else {
                setNeedsUpdate(true);
            }

            // 2. Fetch list based on filter (Roster, On Deck, or Groups)
            let friendsList: any[] = [];
            const selfId = currentUserId?.trim() || "";
            if (filterType === 'roster') {
                const rosterResponse = await rosterApi.getRoster();
                if (rosterResponse.success && rosterResponse.roster) {
                    friendsList = rosterResponse.roster
                        .filter(
                            (member: any) =>
                                !member.isOnDeck &&
                                member.contact?.userId &&
                                (!selfId || String(member.contact.userId) !== selfId),
                        )
                        .map((member: any) => ({
                            id: member.contact.userId,
                            firstName: member.contact.name?.split(' ')[0] || '',
                            lastName: member.contact.name?.split(' ')[1] || '',
                            avatar: member.contact.avatar,
                        }));
                }
            } else if (filterType === 'onDeck') {
                const onDeckResponse = await rosterApi.getOnDeck();
                if (onDeckResponse.success && onDeckResponse.onDeck) {
                    friendsList = onDeckResponse.onDeck
                        .filter(
                            (member: any) =>
                                member.contact?.userId &&
                                (!selfId || String(member.contact.userId) !== selfId),
                        )
                        .map((member: any) => ({
                            id: member.contact.userId,
                            firstName: member.contact.name?.split(' ')[0] || '',
                            lastName: member.contact.name?.split(' ')[1] || '',
                            avatar: member.contact.avatar,
                        }));
                }
            } else if (filterType === 'groups') {
                const groupsResponse = await rosterApi.getGroups();
                if (groupsResponse.success && groupsResponse.groups) {
                    // Get all members from all groups
                    const allGroupMembers: any[] = [];
                    for (const group of groupsResponse.groups) {
                        const membersResponse = await rosterApi.getGroupMembers(group.id);
                        if (membersResponse.success && membersResponse.members) {
                            allGroupMembers.push(...membersResponse.members);
                        }
                    }
                    friendsList = allGroupMembers
                        .filter(
                            (member: any) =>
                                member.contact?.userId &&
                                (!selfId || String(member.contact.userId) !== selfId),
                        )
                        .map((member: any) => ({
                            id: member.contact.userId,
                            firstName: member.contact.name?.split(' ')[0] || '',
                            lastName: member.contact.name?.split(' ')[1] || '',
                            avatar: member.contact.avatar,
                        }))
                        // Remove duplicates
                        .filter((member, index, self) => 
                            index === self.findIndex((m) => m.id === member.id)
                        );
                }
            }
            
            if (!isMountedRef.current) return;
            
            if (friendsList.length === 0) {
                setTimeSlots(TIME_SLOTS.map(slot => ({ ...slot, friends: [] })));
                setLoading(false);
                return;
            }

            const friendIds = friendsList.map((f: any) => f.id);

            // 3. Fetch friends' availability
            const friendsAvailResponse = await availabilityApi.getMultipleUsersAvailability(friendIds);
            
            if (!isMountedRef.current) return;
            
            if (!friendsAvailResponse.success || !friendsAvailResponse.data) {
                setTimeSlots(TIME_SLOTS.map(slot => ({ ...slot, friends: [] })));
                setLoading(false);
                return;
            }

            const friendsAvailabilityMap: Record<string, FriendAvailability[]> = friendsAvailResponse.data;

            // 4. Filter friends by selected day and group by time slot
            const slotsData: TimeSlotData[] = TIME_SLOTS.map(slot => {
                const availableFriends: FriendInfo[] = [];

                friendsList.forEach((friend: any) => {
                    const friendAvail = friendsAvailabilityMap[friend.id] || [];
                    
                    const isAvailable = friendAvail.some(
                        (avail: FriendAvailability) =>
                            avail.dayOfWeek === currentTab.dayOfWeek &&
                            avail.timeSlot === slot.id
                    );

                    if (isAvailable) {
                        availableFriends.push({
                            id: friend.id,
                            firstName: friend.firstName,
                            lastName: friend.lastName,
                            avatar: friend.avatar,
                        });
                    }
                });

                return {
                    ...slot,
                    friends: availableFriends,
                };
            });
            
            if (!isMountedRef.current) return;
            setTimeSlots(slotsData);
        } catch (error: any) {
            if (!isMountedRef.current) return;
            setError(error.message || 'Failed to load availability data');
            setTimeSlots([]);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [selectedTabIndex, filterType, currentUserId]); // Only depend on primitives, not dateTabs object

    useEffect(() => {
        if (dateTabs[selectedTabIndex] && isMountedRef.current) {
            fetchData();
        }
    }, [selectedTabIndex, filterType, fetchData]); // fetchData recreates when dependencies change

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchData();
        } finally {
            setRefreshing(false);
        }
    }, [fetchData]);

    const totalPlayers = useMemo(() => {
        return timeSlots.reduce((sum, slot) => sum + slot.friends.length, 0);
    }, [timeSlots]);

    const handleConfirmAvailability = useCallback(() => {
        navigation.navigate('EditAvailability');
    }, [navigation]);

    const getFilterLabel = () => {
        switch (filterType) {
            case 'roster': return 'Roster';
            case 'onDeck': return 'On Deck';
            case 'groups': return 'Groups';
            default: return 'Roster';
        }
    };

    const handleFilterSelect = (filter: 'roster' | 'onDeck' | 'groups') => {
        setFilterType(filter);
        setShowFilterModal(false);
    };

    const handleTimeSlotPress = useCallback((slot: TimeSlotData) => {
        setSelectedSlot(slot);
        setShowConfirmModal(true);
    }, []);

    const handleConfirmTeeTime = useCallback(() => {
        if (selectedSlot) {
            const currentTab = dateTabs[selectedTabIndex];
            navigation.navigate('CreateTeeTime', {
                prefilledDate: currentTab.date,
                prefilledTimeSlot: selectedSlot.id,
                availableFriends: selectedSlot.friends,
            });
            setShowConfirmModal(false);
            setSelectedSlot(null);
        }
    }, [selectedSlot, navigation, dateTabs, selectedTabIndex]);

    return (
        <ScreenShell>
            <View style={{
                backgroundColor: '#FFFFFF',
                paddingVertical: 12,
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: '#E0E0E0',
            }}>
                <Text style={{
                    fontFamily: 'Inter_700Bold',
                    fontSize: 18,
                    color: '#000000',
                }}>
                    Availability
                </Text>
            </View>

            <ScrollView
                style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5CB85C" />
                }
            >
                {/* Up to Date Banner - Show when user HAS availability */}
                {!needsUpdate && userAvailability.length > 0 && (
                    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                        <View style={{
                            backgroundColor: '#F9FAFB',
                            borderRadius: 12,
                            padding: 20,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                        }}>
                            <View style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                marginBottom: 16,
                            }}>
                                <View style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    borderWidth: 2,
                                    borderColor: '#111827',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12,
                                }}>
                                    <CheckCircle size={16} color="#111827" strokeWidth={3} />
                                </View>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#111827',
                                    flex: 1,
                                }}>
                                    Your availability is up to date!
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 8,
                                    height: 40,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: '#D1D5DB',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 2,
                                    elevation: 1,
                                }}
                                activeOpacity={0.7}
                                onPress={handleConfirmAvailability}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#111827',
                                }}>
                                    Edit availability
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Alert Card - Only show if user needs to update */}
                {needsUpdate && (
                    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                        <View style={{
                            backgroundColor: '#F3F4F6',
                            borderRadius: 12,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    borderWidth: 2,
                                    borderColor: '#6B7280',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 10,
                                }}>
                                    <Text style={{
                                        fontFamily: 'Inter_700Bold',
                                        fontSize: 14,
                                        color: '#6B7280',
                                    }}>i</Text>
                                </View>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 15,
                                    color: '#374151',
                                    flex: 1,
                                }}>
                                    Your availability needs updating
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 8,
                                    height: 44,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 2,
                                    elevation: 1,
                                }}
                                activeOpacity={0.7}
                                onPress={handleConfirmAvailability}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 15,
                                    color: '#111827',
                                }}>
                                    Confirm availability
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Date Pills */}
                <View style={{ marginBottom: 20, overflow: 'visible' }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 16 }}
                        style={{ overflow: 'visible' }}
                    >
                        {dateTabs.map((tab, index) => (
                            <DatePill
                                key={index}
                                tab={tab}
                                isSelected={selectedTabIndex === index}
                                onPress={() => setSelectedTabIndex(index)}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* Summary */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                }}>
                    <Text style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 15,
                        color: '#6B7280',
                    }}>
                        {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'} available
                    </Text>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: '#D1D5DB',
                            backgroundColor: '#FFFFFF',
                        }}
                        activeOpacity={0.7}
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Text style={{
                            fontFamily: 'Inter_500Medium',
                            fontSize: 14,
                            color: '#111827',
                            marginRight: 6,
                        }}>
                            {getFilterLabel()}
                        </Text>
                        <ChevronDown size={16} color="#6B7280" strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* Filter Modal */}
                <Modal
                    visible={showFilterModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowFilterModal(false)}
                >
                    <TouchableOpacity 
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        }}
                        activeOpacity={1}
                        onPress={() => setShowFilterModal(false)}
                    >
                        <View style={{
                            position: 'absolute',
                            top: 220,
                            right: 16,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 8,
                            minWidth: 150,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 8,
                            elevation: 5,
                            overflow: 'hidden',
                        }}>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: '#F3F4F6',
                                }}
                                onPress={() => handleFilterSelect('roster')}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 14,
                                    color: '#111827',
                                }}>
                                    Roster
                                </Text>
                                {filterType === 'roster' && (
                                    <Check size={16} color="#22C55E" strokeWidth={2.5} />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: '#F3F4F6',
                                }}
                                onPress={() => handleFilterSelect('onDeck')}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 14,
                                    color: '#111827',
                                }}>
                                    On Deck
                                </Text>
                                {filterType === 'onDeck' && (
                                    <Check size={16} color="#22C55E" strokeWidth={2.5} />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                }}
                                onPress={() => handleFilterSelect('groups')}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 14,
                                    color: '#111827',
                                }}>
                                    Groups
                                </Text>
                                {filterType === 'groups' && (
                                    <Check size={16} color="#22C55E" strokeWidth={2.5} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Time Slots */}
                {loading ? (
                    <View style={{ 
                        paddingVertical: 60,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <ActivityIndicator size="large" color="#5CB85C" />
                    </View>
                ) : timeSlots.filter(s => s.friends.length > 0).length === 0 ? (
                    <View style={{ 
                        padding: 40, 
                        alignItems: 'center',
                    }}>
                        <Text style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 16,
                            color: '#666666',
                            textAlign: 'center',
                            marginBottom: 8,
                        }}>
                            No friends available {selectedTab?.isToday ? 'today' : 'on this day'}
                        </Text>
                        <Text style={{
                            fontFamily: 'Inter_400Regular',
                            fontSize: 14,
                            color: '#999999',
                            textAlign: 'center',
                        }}>
                            Check other days or invite more friends!
                        </Text>
                    </View>
                ) : (
                    <View>
                        {timeSlots.map((slot) => (
                            <TimeSlotRow
                                key={slot.id}
                                slot={slot}
                                isExpanded={expandedSlots.has(slot.id)}
                                onToggle={() => toggleSlot(slot.id)}
                                onPress={() => handleTimeSlotPress(slot)}
                            />
                        ))}
                    </View>
                )}
                
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        justifyContent: 'flex-end',
                    }}
                    activeOpacity={1}
                    onPress={() => {
                        setShowConfirmModal(false);
                        setSelectedSlot(null);
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#FFFFFF',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            paddingTop: 24,
                            paddingBottom: 40,
                            paddingHorizontal: 20,
                        }}
                    >
                        {/* Header */}
                        <View style={{
                            alignItems: 'center',
                            marginBottom: 24,
                        }}>
                            <View style={{
                                width: 40,
                                height: 4,
                                backgroundColor: '#E5E7EB',
                                borderRadius: 2,
                                marginBottom: 20,
                            }} />
                            <Text style={{
                                fontFamily: 'Inter_700Bold',
                                fontSize: 20,
                                color: '#111827',
                                marginBottom: 8,
                            }}>
                                Create Tee Time
                            </Text>
                            <Text style={{
                                fontFamily: 'Inter_400Regular',
                                fontSize: 14,
                                color: '#6B7280',
                                textAlign: 'center',
                            }}>
                                {selectedSlot && `${selectedSlot.friends.length} ${selectedSlot.friends.length === 1 ? 'friend is' : 'friends are'} available`}
                            </Text>
                        </View>

                        {/* Time Slot Info */}
                        {selectedSlot && (
                            <View style={{
                                backgroundColor: '#F9FAFB',
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 24,
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#111827',
                                    marginBottom: 8,
                                }}>
                                    {selectedSlot.label}
                                </Text>
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 14,
                                    color: '#6B7280',
                                }}>
                                    {dateTabs[selectedTabIndex]?.label}, {dateTabs[selectedTabIndex]?.subLabel}
                                </Text>
                            </View>
                        )}

                        {/* Actions */}
                        <View style={{
                            flexDirection: 'row',
                            gap: 12,
                        }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 16,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: '#E5E7EB',
                                    backgroundColor: '#FFFFFF',
                                    alignItems: 'center',
                                }}
                                onPress={() => {
                                    setShowConfirmModal(false);
                                    setSelectedSlot(null);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#6B7280',
                                }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 16,
                                    borderRadius: 12,
                                    backgroundColor: '#22C55E',
                                    alignItems: 'center',
                                }}
                                onPress={handleConfirmTeeTime}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#FFFFFF',
                                }}>
                                    Continue
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <AppBottomNav activeTab="Availability" navigation={navigation} />
        </ScreenShell>
    );
}

export default memo(AvailabilityScreen);
