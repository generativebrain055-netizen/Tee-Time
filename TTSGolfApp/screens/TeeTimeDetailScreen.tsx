/**
 * TeeTime Detail Screen - Pixel Perfect iOS Design
 * Shows tee time details, participant list, and status
 */
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
} from "react-native";
import { ChevronLeft, Calendar, MapPin, Users, Clock, ChevronDown, ChevronRight, X, LogOut, AlertCircle, SkipForward, MessageCircle, ClipboardCheck } from "lucide-react-native";
import { teeTimeApi, attendanceApi } from "../services/api";
import { ScreenShell } from "../ui";
import { ConfirmModal, useToast } from "../ui/feedback";
import { Alert } from "react-native";
import { useAuthStore } from "../stores";
import { useUser } from "../contexts/UserContext";
import { logger } from "../utils/logger";
import { formatRemainingClock } from "../utils/formatting";

// Import tick and cross assets
const TickIcon = require('../assets/Tick.png');
const CrossIcon = require('../assets/Cross.png');

interface Participant {
    id: string;
    userId?: string;
    name: string;
    avatar?: string;
    status: 'accepted' | 'declined' | 'pending' | 'queued' | 'invited' | 'expired';
    isCreator: boolean;
    expiresAt?: string;
    inviteId?: string; // For skip functionality
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
    inviteType?: 'roster' | 'fcfs' | 'manual' | 'open';
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed';
    participants: Participant[];
    invites: Invite[];
    acceptedCount: number;
    slotsOpen: number;
    creator?: {
        id: string;
        firstName?: string;
        lastName?: string;
        avatar?: string;
    };
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

/**
 * Check if we're in the check-in window (Figma 437-321).
 * Backend: 30 minutes before tee time to 60 minutes after, on the day of the tee time.
 */
function isInCheckInWindow(teeDateStr: string, teeTimeStr: string): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = teeDateStr.split(/[-/]/).map(Number);
    const teeDate = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (today.getTime() !== teeDate.getTime()) return false;

    const [teeH = 0, teeM = 0, teeS = 0] = teeTimeStr.split(':').map(Number);
    const teeMinutes = teeH * 60 + teeM + teeS / 60;
    const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const minutesUntilTeeTime = teeMinutes - currentMinutes;

    if (minutesUntilTeeTime > 30) return false;
    if (minutesUntilTeeTime < -60) return false;
    return true;
}

