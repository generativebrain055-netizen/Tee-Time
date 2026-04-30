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
import { ChevronLeft, Calendar, MapPin, Users, Clock, ChevronDown, ChevronRight, X, LogOut, AlertCircle, SkipForward, MessageCircle, ClipboardCheck, Check, UserPlus, Pencil } from "lucide-react-native";
import { teeTimeApi, attendanceApi, inviteApi } from "../services/api";
import { ScreenShell } from "../ui";
import { TeeTimeConfirmSheet } from "../ui/sheets/TeeTimeConfirmSheet";
import { ConfirmModal, useToast } from "../ui/feedback";
import { Alert } from "react-native";
import { useAuthStore } from "../stores";
import { useUser } from "../contexts/UserContext";
import { logger } from "../utils/logger";
import { formatDateMMDDYYYY, formatRemainingClock, parseCalendarDateLocal } from "../utils/formatting";
import { EditTeeTimeDetailsModal } from "../components/tee-time/EditTeeTimeDetailsModal";
import { getDisplayTeeTimeStatus } from "../utils/teeTimeStatusDisplay";

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
        | 'waitlist'
        | 'no_show';
    isCreator: boolean;
    expiresAt?: string;
    inviteId?: string; // For skip functionality
    attendanceStatus?: 'present' | 'no_show' | 'pending' | null;
    /** True when this row came from tee_time_participants with status cancelled (left after joining). */
    fromParticipationRecord?: boolean;
}

/** Match API tee time status regardless of casing / whitespace */
function normalizeTeeDetailStatus(status: string | undefined | null): string {
    return String(status ?? "")
        .toLowerCase()
        .trim();
}

