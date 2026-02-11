/**
 * TeeTime Detail Screen - Pixel Perfect iOS Design
 * Shows tee time details, participant list, and status
 */
import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
} from "react-native";
import { ChevronLeft, Calendar, MapPin, Users, Clock, ChevronDown, ChevronRight } from "lucide-react-native";
import { teeTimeApi } from "../services/api";
import { ScreenShell } from "../ui";
import { ConfirmModal } from "../ui/feedback";

// Import tick and cross assets
const TickIcon = require('../assets/Tick.png');
const CrossIcon = require('../assets/Cross.png');

interface Participant {
    id: string;
    userId?: string;
    name: string;
    avatar?: string;
    status: 'accepted' | 'declined' | 'pending' | 'queued' | 'invited';
    isCreator: boolean;
    expiresAt?: string;
}

interface Invite {
    id: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    invitee: {
        userId?: string;
        phone?: string;
        name: string;
        avatar?: string;
    };
    position: number;
    expiresAt?: string;
}

interface TeeTimeDetail {
    id: string;
    courseName: string;
    courseLocation: string;
    teeDate: string;
    teeTime: string;
    maxPlayers: number;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed';
    participants: Participant[];
    invites: Invite[];
    acceptedCount: number;
    slotsOpen: number;
}

const StatusBadge = memo(({ status }: { status: string }) => {
    const config = {
        pending: { bg: 'bg-warning-light', text: 'text-warning-dark', label: 'In progress', icon: '⏱' },
        confirmed: { bg: 'bg-primary', text: 'text-white', label: 'Confirmed', icon: '✓' },
        in_progress: { bg: 'bg-warning-light', text: 'text-warning-dark', label: 'In progress', icon: '⏱' },
        completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Completed', icon: '✓' },
    }[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Unknown', icon: '' };

    return (
        <View className={`${config.bg} px-3 py-1.5 rounded-full flex-row items-center gap-1`}>
            <Text className={`${config.text} font-jakarta-semibold text-xs`}>
                {config.icon}
            </Text>
            <Text className={`${config.text} font-jakarta-semibold text-xs`}>
                {config.label}
            </Text>
        </View>
    );
});

const formatTime = (timeStr: string): string => {
    // Handle HH:MM:SS or HH:MM format
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12; // Convert 0 to 12 for midnight
    
    return `${hour12}:${minutes} ${ampm}`;
};

const ParticipantRow = memo(({ participant, showTimeLeft, calculateTimeLeft, isInAwaitingGroup }: { 
    participant: Participant; 
    showTimeLeft?: boolean;
    calculateTimeLeft?: (expiresAt: string) => string | null;
    isInAwaitingGroup?: boolean;
}) => {
    const getStatusConfig = () => {
        switch (participant.status) {
            case 'accepted':
                return { color: 'text-gray-600', text: 'Accepted', showBadge: true, showArrow: false };
            case 'declined':
                return { color: 'text-gray-600', text: 'Declined', showBadge: true, showArrow: false };
            case 'pending':
                return { color: 'text-gray-600', text: 'Awaiting response', showBadge: false, showArrow: true };
            case 'queued':
            case 'invited':
                return { color: 'text-gray-400', text: 'Invited', showBadge: false, showArrow: true };
            default:
                return { color: 'text-gray-600', text: 'Invited', showBadge: false, showArrow: true };
        }
    };

    const statusConfig = getStatusConfig();
    const timeLeft = showTimeLeft && participant.expiresAt && calculateTimeLeft ? 
                     calculateTimeLeft(participant.expiresAt) : null;

    return (
        <View className={`flex-row items-center py-4 px-5 border-b border-gray-200 ${isInAwaitingGroup ? 'bg-green-50' : 'bg-white'}`}>
            {statusConfig.showArrow && (
                <View className="mr-3.5">
                    <Text className="font-jakarta-bold text-2xl text-gray-900 leading-7">
                        →
                    </Text>
                </View>
            )}
            
            {/* Avatar with Status Badge */}
            <View className="relative mr-3.5">
                {participant.avatar ? (
                    <Image 
                        source={{ uri: participant.avatar }} 
                        className="w-14 h-14 rounded-full"
                        style={{ borderRadius: 28 }}
                    />
                ) : (
                    <View className="w-14 h-14 rounded-full bg-gray-300 items-center justify-center">
                        <Text className="font-jakarta-semibold text-lg text-gray-600">
                            {participant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </Text>
                    </View>
                )}
                {statusConfig.showBadge && (
                    <View className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${participant.status === 'accepted' ? 'bg-primary' : 'bg-error'} items-center justify-center border-2 border-white`}>
                        <Text className="text-white font-jakarta-bold text-xs">
                            {participant.status === 'accepted' ? '✓' : '✕'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Name and Status */}
            <View className="flex-1">
                <Text className="font-jakarta-semibold text-lg text-gray-900 mb-1 leading-5">
                    {participant.name}{participant.isCreator ? ' (host)' : ''}
                </Text>
                <Text className={`font-jakarta text-base leading-5 ${statusConfig.color}`}>
                    {statusConfig.text}
                </Text>
            </View>

            {/* Time Left */}
            {timeLeft && (
                <View className="items-end ml-3">
                    <Text className="font-jakarta-bold text-lg text-primary leading-5">
                        {timeLeft}
                    </Text>
                    <Text className="font-jakarta text-sm text-gray-600 leading-4">
                        time left
                    </Text>
                </View>
            )}
        </View>
    );
});

function TeeTimeDetailScreen({ navigation, route }: any) {
    const { teeTimeId } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [teeTime, setTeeTime] = useState<TeeTimeDetail | null>(null);
    const [showBackupDeclined, setShowBackupDeclined] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every second for real-time countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Calculate time left in real-time
    const calculateTimeLeft = useCallback((expiresAt: string) => {
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - currentTime.getTime();
        if (diff <= 0) return null;
        
        const totalSeconds = Math.floor(diff / 1000);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        // Format as MM:SS (e.g., 09:43 or 117:38)
        return `${String(totalMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, [currentTime]);

    const fetchTeeTimeDetails = useCallback(async () => {
        if (!teeTimeId) return;
        
        try {
            const response = await teeTimeApi.getTeeTime(teeTimeId);
            if (response.success && response.teeTime) {
                const data = response.teeTime as any;
                
                // Combine participants and invites into a single list
                const allParticipants: Participant[] = [];
                const seenUserIds = new Set<string>(); // Track seen users to avoid duplicates
                
                // Add confirmed participants (those who accepted)
                if (data.participants) {
                    data.participants.forEach((p: any) => {
                        const userId = p.userId || p.id;
                        if (!seenUserIds.has(userId)) {
                            seenUserIds.add(userId);
                            allParticipants.push({
                                id: p.id,
                                userId: p.userId,
                                name: p.name,
                                avatar: p.avatar,
                                status: 'accepted',
                                isCreator: p.isCreator || false,
                            });
                        }
                    });
                }
                
                // Add invites (pending, declined, etc.) - skip if user already in participants
                if (data.invites) {
                    data.invites.forEach((invite: any) => {
                        const userId = invite.invitee?.userId || invite.id;
                        
                        // Skip if this user is already in the participants list
                        if (seenUserIds.has(userId)) {
                            return;
                        }
                        
                        seenUserIds.add(userId);
                        
                        allParticipants.push({
                            id: invite.id,
                            userId: invite.invitee?.userId,
                            name: invite.invitee?.name || 'Unknown',
                            avatar: invite.invitee?.avatar,
                            status: invite.status === 'accepted' ? 'accepted' : 
                                   invite.status === 'declined' ? 'declined' :
                                   invite.status === 'expired' ? 'queued' : 'pending',
                            isCreator: false,
                            expiresAt: invite.expiresAt,
                        });
                    });
                }
                
                const acceptedCount = allParticipants.filter(p => p.status === 'accepted').length;
                const slotsOpen = data.maxPlayers - acceptedCount;
                
                setTeeTime({
                    id: data.id,
                    courseName: data.courseName,
                    courseLocation: data.courseLocation,
                    teeDate: data.teeDate,
                    teeTime: data.teeTime,
                    maxPlayers: data.maxPlayers,
                    status: data.status,
                    participants: allParticipants,
                    invites: data.invites || [],
                    acceptedCount,
                    slotsOpen,
                });
            }
        } catch (error) {
            console.error('[TEE_TIME_DETAIL] Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teeTimeId]);

    useEffect(() => {
        fetchTeeTimeDetails();
    }, [fetchTeeTimeDetails]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchTeeTimeDetails();
    }, [fetchTeeTimeDetails]);

    if (loading) {
        return (
            <ScreenShell>
                <View className="flex-1 justify-center items-center bg-white">
                    <ActivityIndicator size="large" color="#5EBC68" />
                </View>
            </ScreenShell>
        );
    }

    if (!teeTime) {
        return (
            <ScreenShell>
                <View className="flex-1 justify-center items-center bg-white">
                    <Text className="font-jakarta-medium text-base text-gray-600">
                        Tee time not found
                    </Text>
                </View>
            </ScreenShell>
        );
    }

    const acceptedParticipants = teeTime.participants.filter(p => p.status === 'accepted');
    const pendingParticipants = teeTime.participants.filter(p => p.status === 'pending');
    const declinedParticipants = teeTime.participants.filter(p => p.status === 'declined');
    const invitedParticipants = teeTime.participants.filter(p => p.status === 'queued' || p.status === 'invited');
    const backupDeclined = [...declinedParticipants];

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[date.getDay()]}, ${date.getDate()}${date.getDate() === 1 ? 'st' : date.getDate() === 2 ? 'nd' : date.getDate() === 3 ? 'rd' : 'th'} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    return (
        <ScreenShell>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
                <TouchableOpacity onPress={() => navigation?.goBack()} className="p-1 -ml-1" activeOpacity={0.7}>
                    <ChevronLeft size={26} color="#1F2937" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text className="font-jakarta-bold text-lg text-gray-900">
                    Tee time status
                </Text>
                <View className="w-8" />
            </View>

            <ScrollView
                className="flex-1 bg-white"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5EBC68" />}
            >
                {/* Info Section */}
                <View className="bg-white px-6 py-7">
                    {/* Date & Status */}
                    <View className="flex-row items-start mb-6">
                        <View className="mr-3.5 mt-0.5">
                            <Calendar size={22} color="#6B7280" strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-jakarta-extrabold text-lg text-gray-900 mb-1.5 leading-6">
                                {formatDate(teeTime.teeDate)}
                            </Text>
                            <Text className="font-jakarta-semibold text-base text-gray-600 leading-5">
                                {formatTime(teeTime.teeTime)}
                            </Text>
                        </View>
                        <StatusBadge status={teeTime.status} />
                    </View>

                    {/* Location */}
                    <View className="flex-row items-start mb-6">
                        <View className="mr-3.5 mt-0.5">
                            <MapPin size={22} color="#6B7280" strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-jakarta-extrabold text-lg text-gray-900 mb-1.5 leading-6">
                                {teeTime.courseName}
                            </Text>
                            <Text className="font-jakarta-semibold text-base text-gray-600 leading-5">
                                {teeTime.courseLocation}
                            </Text>
                        </View>
                    </View>

                    {/* Participants Count */}
                    <View className="flex-row items-start">
                        <View className="mr-3.5 mt-0.5">
                            <Users size={22} color="#6B7280" strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-jakarta-extrabold text-lg text-gray-900 mb-1.5 leading-6">
                                Accepted - {teeTime.acceptedCount} of {teeTime.maxPlayers}
                            </Text>
                            <Text className="font-jakarta-semibold text-base text-gray-600 leading-5">
                                {teeTime.slotsOpen > 0 ? `${teeTime.slotsOpen} slot${teeTime.slotsOpen > 1 ? 's' : ''} still open` : 'All slots filled'}
                            </Text>
                            {teeTime.slotsOpen > 0 && pendingParticipants.length > 0 && (
                                <Text className="font-jakarta text-xs text-gray-400 mt-1 leading-5">
                                    (First to accept fills the open slots)
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Divider */}
                <View className="h-2.5 bg-gray-50" />

                {/* Participants List */}
                <View className="bg-white">
                    {/* Accepted participants */}
                    {acceptedParticipants.map(p => (
                        <ParticipantRow key={p.id} participant={p} calculateTimeLeft={calculateTimeLeft} />
                    ))}
                    
                    {/* Awaiting response section - grouped with green background */}
                    {pendingParticipants.length > 0 && pendingParticipants.map(p => (
                        <ParticipantRow key={p.id} participant={p} showTimeLeft calculateTimeLeft={calculateTimeLeft} isInAwaitingGroup={true} />
                    ))}
                    
                    {/* Invited participants */}
                    {invitedParticipants.map(p => (
                        <ParticipantRow key={p.id} participant={p} calculateTimeLeft={calculateTimeLeft} />
                    ))}
                </View>

                {/* Backup & Declined Section */}
                {backupDeclined.length > 0 && (
                    <>
                        <View className="h-2.5 bg-gray-50" />
                        <View className="bg-white">
                            <TouchableOpacity
                                className="flex-row items-center justify-between px-6 py-5"
                                onPress={() => setShowBackupDeclined(!showBackupDeclined)}
                                activeOpacity={0.7}
                            >
                                <Text className="font-jakarta-bold text-lg text-gray-900">
                                    Declined ({backupDeclined.length})
                                </Text>
                                <ChevronDown
                                    size={22}
                                    color="#9CA3AF"
                                    strokeWidth={2.5}
                                    style={{ transform: [{ rotate: showBackupDeclined ? '180deg' : '0deg' }] }}
                                />
                            </TouchableOpacity>
                            {showBackupDeclined && backupDeclined.map(p => (
                                <ParticipantRow key={p.id} participant={p} calculateTimeLeft={calculateTimeLeft} />
                            ))}
                        </View>
                    </>
                )}

                <View className="h-24" />
            </ScrollView>

            <ConfirmModal
                visible={showModal}
                title="Leave tee time?"
                message="You will be removed from this tee time and your spot will be available to others."
                confirmText="Leave"
                cancelText="Cancel"
                confirmColor="#DC2626"
                onConfirm={() => {
                    setShowModal(false);
                    navigation?.goBack();
                }}
                onCancel={() => setShowModal(false)}
            />
        </ScreenShell>
    );
}

export default memo(TeeTimeDetailScreen);
