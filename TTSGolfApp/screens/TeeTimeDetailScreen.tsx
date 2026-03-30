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
import { ChevronLeft, Calendar, MapPin, Users, Clock, ChevronDown, ChevronRight, X, LogOut, AlertCircle, SkipForward, MessageCircle, ClipboardCheck, Check } from "lucide-react-native";
import { teeTimeApi, attendanceApi } from "../services/api";
import { ScreenShell } from "../ui";
import { TeeTimeConfirmSheet } from "../ui/sheets/TeeTimeConfirmSheet";
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
    status:
        | 'accepted'
        | 'declined'
        | 'pending'
        | 'queued'
        | 'invited'
        | 'expired'
        | 'cancelled'
        | 'waitlist';
    isCreator: boolean;
    expiresAt?: string;
    inviteId?: string; // For skip functionality
}

/** Match API tee time status regardless of casing / whitespace */
function normalizeTeeDetailStatus(status: string | undefined | null): string {
    return String(status ?? "")
        .toLowerCase()
        .trim();
}

interface Invite {
    id: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'waitlist';
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
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
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
    const s = String(status ?? '')
        .toLowerCase()
        .trim();

    if (s === 'confirmed') {
        return (
            <View className="bg-emerald-100 px-3 py-1.5 rounded-full flex-row items-center">
                <Check size={14} color="#15803D" strokeWidth={2.5} />
                <Text className="text-emerald-700 font-jakarta-semibold text-xs ml-1">Confirmed</Text>
            </View>
        );
    }

    if (s === "cancelled" || s === "canceled") {
        return (
            <View className="bg-red-100 px-3 py-1.5 rounded-full flex-row items-center">
                <Text className="text-red-700 font-jakarta-semibold text-xs">Cancelled</Text>
            </View>
        );
    }

    if (s === 'pending') {
        return (
            <View className="bg-amber-100 px-3 py-1.5 rounded-full flex-row items-center">
                <Text className="text-amber-800 font-jakarta-semibold text-xs">Pending</Text>
            </View>
        );
    }