/** Profile URL from API, or generated initials avatar when none (invitees without user profile, etc.). */
function resolveMemberAvatarUri(name: string, avatar?: string | null): string {
    const trimmed = typeof avatar === "string" ? avatar.trim() : "";
    if (trimmed) return trimmed;
    const label = (name || "?").trim() || "?";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&size=128&background=F3F4F6&color=374151&bold=true`;
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

/** Full roster → show Confirmed even if API still has in_progress/pending */
function effectiveTeeStatusForUi(teeTime: TeeTimeDetail | null): string {
    if (!teeTime) return "";
    return getDisplayTeeTimeStatus({
        status: teeTime.status,
        maxPlayers: teeTime.maxPlayers,
        participantCount: teeTime.acceptedCount,
        slotsOpen: teeTime.slotsOpen,
    });
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

const MS_PER_DAY = 86400000;

/**
 * Check if we're in the check-in window (Figma 437-321).
 * Same calendar day as tee: from midnight until 4 hours after scheduled tee time.
 * If tee was yesterday, still allow prompting so the host can open attendance the next morning
 * (matches backend grace for unfinished check-in).
 */
function isInCheckInWindow(teeDateStr: string, teeTimeStr: string): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cal = parseCalendarDateLocal(teeDateStr);
    if (Number.isNaN(cal.getTime())) return false;
    const teeDate = new Date(cal.getFullYear(), cal.getMonth(), cal.getDate());
    const diffDays = Math.round((today.getTime() - teeDate.getTime()) / MS_PER_DAY);

    if (diffDays === 1) {
        return true;
    }
    if (diffDays !== 0) {
        return false;
    }

    const timePart = String(teeTimeStr || "00:00").trim();
    const [teeH = 0, teeM = 0, teeS = 0] = timePart.split(":").map((x) => parseFloat(x));
    const teeMinutes = teeH * 60 + teeM + (Number.isFinite(teeS) ? teeS / 60 : 0);
    const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const minutesUntilTeeTime = teeMinutes - currentMinutes;

    if (minutesUntilTeeTime < -240) return false;
    return true;
}

function isPastScheduledTeeTime(teeDateStr: string, teeTimeStr: string): boolean {
    if (!teeDateStr || !teeTimeStr) return false;
    const cal = parseCalendarDateLocal(teeDateStr);
    if (Number.isNaN(cal.getTime())) return false;
    const [hh = 0, mm = 0, ss = 0] = String(teeTimeStr).split(":").map((x) => parseInt(x, 10));
    const scheduledAt = new Date(
        cal.getFullYear(),
        cal.getMonth(),
        cal.getDate(),
        Number.isNaN(hh) ? 0 : hh,
        Number.isNaN(mm) ? 0 : mm,
        Number.isNaN(ss) ? 0 : ss,
        0,
    );
    if (Number.isNaN(scheduledAt.getTime())) return false;
    return scheduledAt.getTime() < Date.now();
}

function isTodayOrPastTeeDate(teeDateStr: string): boolean {
    if (!teeDateStr) return false;
    const cal = parseCalendarDateLocal(teeDateStr);
    if (Number.isNaN(cal.getTime())) return false;
    const teeDate = new Date(cal.getFullYear(), cal.getMonth(), cal.getDate());
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return teeDate.getTime() <= todayOnly.getTime();
}

const ParticipantRow = memo(({ participant, showTimeLeft, calculateTimeLeft, isInAwaitingGroup, isActiveInvitedSlot, onSkip, canSkip }: { 
    participant: Participant; 
    showTimeLeft?: boolean;
    calculateTimeLeft?: (expiresAt: string) => string | null;
    isInAwaitingGroup?: boolean;
    /** FCFS / parallel: front-of-line invite with active deadline (highlight row + avatar ring + timer). */
    isActiveInvitedSlot?: boolean;
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
                // No deadline yet = not an active invite (e.g. roster backup not notified) — show Queued, not Awaiting response
                if (!participant.expiresAt) {
                    return { color: 'text-gray-600', text: 'Queued', showBadge: false, badgeIcon: null, showArrow: false };
                }
                return {
                    color: 'text-gray-600',
                    text: 'Awaiting response',
                    showBadge: false,
                    badgeIcon: null,
                    showArrow: true,
                };
            case 'invited':
                return { color: 'text-gray-600', text: 'Awaiting response', showBadge: false, badgeIcon: null, showArrow: true };
            case 'waitlist':
                return { color: 'text-gray-600', text: 'Waitlist', showBadge: false, badgeIcon: null, showArrow: true };
            case 'expired':
                return { color: 'text-gray-400', text: 'Expired', showBadge: true, badgeIcon: 'timeout', showArrow: false };
            case 'cancelled':
                return { color: 'text-gray-500', text: 'Cancelled', showBadge: true, badgeIcon: 'decline', showArrow: false };
            case 'no_show':
                return { color: 'text-red-600', text: 'No-show', showBadge: true, badgeIcon: 'decline', showArrow: false };
            default:
                return { color: 'text-gray-600', text: 'Awaiting response', showBadge: false, badgeIcon: null, showArrow: true };
        }
    };

    const statusConfig = getStatusConfig();
    // Skipped invites use status `expired` but may still have a future expires_at; never show a live countdown for terminal states.
    const statusAllowsCountdown =
        participant.status === "pending" ||
        participant.status === "queued" ||
        participant.status === "invited" ||
        participant.status === "waitlist";
    const timeLeft =
        showTimeLeft &&
        statusAllowsCountdown &&
        participant.expiresAt &&
        calculateTimeLeft
            ? calculateTimeLeft(participant.expiresAt)
            : null;

    const highlightRow = !!isInAwaitingGroup || !!isActiveInvitedSlot;
    const highlightAvatarRing = !!isInAwaitingGroup || !!isActiveInvitedSlot;
    const avatarRingStyle = highlightAvatarRing
        ? { borderWidth: 2, borderColor: "#5EBC68" as const }
        : {};
    const avatarUri = resolveMemberAvatarUri(participant.name, participant.avatar);

    return (
        <View className={`flex-row items-center py-4 px-5 border-b border-gray-200 ${highlightRow ? 'bg-green-50' : 'bg-white'}`}>
            {statusConfig.showArrow && (
                <View className="mr-2 justify-center">
                    <ChevronRight size={22} color="#111827" strokeWidth={2.5} />
                </View>
            )}
            
            {/* Avatar with Status Badge */}
            <View className="relative mr-3.5">
                <Image
                    source={{ uri: avatarUri }}
                    className="w-14 h-14 rounded-full"
                    style={{ borderRadius: 28, ...avatarRingStyle }}
                />
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

/** Backup section rows — e.g. stale parallel invites (`pending`) not shown in main list */
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
        const avatarUri = resolveMemberAvatarUri(participant.name, participant.avatar);

        return (
            <View className="flex-row items-center py-4 px-5 border-b border-gray-200 bg-white">
                <View className="relative mr-3.5">
                    <Image
                        source={{ uri: avatarUri }}
                        className="w-14 h-14 rounded-full"
                        style={{ borderRadius: 28 }}
                    />
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
    const { teeTimeId, fromTeeTimeAtRiskPush: fromTeeTimeAtRiskPushParam } = route.params || {};
    const fromTeeTimeAtRiskPush = fromTeeTimeAtRiskPushParam === true;
    const mainScrollRef = useRef<ScrollView>(null);
    const consumedAtRiskScrollRef = useRef(false);
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
    const [showEditTeeDetailsModal, setShowEditTeeDetailsModal] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [respondingToInvite, setRespondingToInvite] = useState(false);
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
                const applySavedAttendanceStatus = isTodayOrPastTeeDate(String(data.teeDate || ""));
                
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
                            const attendanceStatus = (p.attendanceStatus || null) as Participant["attendanceStatus"];
                            allParticipants.push({
                                id: p.id,
                                userId: p.userId,
                                name: p.name,
                                avatar: p.avatar,
                                status:
                                    applySavedAttendanceStatus && attendanceStatus === "no_show"
                                        ? "no_show"
                                        : "accepted",
                                isCreator: p.isCreator || false,
                                attendanceStatus,
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
                                fromParticipationRecord: true,
                                attendanceStatus: (p.attendanceStatus || null) as Participant["attendanceStatus"],
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
                        if (userId && seenUserIds.has(userId)) {
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
                        if (userId) seenUserIds.add(userId);
                    });
                }
                
                const acceptedCount = allParticipants.filter(
                    (p) => p.status === 'accepted' || p.status === 'no_show',
                ).length;
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
        if (normalizeTeeDetailStatus(effectiveTeeStatusForUi(teeTime)) === "confirmed") {
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

    const isPastTeeTime = useMemo(() => {
        if (!teeTime?.teeDate || !teeTime?.teeTime) return false;
        return isPastScheduledTeeTime(teeTime.teeDate, teeTime.teeTime);
    }, [teeTime]);

    const isTodayOrPastDate = useMemo(() => {
        if (!teeTime?.teeDate) return false;
        return isTodayOrPastTeeDate(teeTime.teeDate);
    }, [teeTime]);

    const autoOpenCheckInParam = route?.params?.autoOpenCheckIn === true;

    // Auto open check-in only when explicitly requested (e.g. check-in reminder notification).
    useEffect(() => {
        const st = normalizeTeeDetailStatus(effectiveTeeStatusForUi(teeTime));
        if (
            !teeTime ||
            !isOrganizer ||
            !autoOpenCheckInParam ||
            (st !== "confirmed" && st !== "in_progress") ||
            !inCheckInWindow ||
            hasNavigatedToCheckIn.current
        ) {
            return;
        }
        hasNavigatedToCheckIn.current = true;
        navigation?.setParams?.({ autoOpenCheckIn: false });
        navigation?.navigate("CheckIn", {
            teeTimeId: teeTime.id,
            courseName: teeTime.courseName,
            teeDate: teeTime.teeDate,
            teeTime: teeTime.teeTime,
        });
    }, [teeTime, isOrganizer, autoOpenCheckInParam, inCheckInWindow, navigation]);

    // Push / notification tap: “Tee Time at Risk” → land on this tee time and scroll toward organizer actions.
    useEffect(() => {
        if (
            loading ||
            !teeTime ||
            !fromTeeTimeAtRiskPush ||
            consumedAtRiskScrollRef.current
        ) {
            return;
        }
        consumedAtRiskScrollRef.current = true;
        const t = setTimeout(() => {
            mainScrollRef.current?.scrollToEnd({ animated: true });
            navigation?.setParams?.({ fromTeeTimeAtRiskPush: false });
        }, 400);
        return () => clearTimeout(t);
    }, [loading, teeTime, fromTeeTimeAtRiskPush, navigation]);

    // Check if current user is a participant
    const isParticipant = useMemo(() => {
        if (!teeTime || !currentUserId) return false;
        return teeTime.participants.some(p => p.userId === currentUserId && p.status === 'accepted');
    }, [teeTime, currentUserId]);

    const normalizedTeeStatus = useMemo(
        () => normalizeTeeDetailStatus(effectiveTeeStatusForUi(teeTime)),
        [teeTime],
    );

    const canEditScheduledDetails = useMemo(() => {
        if (!isOrganizer || !teeTime) return false;
        return !["completed", "cancelled", "canceled"].includes(normalizedTeeStatus);
    }, [isOrganizer, teeTime, normalizedTeeStatus]);

    /** Raw pending invite for the current user (same source as Invite Detail). */
    const pendingInviteForMe = useMemo(() => {
        if (!teeTime?.invites?.length || !currentUserId) return null;
        return (
            teeTime.invites.find(
                (inv) =>
                    String(inv.invitee?.userId ?? "") === String(currentUserId) &&
                    inv.status === "pending",
            ) ?? null
        );
    }, [teeTime, currentUserId]);

    const isPendingInviteExpired = useMemo(() => {
        if (!pendingInviteForMe?.expiresAt) return false;
        return new Date(pendingInviteForMe.expiresAt).getTime() <= currentTime.getTime();
    }, [pendingInviteForMe, currentTime]);

    const showInviteResponseCta = useMemo(() => {
        if (!pendingInviteForMe || isOrganizer || isPendingInviteExpired) return false;
        const st = normalizedTeeStatus;
        if (st === "cancelled" || st === "canceled" || st === "completed") return false;
        return true;
    }, [pendingInviteForMe, isOrganizer, isPendingInviteExpired, normalizedTeeStatus]);

    const handleInviteRespond = useCallback(
        async (response: "accepted" | "declined") => {
            if (!pendingInviteForMe?.id) return;
            setRespondingToInvite(true);
            try {
                const result = (await inviteApi.respondToInvite(
                    pendingInviteForMe.id,
                    response,
                )) as {
                    success: boolean;
                    message?: string;
                    code?: string;
                    status?: string;
                    socialRateDelta?: number;
                    newSocialRate?: number;
                };
                if (result.success) {
                    const delta = result.socialRateDelta;
                    const newScore = result.newSocialRate;
                    if (delta != null && delta !== 0 && typeof fetchProfile === "function") {
                        await fetchProfile(true);
                        const sign = delta > 0 ? "+" : "";
                        const msg =
                            newScore != null
                                ? `${sign}${delta} Social Rate (${newScore})`
                                : `${sign}${delta} Social Rate`;
                        toast?.show({ message: msg, type: delta > 0 ? "success" : "info" });
                    }
                    await fetchTeeTimeDetails();
                    const acceptTitle =
                        response === "accepted"
                            ? result.status === "waitlist"
                                ? "Waitlist"
                                : "Accepted!"
                            : "Declined";
                    const acceptBody =
                        result.message ||
                        (response === "accepted"
                            ? result.status === "waitlist"
                                ? "You're on the waitlist for this tee time."
                                : "You've been added to the tee time!"
                            : "You've declined the invite.");
                    Alert.alert(acceptTitle, acceptBody);
                } else {
                    const full = result.code === "TEE_TIME_FULL";
                    Alert.alert(
                        full ? "Tee time full" : "Error",
                        result.message || "Failed to respond to invite. Please try again.",
                    );
                }
            } catch (error: any) {
                Alert.alert(
                    "Error",
                    error?.message || "Failed to respond to invite. Please try again.",
                );
            } finally {
                setRespondingToInvite(false);
            }
        },
        [pendingInviteForMe, fetchProfile, fetchTeeTimeDetails, toast],
    );

    /** Host must see check-in while group is active — not only when API says "confirmed" (in_progress after check-in reminder / cancel flow is common). */
    const canShowCheckParticipantStatus = useMemo(() => {
        if (!teeTime || !isOrganizer) return false;
        const s = normalizedTeeStatus;
        if (s === "cancelled" || s === "canceled") return false;
        return isTodayOrPastDate;
    }, [isOrganizer, teeTime, normalizedTeeStatus, isTodayOrPastDate]);
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
            !isPastTeeTime &&
            normalizedTeeStatus !== "completed" &&
            normalizedTeeStatus !== "cancelled" &&
            normalizedTeeStatus !== "canceled",
        [isOrganizer, normalizedTeeStatus, isPastTeeTime],
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
    const noShowParticipants = teeTime.participants.filter(p => p.status === 'no_show');
    const showExpandedBackupAndCancelled =
        normalizedTeeStatus === 'confirmed' ||
        normalizedTeeStatus === 'completed' ||
        normalizedTeeStatus === 'cancelled' ||
        normalizedTeeStatus === 'canceled';
    const cancelledMembers = teeTime.participants.filter(p => {
        if (p.status !== 'cancelled') return false;
        if (showExpandedBackupAndCancelled) return true;
        return p.fromParticipationRecord === true;
    });
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

    /** Confirmed / completed / cancelled (tee) with every spot filled: main list = accepted only; accordion = everyone else (Figma). */
    const useFilledConfirmedMemberLayout =
        showExpandedBackupAndCancelled &&
        teeTime.slotsOpen === 0 &&
        normalizedTeeStatus !== 'pending' &&
        normalizedTeeStatus !== 'in_progress';

    const backupDeclinedList = useFilledConfirmedMemberLayout
        ? [
              ...declinedParticipants,
              ...expiredParticipants,
              ...queuedParticipants,
              ...(parallelInviteDetail ? pendingParticipants : []),
          ]
        : parallelInviteDetail && showExpandedBackupAndCancelled
          ? [...pendingParticipants]
          : [];

    const firstQueuedWithDeadlineIdx = queuedParticipants.findIndex(
        (q) => q.expiresAt && calculateTimeLeft?.(q.expiresAt),
    );

    const showInviteMoreMembers =
        isOrganizer &&
        teeTime.slotsOpen > 0 &&
        (normalizedTeeStatus === "in_progress" ||
            (normalizedTeeStatus === "pending" &&
                pendingParticipants.length === 0 &&
                queuedParticipants.length === 0));

    const formatDate = (dateStr: string) => {
        return formatDateMMDDYYYY(parseCalendarDateLocal(dateStr));
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
                <View className="flex-row items-center min-w-[44px] justify-end">
                    {canEditScheduledDetails && (
                        <TouchableOpacity
                            onPress={() => setShowEditTeeDetailsModal(true)}
                            className="p-1 mr-1"
                            activeOpacity={0.7}
                            accessibilityLabel="Edit date, time, and club"
                        >
                            <Pencil size={22} color="#6B7280" strokeWidth={2} />
                        </TouchableOpacity>
                    )}
                    {normalizedTeeStatus === "confirmed" && (
                        <TouchableOpacity
                            onPress={() => navigation?.navigate("ChatDetail", { chatInfo: { teeTimeId: teeTimeId } })}
                            className="p-1 -mr-1"
                            activeOpacity={0.7}
                        >
                            <MessageCircle size={24} color="#5EBC68" strokeWidth={2} />
                        </TouchableOpacity>
                    )}
                    {!canEditScheduledDetails && normalizedTeeStatus !== "confirmed" ? (
                        <View className="w-8" />
                    ) : null}
                </View>
            </View>

            <ScrollView
                ref={mainScrollRef}
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
                        <StatusBadge status={effectiveTeeStatusForUi(teeTime)} />
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
                    {teeTime.inviteType && normalizedTeeStatus !== "confirmed" && (
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

                {/* Invitee: accept / decline without leaving tee time summary */}
                {showInviteResponseCta && pendingInviteForMe && (
                    <View className="bg-white px-6 pb-6 -mt-2">
                        <View
                            className="rounded-xl border px-4 py-4"
                            style={{ borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" }}
                        >
                            <Text className="font-jakarta-bold text-base text-gray-900 mb-1">
                                You&apos;re invited to this tee time
                            </Text>
                            {pendingInviteForMe.expiresAt && calculateTimeLeft(pendingInviteForMe.expiresAt) ? (
                                <Text className="font-jakarta text-sm text-gray-600 mb-3">
                                    Respond within{" "}
                                    <Text className="font-jakarta-semibold text-emerald-800">
                                        {calculateTimeLeft(pendingInviteForMe.expiresAt)}
                                    </Text>
                                </Text>
                            ) : (
                                <Text className="font-jakarta text-sm text-gray-600 mb-3">
                                    Accept to join the group, or decline to pass.
                                </Text>
                            )}
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    className="flex-1 flex-row items-center justify-center py-3.5 px-4 rounded-lg"
                                    style={{ backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA" }}
                                    onPress={() => handleInviteRespond("declined")}
                                    disabled={respondingToInvite}
                                    activeOpacity={0.7}
                                >
                                    {respondingToInvite ? (
                                        <ActivityIndicator size="small" color="#DC2626" />
                                    ) : (
                                        <>
                                            <X size={18} color="#DC2626" strokeWidth={2.5} />
                                            <Text className="font-jakarta-semibold text-base text-red-700 ml-2">
                                                Decline
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="flex-1 flex-row items-center justify-center py-3.5 px-4 rounded-lg"
                                    style={{ backgroundColor: "#5EBC68" }}
                                    onPress={() => handleInviteRespond("accepted")}
                                    disabled={respondingToInvite}
                                    activeOpacity={0.7}
                                >
                                    {respondingToInvite ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                                            <Text className="font-jakarta-semibold text-base text-white ml-2">
                                                Accept
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* Divider */}
                <View className="h-2.5 bg-gray-50" />

                {/* Participants List */}
                <View className="bg-white">
                    {/* Accepted — always first */}
                    {acceptedParticipants.map((p) => (
                        <ParticipantRow
                            key={p.id}
                            participant={p}
                            calculateTimeLeft={calculateTimeLeft}
                        />
                    ))}
                    {noShowParticipants.map((p) => (
                        <ParticipantRow
                            key={p.id}
                            participant={p}
                            calculateTimeLeft={calculateTimeLeft}
                        />
                    ))}

                    {/* Pending / in-progress / confirmed with open spots: single scroll (declined inline, pipeline below) */}
                    {!useFilledConfirmedMemberLayout && (
                        <>
                            {declinedParticipants.map((p) => (
                                <ParticipantRow
                                    key={p.id}
                                    participant={p}
                                    calculateTimeLeft={calculateTimeLeft}
                                />
                            ))}
                            {expiredParticipants.map((p) => (
                                <ParticipantRow
                                    key={p.id}
                                    participant={p}
                                    calculateTimeLeft={calculateTimeLeft}
                                    showTimeLeft={!!p.expiresAt}
                                />
                            ))}

                            {parallelInviteDetail &&
                                queuedParticipants.map((p, i) => (
                                    <ParticipantRow
                                        key={p.id}
                                        participant={p}
                                        calculateTimeLeft={calculateTimeLeft}
                                        showTimeLeft={!!p.expiresAt}
                                        isActiveInvitedSlot={
                                            i === firstQueuedWithDeadlineIdx && firstQueuedWithDeadlineIdx >= 0
                                        }
                                    />
                                ))}

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
                                queuedParticipants.map((p, i) => (
                                    <ParticipantRow
                                        key={p.id}
                                        participant={p}
                                        calculateTimeLeft={calculateTimeLeft}
                                        showTimeLeft={!!p.expiresAt}
                                        isActiveInvitedSlot={
                                            i === firstQueuedWithDeadlineIdx && firstQueuedWithDeadlineIdx >= 0
                                        }
                                    />
                                ))}
                        </>
                    )}

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
                                cancelledMembers.map((p) => (
                                    <ParticipantRow
                                        key={p.id}
                                        participant={p}
                                        calculateTimeLeft={calculateTimeLeft}
                                    />
                                ))}
                        </>
                    )}
                </View>

                {/* Backup & declined — full group (confirmed/completed/cancelled + all slots filled); hidden in progress */}
                {backupDeclinedList.length > 0 && normalizedTeeStatus !== 'in_progress' && (
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
                    showLeaveTeeTimeButton ||
                    showInviteMoreMembers) && (
                    <>
                        <View className="h-2.5 bg-gray-50" />
                        <View className="bg-white px-6 py-5">
                            {showInviteMoreMembers && (
                                <TouchableOpacity
                                    className="flex-row items-center justify-center py-4 px-6 rounded-lg mb-3"
                                    style={{ backgroundColor: "#5EBC68", borderWidth: 0 }}
                                    onPress={() =>
                                        navigation?.navigate("SelectOnDeck", {
                                            teeTimeId,
                                            spotsRemaining: teeTime.slotsOpen,
                                            courseName: teeTime.courseName,
                                            teeDate: teeTime.teeDate,
                                            teeTime: teeTime.teeTime,
                                            unfilledSlotAlert: true,
                                        })
                                    }
                                    activeOpacity={0.7}
                                >
                                    <UserPlus size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text className="font-jakarta-semibold text-base text-white">
                                        Invite more members
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {canShowCheckParticipantStatus && (
                                <TouchableOpacity
                                    className="flex-row items-center justify-center py-4 px-6 rounded-lg mb-3"
                                    style={{ backgroundColor: '#16A34A', borderWidth: 0 }}
                                    onPress={() =>
                                        navigation?.replace?.("CheckIn", {
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

            <EditTeeTimeDetailsModal
                visible={showEditTeeDetailsModal}
                teeTimeId={String(teeTimeId)}
                initial={{
                    courseName: teeTime.courseName,
                    courseLocation: teeTime.courseLocation || "",
                    teeDate: teeTime.teeDate,
                    teeTime: teeTime.teeTime,
                }}
                onClose={() => setShowEditTeeDetailsModal(false)}
                onSaved={() => {
                    void fetchTeeTimeDetails();
                }}
            />

            {/* Leave Tee Time Modal */}
            <ConfirmModal
                visible={showLeaveModal}
                title="Leave tee time?"
                message={normalizedTeeStatus === "confirmed"
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