const ParticipantRow = memo(({ participant, showTimeLeft, calculateTimeLeft, isInAwaitingGroup, onSkip, canSkip }: { 
    participant: Participant; 
    showTimeLeft?: boolean;
    calculateTimeLeft?: (expiresAt: string) => string | null;
    isInAwaitingGroup?: boolean;
    onSkip?: (inviteId: string) => void;
    canSkip?: boolean;
}) => {
    const getStatusConfig = () => {
        // Check if expired (by status or by time)
        const isExpiredByTime = participant.expiresAt && calculateTimeLeft && !calculateTimeLeft(participant.expiresAt);
        const isExpired = participant.status === 'expired' || (isExpiredByTime && participant.status === 'pending');
        
        if (isExpired) {
            return { color: 'text-gray-400', text: 'Expired', showBadge: true, badgeIcon: 'timeout', showArrow: false };
        }
        
        switch (participant.status) {
            case 'accepted':
                return { color: 'text-gray-600', text: 'Accepted', showBadge: true, badgeIcon: 'check', showArrow: false };
            case 'declined':
                return { color: 'text-gray-600', text: 'Declined', showBadge: true, badgeIcon: 'decline', showArrow: false };
            case 'pending':
                return { color: 'text-gray-600', text: 'Awaiting response', showBadge: false, badgeIcon: null, showArrow: true };
            case 'queued':
            case 'invited':
                return { color: 'text-gray-400', text: 'Invited', showBadge: false, badgeIcon: null, showArrow: true };
            case 'expired':
                return { color: 'text-gray-400', text: 'Expired', showBadge: true, badgeIcon: 'timeout', showArrow: false };
            default:
                return { color: 'text-gray-600', text: 'Invited', showBadge: false, badgeIcon: null, showArrow: true };
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
                    <View className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${
                        statusConfig.badgeIcon === 'check' ? 'bg-primary' : 
                        statusConfig.badgeIcon === 'decline' ? 'bg-error' : 
                        statusConfig.badgeIcon === 'timeout' ? 'bg-gray-400' : 'bg-primary'
                    } items-center justify-center border-2 border-white`}>
                        {statusConfig.badgeIcon === 'timeout' ? (
                            <AlertCircle size={12} color="#FFFFFF" strokeWidth={2.5} />
                        ) : (
                            <Text className="text-white font-jakarta-bold text-xs">
                                {statusConfig.badgeIcon === 'check' ? '✓' : '✕'}
                            </Text>
                        )}
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
            
            {/* Skip Button - Only show for pending invites if organizer can skip */}
            {canSkip && participant.status === 'pending' && participant.inviteId && onSkip && (
                <TouchableOpacity
                    className="ml-3 flex-row items-center px-3 py-2 rounded-md"
                    style={{ backgroundColor: '#F3F4F6' }}
                    onPress={() => onSkip(participant.inviteId!)}
                    activeOpacity={0.7}
                >
                    <SkipForward size={16} color="#6B7280" strokeWidth={2} />
                    <Text className="font-jakarta-semibold text-sm text-gray-700 ml-1.5">
                        Skip
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
});

function TeeTimeDetailScreen({ navigation, route }: any) {
    const { teeTimeId } = route.params || {};
    const currentUserId = useAuthStore((s) => s.user?.id);
    const { fetchProfile } = useUser();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [teeTime, setTeeTime] = useState<TeeTimeDetail | null>(null);
    const [showBackupDeclined, setShowBackupDeclined] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const hasNavigatedToCheckIn = useRef(false);

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
        
        return formatRemainingClock(diff, true);
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
                        
                        // Check if invite is expired (either by status or by time)
                        const isExpiredByTime = invite.expiresAt && new Date(invite.expiresAt) < new Date();
                        const isExpired = invite.status === 'expired' || isExpiredByTime;
                        
                        allParticipants.push({
                            id: invite.id,
                            userId: invite.invitee?.userId,
                            name: invite.invitee?.name || 'Unknown',
                            avatar: invite.invitee?.avatar,
                            status: invite.status === 'accepted' ? 'accepted' : 
                                   invite.status === 'declined' ? 'declined' :
                                   isExpired ? 'expired' : 'pending',
                            isCreator: false,
                            expiresAt: invite.expiresAt,
                            inviteId: invite.id, // Store invite ID for skip functionality
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
                    inviteType: data.inviteType,
                    status: data.status,
                    participants: allParticipants,
                    invites: data.invites || [],
                    acceptedCount,
                    slotsOpen,
                    creator: data.creator,
                });
            }
        } catch (error) {
            logger.error('[TeeTimeDetailScreen] Error loading tee time', error);
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

    // Handle skip invite (advance to next roster member)
    const handleSkipInvite = useCallback(async (inviteId: string) => {
        if (!teeTimeId || !inviteId) return;
        
        try {
            const response = await teeTimeApi.skipInvite(teeTimeId, inviteId);
            if (response.success) {
                Alert.alert("Invite Skipped", "Advanced to next roster member.");
                // Refresh tee time details to show updated status
                fetchTeeTimeDetails();
            } else {
                Alert.alert("Error", "Failed to skip invite. Please try again.");
            }
        } catch (error: any) {
            logger.error('[TeeTimeDetailScreen] Skip invite error', error);
            Alert.alert("Error", error.message || "Failed to skip invite.");
        }
    }, [teeTimeId, fetchTeeTimeDetails]);

    // Check if current user is the organizer
    const isOrganizer = useMemo(() => {
        if (!teeTime || !currentUserId) return false;
        if (teeTime.creator?.id === currentUserId) return true;
        const creator = teeTime.participants.find(p => p.isCreator);
        return creator?.userId === currentUserId;
    }, [teeTime, currentUserId]);

    // Check if we're in the check-in window (tee time is "now") — Figma 437-321
    const inCheckInWindow = useMemo(() => {
        if (!teeTime?.teeDate || !teeTime?.teeTime) return false;
        return isInCheckInWindow(teeTime.teeDate, teeTime.teeTime);
    }, [teeTime]);

    // When tee time is now and user is organizer, show Check-In screen (Figma 437-321)
    useEffect(() => {
        if (!teeTime || !isOrganizer || !inCheckInWindow || hasNavigatedToCheckIn.current) return;
        hasNavigatedToCheckIn.current = true;
        navigation?.navigate("CheckIn", {
            teeTimeId: teeTime.id,
            courseName: teeTime.courseName,
        });
    }, [teeTime, isOrganizer, inCheckInWindow, navigation]);

    // Check if current user is a participant
    const isParticipant = useMemo(() => {
        if (!teeTime || !currentUserId) return false;
        return teeTime.participants.some(p => p.userId === currentUserId && p.status === 'accepted');
    }, [teeTime, currentUserId]);

    // Handle leave tee time (cancel participation)
    const handleLeaveTeeTime = useCallback(async () => {
        if (!teeTimeId) return;
        setIsLeaving(true);
        try {
            const response = await attendanceApi.cancelParticipation(teeTimeId);
            if (response.success) {
                const delta = response.socialRateDelta;
                const newScore = response.newSocialRate;
                if (delta != null && delta !== 0 && typeof fetchProfile === "function") {
                    await fetchProfile(true);
                    const sign = delta > 0 ? "+" : "";
                    const msg = newScore != null ? `${sign}${delta} Social Rate (${newScore})` : `${sign}${delta} Social Rate`;
                    toast?.show({ message: msg, type: "info" });
                }
                Alert.alert(
                    "Left Tee Time",
                    response.penaltyApplied 
                        ? `${response.message}\n\nA Social Rate penalty was applied.`
                        : response.message || "You've left this tee time.",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setShowLeaveModal(false);
                                navigation?.goBack();
                            },
                        },
                    ]
                );
            }
        } catch (error: any) {
            Alert.alert("Error", error?.message || "Failed to leave tee time. Please try again.");
        } finally {
            setIsLeaving(false);
        }
    }, [teeTimeId, navigation]);

    // Handle cancel tee time (organizer only)
    const handleCancelTeeTime = useCallback(async () => {
        if (!teeTimeId) return;
        setIsCancelling(true);
        try {
            const response = await teeTimeApi.cancelTeeTime(teeTimeId);
            if (response.success) {
                Alert.alert(
                    "Tee Time Cancelled",
                    "This tee time has been cancelled and all participants have been notified.",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setShowCancelModal(false);
                                navigation?.goBack();
                            },
                        },
                    ]
                );
            }
        } catch (error: any) {
            Alert.alert("Error", error?.message || "Failed to cancel tee time. Please try again.");
        } finally {
            setIsCancelling(false);
        }
    }, [teeTimeId, navigation]);

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
    const expiredParticipants = teeTime.participants.filter(p => p.status === 'expired');
    const invitedParticipants = teeTime.participants.filter(p => p.status === 'queued' || p.status === 'invited');
    const backupDeclined = [...declinedParticipants, ...expiredParticipants];

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
                {teeTime.status === 'confirmed' && (
                    <TouchableOpacity 
                        onPress={() => navigation?.navigate("ChatDetail", { chatInfo: { teeTimeId: teeTimeId } })} 
                        className="p-1 -mr-1" 
                        activeOpacity={0.7}
                    >
                        <MessageCircle size={24} color="#5EBC68" strokeWidth={2} />
                    </TouchableOpacity>
                )}
                {teeTime.status !== 'confirmed' && <View className="w-8" />}
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
                    <View className="flex-row items-start mb-6">
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

                    {/* Invite Type */}
                    {teeTime.inviteType && (
                        <View className="flex-row items-start">
                            <View className="mr-3.5 mt-0.5">
                                <Users size={22} color="#6B7280" strokeWidth={2} />
                            </View>
                            <View className="flex-1">
                                <Text className="font-jakarta-extrabold text-lg text-gray-900 mb-1.5 leading-6">
                                    Invite Type
                                </Text>
                                <Text className="font-jakarta-semibold text-base text-gray-600 leading-5 capitalize">
                                    {teeTime.inviteType === 'fcfs' ? 'First Come First Served' : 
                                     teeTime.inviteType === 'roster' ? 'Roster' :
                                     teeTime.inviteType === 'open' ? 'Open Invite' :
                                     teeTime.inviteType === 'manual' ? 'Manual' : teeTime.inviteType}
                                </Text>
                            </View>
                        </View>
                    )}
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
                        <ParticipantRow 
                            key={p.id} 
                            participant={p} 
                            showTimeLeft 
                            calculateTimeLeft={calculateTimeLeft} 
                            isInAwaitingGroup={true}
                            onSkip={handleSkipInvite}
                            canSkip={isOrganizer}
                        />
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

                {/* Action Buttons */}
                {(isOrganizer || isParticipant) && (
                    <>
                        <View className="h-2.5 bg-gray-50" />
                        <View className="bg-white px-6 py-5">
                            {isOrganizer && inCheckInWindow && (
                                <TouchableOpacity
                                    className="flex-row items-center justify-center py-4 px-6 rounded-lg mb-3"
                                    style={{ backgroundColor: '#16A34A', borderWidth: 0 }}
                                    onPress={() => navigation?.navigate("CheckIn", { teeTimeId, courseName: teeTime.courseName })}
                                    activeOpacity={0.7}
                                >
                                    <ClipboardCheck size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text className="font-jakarta-semibold text-base text-white">
                                        Check-In
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {isOrganizer && (
                                <TouchableOpacity
                                    className="flex-row items-center justify-center py-4 px-6 rounded-lg mb-3"
                                    style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' }}
                                    onPress={() => setShowCancelModal(true)}
                                    activeOpacity={0.7}
                                >
                                    <X size={20} color="#DC2626" style={{ marginRight: 8 }} />
                                    <Text className="font-jakarta-semibold text-base" style={{ color: '#DC2626' }}>
                                        Cancel Tee Time
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {isParticipant && !isOrganizer && (
                                <TouchableOpacity
                                    className="flex-row items-center justify-center py-4 px-6 rounded-lg"
                                    style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' }}
                                    onPress={() => setShowLeaveModal(true)}
                                    activeOpacity={0.7}
                                    disabled={isLeaving}
                                >
                                    <LogOut size={20} color="#DC2626" style={{ marginRight: 8 }} />
                                    <Text className="font-jakarta-semibold text-base" style={{ color: '#DC2626' }}>
                                        {isLeaving ? "Leaving..." : "Leave Tee Time"}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}

                <View className="h-24" />
            </ScrollView>

            {/* Leave Tee Time Modal */}
            <ConfirmModal
                visible={showLeaveModal}
                title="Leave tee time?"
                message={teeTime.status === "confirmed" 
                    ? `You will lose 10 points if you cancel your Tee Time now. Confirm cancellation?`
                    : "You will be removed from this tee time and your spot will be available to others."}
                confirmText={isLeaving ? "Leaving..." : "Yes"}
                cancelText="No"
                confirmColor="#DC2626"
                onConfirm={handleLeaveTeeTime}
                onCancel={() => setShowLeaveModal(false)}
                disabled={isLeaving}
            />

            {/* Cancel Tee Time Modal */}
            <ConfirmModal
                visible={showCancelModal}
                title="Cancel tee time?"
                message="This will cancel the entire tee time and notify all participants. This action cannot be undone."
                confirmText={isCancelling ? "Cancelling..." : "Cancel Tee Time"}
                cancelText="Keep Tee Time"
                confirmColor="#DC2626"
                onConfirm={handleCancelTeeTime}
                onCancel={() => setShowCancelModal(false)}
                disabled={isCancelling}
            />
        </ScreenShell>
    );
}

export default memo(TeeTimeDetailScreen);