    const config = {
        in_progress: { bg: 'bg-warning-light', text: 'text-warning-dark', label: 'In progress', icon: '⏱' },
        completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Completed', icon: '✓' },
    }[s] || { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Unknown', icon: '' };

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
 * Matches backend: calendar day of the tee, until 4 hours after tee time.
 */
function isInCheckInWindow(teeDateStr: string, teeTimeStr: string): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = teeDateStr.split(/[-/]/).map(Number);
    const teeDate = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (today.getTime() !== teeDate.getTime()) return false;

    const [teeH = 0, teeM = 0, teeS = 0] = teeTimeStr.split(":").map(Number);
    const teeMinutes = teeH * 60 + teeM + teeS / 60;
    const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const minutesUntilTeeTime = teeMinutes - currentMinutes;

    if (minutesUntilTeeTime < -240) return false;
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
                // Roster backups: no deadline yet — match design (white row, “Queued”, no arrow)
                if (!participant.expiresAt) {
                    return { color: 'text-gray-600', text: 'Queued', showBadge: false, badgeIcon: null, showArrow: false };
                }
                // FCFS / manual parallel pending — arrow + “Invited”
                return { color: 'text-gray-400', text: 'Invited', showBadge: false, badgeIcon: null, showArrow: true };
            case 'invited':
                return { color: 'text-gray-400', text: 'Invited', showBadge: false, badgeIcon: null, showArrow: true };
            case 'waitlist':
                return { color: 'text-gray-600', text: 'Waitlist', showBadge: false, badgeIcon: null, showArrow: true };
            case 'expired':
                return { color: 'text-gray-400', text: 'Expired', showBadge: true, badgeIcon: 'timeout', showArrow: false };
            case 'cancelled':
                return { color: 'text-gray-500', text: 'Cancelled', showBadge: true, badgeIcon: 'decline', showArrow: false };
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

/** Backup & declined — declined, expired (not active roster invitees) */
const BackupDeclinedRow = memo(
    ({
        participant,
        calculateTimeLeft,
        isOrganizer,
        onSkip,
    }: {
        participant: Participant;
        calculateTimeLeft?: (expiresAt: string) => string | null;
        isOrganizer?: boolean;
        onSkip?: (inviteId: string) => void;
    }) => {
        const isExpiredByTime =
            participant.expiresAt && calculateTimeLeft && !calculateTimeLeft(participant.expiresAt);
        const isExpiredLike =
            participant.status === 'expired' || (isExpiredByTime && participant.status === 'pending');
        const isDeclined = participant.status === 'declined';
        const label = isDeclined ? 'Declined' : isExpiredLike ? 'Expired' : 'Backup';
        const showDeclineBadge = isDeclined;

        return (
            <View className="flex-row items-center py-4 px-5 border-b border-gray-200 bg-white">
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
                                {participant.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)}
                            </Text>
                        </View>
                    )}
                    {showDeclineBadge && (
                        <View className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-error items-center justify-center border-2 border-white">
                            <Text className="text-white font-jakarta-bold text-xs">✕</Text>
                        </View>
                    )}
                </View>
                <View className="flex-1">
                    <Text className="font-jakarta-semibold text-lg text-gray-900 mb-1 leading-5">
                        {participant.name}
                        {participant.isCreator ? ' (host)' : ''}
                    </Text>
                    <Text className="font-jakarta text-base leading-5 text-gray-500">{label}</Text>
                </View>
                {isOrganizer && participant.status === 'pending' && participant.inviteId && onSkip && (
                    <TouchableOpacity
                        className="ml-3 flex-row items-center px-3 py-2 rounded-md"
                        style={{ backgroundColor: '#F3F4F6' }}
                        onPress={() => onSkip(participant.inviteId!)}
                        activeOpacity={0.7}
                    >
                        <SkipForward size={16} color="#6B7280" strokeWidth={2} />
                        <Text className="font-jakarta-semibold text-sm text-gray-700 ml-1.5">Skip</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    },
);

function TeeTimeDetailScreen({ navigation, route }: any) {
    const { teeTimeId } = route.params || {};
    const currentUserId = useAuthStore((s) => s.user?.id);
    const { fetchProfile } = useUser();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [teeTime, setTeeTime] = useState<TeeTimeDetail | null>(null);
    const [showBackupDeclined, setShowBackupDeclined] = useState(true);
    const [showConfirmSheet, setShowConfirmSheet] = useState(false);
    const [showCancelledMembers, setShowCancelledMembers] = useState(false);
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
                const seenUserIds = new Set<string>(); // Roster/participant rows only (not invite rows)
                const acceptedPlayingUserIds = new Set<string>(); // Confirmed in the group — hide redundant invite row

                // Add confirmed participants (those who accepted)
                if (data.participants) {
                    data.participants.forEach((p: any) => {
                        const uid = p.userId as string | undefined;
                        if (uid) acceptedPlayingUserIds.add(uid);
                        const dedupeKey = uid || p.id;
                        if (!seenUserIds.has(dedupeKey)) {
                            seenUserIds.add(dedupeKey);
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

                // Left after accepting (open join, etc.) — same row not in active participants
                if (data.cancelledParticipants?.length) {
                    data.cancelledParticipants.forEach((p: any) => {
                        const dedupeKey = (p.userId as string | undefined) || p.id;
                        if (!seenUserIds.has(dedupeKey)) {
                            seenUserIds.add(dedupeKey);
                            allParticipants.push({
                                id: p.id,
                                userId: p.userId,
                                name: p.name,
                                avatar: p.avatar,
                                status: 'cancelled',
                                isCreator: p.isCreator || false,
                            });
                        }
                    });
                }
                
                // Add invites — one row per invite id; skip only if invitee already listed as accepted player
                if (data.invites) {
                    const parallelInvite =
                        data.inviteType === 'fcfs' ||
                        data.inviteType === 'manual' ||
                        data.inviteType === 'open';

                    const seenInviteIds = new Set<string>();
                    data.invites.forEach((invite: any) => {
                        if (seenInviteIds.has(invite.id)) return;
                        seenInviteIds.add(invite.id);

                        const userId = invite.invitee?.userId as string | undefined;
                        if (userId && acceptedPlayingUserIds.has(userId)) {
                            return;
                        }
                        
                        // Check if invite is expired (either by status or by time)
                        const isExpiredByTime = invite.expiresAt && new Date(invite.expiresAt) < new Date();
                        const isExpired = invite.status === 'expired' || isExpiredByTime;

                        let derivedStatus: Participant['status'];
                        if (invite.status === 'cancelled') {
                            derivedStatus = 'cancelled';
                        } else if (invite.status === 'accepted') {
                            derivedStatus = 'accepted';
                        } else if (invite.status === 'declined') {
                            derivedStatus = 'declined';
                        } else if (isExpired) {
                            derivedStatus = 'expired';
                        } else if (invite.status === 'waitlist') {
                            derivedStatus = 'waitlist';
                        } else if (invite.status === 'pending') {
                            if (parallelInvite) {
                                // FCFS / manual / open: everyone notified in parallel
                                derivedStatus = 'queued';
                            } else if (data.inviteType === 'roster' && !invite.expiresAt) {
                                // Roster backup wave: row exists but not notified yet (no deadline)
                                derivedStatus = 'queued';
                            } else {
                                // Roster initial wave (or activated backup): awaiting response
                                derivedStatus = 'pending';
                            }
                        } else {
                            derivedStatus = 'pending';
                        }
                        
                        allParticipants.push({
                            id: invite.id,
                            userId: invite.invitee?.userId,
                            name: invite.invitee?.name || 'Unknown',
                            avatar: invite.invitee?.avatar,
                            status: derivedStatus,
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

    const showAllSetParam = route?.params?.showAllSet;

    useEffect(() => {
        if (!teeTime || !showAllSetParam) return;
        if (normalizeTeeDetailStatus(teeTime.status) === "confirmed") {
            setShowConfirmSheet(true);
        }
        navigation?.setParams?.({ showAllSet: false });
    }, [teeTime, showAllSetParam, navigation]);

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

    // Auto open check-in only for confirmed tee times in the check-in window
    useEffect(() => {
        if (
            !teeTime ||
            !isOrganizer ||
            normalizeTeeDetailStatus(teeTime.status) !== "confirmed" ||
            !inCheckInWindow ||
            hasNavigatedToCheckIn.current
        ) {
            return;
        }
        hasNavigatedToCheckIn.current = true;
        navigation?.navigate("CheckIn", {
            teeTimeId: teeTime.id,
            courseName: teeTime.courseName,
            teeDate: teeTime.teeDate,
            teeTime: teeTime.teeTime,
        });
    }, [teeTime, isOrganizer, inCheckInWindow, navigation]);

    // Check if current user is a participant
    const isParticipant = useMemo(() => {
        if (!teeTime || !currentUserId) return false;
        return teeTime.participants.some(p => p.userId === currentUserId && p.status === 'accepted');
    }, [teeTime, currentUserId]);

    const normalizedTeeStatus = normalizeTeeDetailStatus(teeTime?.status);

    const canShowCheckParticipantStatus = useMemo(
        () => !!teeTime && isOrganizer && normalizedTeeStatus === "confirmed",
        [isOrganizer, teeTime, normalizedTeeStatus],
    );
    const showLeaveTeeTimeButton = useMemo(
        () =>
            !!teeTime &&
            isParticipant &&
            !isOrganizer &&
            normalizedTeeStatus !== "completed" &&
            normalizedTeeStatus !== "cancelled",
        [isParticipant, isOrganizer, teeTime, normalizedTeeStatus],
    );
    const showOrganizerCancelTeeTimeCta = useMemo(
        () =>
            isOrganizer &&
            normalizedTeeStatus !== "cancelled" &&
            normalizedTeeStatus !== "canceled",
        [isOrganizer, normalizedTeeStatus],
    );

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
    const cancelledMembers = teeTime.participants.filter(p => p.status === 'cancelled');
    const pendingParticipants = teeTime.participants.filter(p => p.status === 'pending');
    const declinedParticipants = teeTime.participants.filter(p => p.status === 'declined');
    const expiredParticipants = teeTime.participants.filter(p => p.status === 'expired');
    const queuedParticipants = teeTime.participants.filter(
        p => p.status === 'queued' || p.status === 'invited' || p.status === 'waitlist'
    );
    const parallelInviteDetail =
        teeTime.inviteType === 'fcfs' ||
        teeTime.inviteType === 'manual' ||
        teeTime.inviteType === 'open';
    // Roster: awaiting (pending + deadline) and queued (backup, no deadline) render in the main list.
    // “Backup & declined” is only real backups/problems — not active roster invitees.
    const backupDeclinedList = parallelInviteDetail
        ? [...expiredParticipants, ...pendingParticipants]
        : [...declinedParticipants, ...expiredParticipants];

    const formatDate = (dateStr: string) => {
        // Parse YYYY-MM-DD as local date (not UTC) to avoid day-shift bugs.
        const parts = dateStr.split(/[-/]/).map(Number);
        const hasYmd = parts.length >= 3 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && Number.isFinite(parts[2]);
        const date = hasYmd
            ? new Date(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1)
            : new Date(dateStr);
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
                {normalizeTeeDetailStatus(teeTime.status) === "confirmed" && (
                    <TouchableOpacity 
                        onPress={() => navigation?.navigate("ChatDetail", { chatInfo: { teeTimeId: teeTimeId } })} 
                        className="p-1 -mr-1" 
                        activeOpacity={0.7}
                    >
                        <MessageCircle size={24} color="#5EBC68" strokeWidth={2} />
                    </TouchableOpacity>
                )}
                {normalizeTeeDetailStatus(teeTime.status) !== "confirmed" && <View className="w-8" />}
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
                            {teeTime.slotsOpen > 0 && queuedParticipants.length > 0 && teeTime.inviteType === 'fcfs' && (
                                <Text className="font-jakarta text-xs text-gray-400 mt-1 leading-5">
                                    (First to accept fills the open slots)
                                </Text>
                            )}
                            {teeTime.slotsOpen > 0 &&
                                (pendingParticipants.length > 0 || queuedParticipants.length > 0) &&
                                teeTime.inviteType === 'roster' && (
                                <Text className="font-jakarta text-xs text-gray-400 mt-1 leading-5">
                                    Awaiting response and queued invites are listed below.
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Invite Type — omit when confirmed to match status/detail designs */}
                    {teeTime.inviteType && normalizeTeeDetailStatus(teeTime.status) !== "confirmed" && (
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

                    {/* FCFS / parallel: declined in main flow (same row style as reference) */}
                    {parallelInviteDetail &&
                        declinedParticipants.map((p) => (
                            <ParticipantRow key={p.id} participant={p} calculateTimeLeft={calculateTimeLeft} />
                        ))}

                    {/* FCFS / parallel: still-invited members — continuous list, label “Invited” */}
                    {parallelInviteDetail &&
                        queuedParticipants.map((p) => (
                            <ParticipantRow
                                key={p.id}
                                participant={p}
                                calculateTimeLeft={calculateTimeLeft}
                                showTimeLeft={!!p.expiresAt}
                            />
                        ))}

                    {/* Roster: awaiting response (n−1 active invites) then queued backups */}
                    {!parallelInviteDetail &&
                        pendingParticipants.map((p) => (
                            <ParticipantRow
                                key={p.id}
                                participant={p}
                                calculateTimeLeft={calculateTimeLeft}
                                showTimeLeft={!!p.expiresAt}
                                isInAwaitingGroup
                                canSkip={isOrganizer}
                                onSkip={handleSkipInvite}
                            />
                        ))}
                    {!parallelInviteDetail &&
                        queuedParticipants.map((p) => (
                            <ParticipantRow
                                key={p.id}
                                participant={p}
                                calculateTimeLeft={calculateTimeLeft}
                                showTimeLeft={!!p.expiresAt}
                            />
                        ))}

                    {/* Roster-style: declined remains under Backup & declined only */}

                    {/* Left / cancelled after accepting */}
                    {cancelledMembers.length > 0 && (
                        <>
                            <TouchableOpacity
                                className="flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200"
                                onPress={() => setShowCancelledMembers(!showCancelledMembers)}
                                activeOpacity={0.7}
                            >
                                <Text className="font-jakarta-bold text-base text-gray-800">
                                    Cancelled ({cancelledMembers.length})
                                </Text>
                                <ChevronDown
                                    size={22}
                                    color="#9CA3AF"
                                    strokeWidth={2.5}
                                    style={{ transform: [{ rotate: showCancelledMembers ? '180deg' : '0deg' }] }}
                                />
                            </TouchableOpacity>
                            {showCancelledMembers &&
                                cancelledMembers.map(p => (
                                    <ParticipantRow key={p.id} participant={p} calculateTimeLeft={calculateTimeLeft} />
                                ))}
                        </>
                    )}
                </View>

                {/* Backup & declined — roster backups, expired, and declined */}
                {backupDeclinedList.length > 0 && (
                    <>
                        <View className="h-2.5 bg-gray-50" />
                        <View className="bg-white">
                            <TouchableOpacity
                                className="flex-row items-center justify-between px-6 py-5"
                                onPress={() => setShowBackupDeclined(!showBackupDeclined)}
                                activeOpacity={0.7}
                            >
                                <Text className="font-jakarta-bold text-lg text-gray-900">
                                    Backup & declined ({backupDeclinedList.length})
                                </Text>
                                <ChevronDown
                                    size={22}
                                    color="#9CA3AF"
                                    strokeWidth={2.5}
                                    style={{ transform: [{ rotate: showBackupDeclined ? '180deg' : '0deg' }] }}
                                />
                            </TouchableOpacity>
                            {showBackupDeclined &&
                                backupDeclinedList.map((p) => (
                                    <BackupDeclinedRow
                                        key={p.id}
                                        participant={p}
                                        calculateTimeLeft={calculateTimeLeft}
                                        isOrganizer={isOrganizer}
                                        onSkip={handleSkipInvite}
                                    />
                                ))}
                        </View>
                    </>
                )}

                {/* Action Buttons */}
                {(canShowCheckParticipantStatus ||
                    showOrganizerCancelTeeTimeCta ||
                    showLeaveTeeTimeButton) && (
                    <>
                        <View className="h-2.5 bg-gray-50" />
                        <View className="bg-white px-6 py-5">
                            {canShowCheckParticipantStatus && (
                                <TouchableOpacity
                                    className="flex-row items-center justify-center py-4 px-6 rounded-lg mb-3"
                                    style={{ backgroundColor: '#16A34A', borderWidth: 0 }}
                                    onPress={() =>
                                        navigation?.navigate("CheckIn", {
                                            teeTimeId,
                                            courseName: teeTime.courseName,
                                            teeDate: teeTime.teeDate,
                                            teeTime: teeTime.teeTime,
                                        })
                                    }
                                    activeOpacity={0.7}
                                >
                                    <ClipboardCheck size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text className="font-jakarta-semibold text-base text-white">
                                        Check Participant Status
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {showOrganizerCancelTeeTimeCta && (
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
                            {showLeaveTeeTimeButton && (
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
                message={normalizeTeeDetailStatus(teeTime.status) === "confirmed"
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

            <TeeTimeConfirmSheet
                visible={showConfirmSheet}
                onClose={() => setShowConfirmSheet(false)}
                courseName={teeTime.courseName}
                courseLocation={teeTime.courseLocation}
                teeDate={teeTime.teeDate}
                teeTime={teeTime.teeTime}
                maxPlayers={teeTime.maxPlayers}
                acceptedParticipants={acceptedParticipants}
                currentUserId={currentUserId}
            />
        </ScreenShell>
    );
}

export default memo(TeeTimeDetailScreen);
