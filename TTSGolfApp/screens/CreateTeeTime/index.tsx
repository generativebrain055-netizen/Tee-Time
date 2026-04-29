import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import {
  teeTimeApi,
  inviteApi,
  friendApi,
  rosterApi,
  Friend,
  RosterGroup,
} from "../../services/api";
import { availabilityApi, type DayOfWeek, type TimeSlotType } from "../../services/api/availabilityApi";
import { ScreenShell, AppHeader } from "../../ui";
import { COLORS } from "./constants";
import DatePickerModal from "./DatePickerModal";
import TimePickerModal from "./TimePickerModal";
import { parseFlexibleTeeTime } from "./timeInputUtils";
import InviteDetailsStep from "./InviteDetailsStep";
import InviteTypeStep, { InviteType } from "./InviteTypeStep";
import RosterInviteStep from "./RosterInviteStep";
import ReviewInviteOrderStep from "./ReviewInviteOrderStep";
import FCFSInviteStep from "./FCFSInviteStep";
import ReviewFCFSInviteStep from "./ReviewFCFSInviteStep";
import ManualInviteStep from "./ManualInviteStep";
import ReviewManualInviteStep from "./ReviewManualInviteStep";
import SelectPlayersStep from "./SelectPlayersStep";
import logger from "../../utils/logger";
import { useAuthStore } from "../../stores";
import { rosterGroupMembersExceptSelf } from "../../utils/groupMemberCount";
import { X, Users, Phone, ChevronRight } from "lucide-react-native";
import { BannerAd } from "../../components/BannerAd";
import { formatDateMMDDYYYY } from "../../utils/formatting";

type FCFSTargetType = "roster" | "group";

// Extended Friend type to include phone for non-app users
interface ExtendedFriend extends Friend {
  phone?: string;
  rosterId?: string; // Original roster entry ID
  /** Linked app user (when id is the roster row id for group members) */
  contactUserId?: string;
}

/** Normalize phone to E.164 for API (backend expects /^\+?[1-9]\d{6,14}$/). */
const toE164Phone = (phone: string): string | undefined => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
};

// Helper function to convert time slot to time string
const timeSlotToTime = (timeSlot: string): string => {
  const slotMap: Record<string, string> = {
    morning: "08:00 AM",
    late_morning: "10:00 AM",
    afternoon: "01:00 PM",
    late_afternoon: "03:00 PM",
    evening: "06:00 PM",
  };
  return slotMap[timeSlot] || "10:00 AM";
};

const DAY_INDEX_TO_DAY: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Map a Date to API day of week. */
function getDayOfWeekFromDate(date: Date): DayOfWeek {
  return DAY_INDEX_TO_DAY[date.getDay()];
}

/** Map a time string (e.g. "10:00 AM") to availability time slot. */
function getTimeSlotFromTime(time: string): TimeSlotType {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "late_morning";
  let hour = parseInt(match[1], 10);
  const period = (match[3] || "").toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  if (hour >= 7 && hour < 9) return "morning";
  if (hour >= 9 && hour < 12) return "late_morning";
  if (hour >= 12 && hour < 15) return "afternoon";
  if (hour >= 15 && hour < 17) return "late_afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "late_morning";
}

export default function CreateTeeTimeScreen({ navigation, route }: any) {
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const inviteViaSMS = route?.params?.inviteViaSMS === true;
  const [step, setStep] = useState(inviteViaSMS ? 2 : 1);
  const [loading, setLoading] = useState(false);

  // Step 1 - Invite Type (Roster or First Come First Served). SMS flow uses roster.
  const [inviteType, setInviteType] = useState<InviteType>(inviteViaSMS ? "roster" : "roster");

  // Form state - Step 2 (Details: date, time, course, group size)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("10:00 AM");
  const [timeInputDraft, setTimeInputDraft] = useState<string>("10:00 AM");
  const [location, setLocation] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<{ id?: string; name: string; location?: string } | null>(null);
  const [groupSize, setGroupSize] = useState(4);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Data
  const [friends, setFriends] = useState<Friend[]>([]);
  const [onDeckFriends, setOnDeckFriends] = useState<ExtendedFriend[]>([]);
  const [groups, setGroups] = useState<RosterGroup[]>([]);

  // Roster Invite state
  const [responseWindow, setResponseWindow] = useState(2); // hours
  const [orderedPlayers, setOrderedPlayers] = useState<string[]>([]);
  const [phoneInvites, setPhoneInvites] = useState<Array<{ phone: string; name: string }>>([]);
  const [showAddMoreModal, setShowAddMoreModal] = useState(false);
  /** Full-screen player picker from Review step ("Add more" → Select from players) — avoids jumping back to step 3 roster setup. */
  const [showAddPlayersModal, setShowAddPlayersModal] = useState(false);
  const [addPlayersDraft, setAddPlayersDraft] = useState<string[]>([]);
  const [showPhoneInviteModal, setShowPhoneInviteModal] = useState(false);
  const [phoneInviteInput, setPhoneInviteInput] = useState("");
  // Controlled phone-form state for RosterInviteStep (lifted so canContinue can see pending input)
  const [showRosterPhoneInput, setShowRosterPhoneInput] = useState(false);
  const [rosterPhoneInput, setRosterPhoneInput] = useState("");
  const [rosterPhoneName, setRosterPhoneName] = useState("");

  // FCFS state
  const [fcfsTargetType, setFcfsTargetType] =
    useState<FCFSTargetType>("roster");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<ExtendedFriend[]>([]);
  const [fcfsDeadline, setFcfsDeadline] = useState<Date | null>(null);
  const [fcfsSelectedPlayers, setFcfsSelectedPlayers] = useState<string[]>([]);

  // Manual Invite state
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [allLoadedPlayers, setAllLoadedPlayers] = useState<ExtendedFriend[]>(
    []
  );
  // Keep a ref for immediate access in handleCreate
  const allLoadedPlayersRef = React.useRef<ExtendedFriend[]>([]);

  // Open Invite state
  const [openDistance, setOpenDistance] = useState(20); // Default 20 miles

  // Matching availability prompt (step 2: after date+time selected)
  const [showMatchingFriendsModal, setShowMatchingFriendsModal] = useState(false);
  const [matchingFriends, setMatchingFriends] = useState<Friend[]>([]);
  const [loadingMatchingFriends, setLoadingMatchingFriends] = useState(false);

  // Handle prefilled data from Availability screen
  useEffect(() => {
    const params = route?.params;
    if (params) {
      if (params.prefilledDate) {
        // Handle both Date objects and date strings
        const date = params.prefilledDate instanceof Date 
          ? params.prefilledDate 
          : new Date(params.prefilledDate);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
        }
      }
      if (params.prefilledTimeSlot) {
        const time = timeSlotToTime(params.prefilledTimeSlot);
        setSelectedTime(time);
      }
      if (params.availableFriends && Array.isArray(params.availableFriends)) {
        // Pre-select available friends for manual invite
        const friendIds = params.availableFriends.map((f: any) => f.id).filter(Boolean);
        if (friendIds.length > 0) {
          setSelectedPlayers(friendIds);
          // Also set as FCFS selected players as fallback
          setFcfsSelectedPlayers(friendIds);
        }
      }
    }
  }, [route?.params]);

  // Load data when moving to step 2
  useEffect(() => {
    if (step === 2) {
      loadData();
    }
  }, [step]);

  const loadData = async () => {
    try {
      const [friendsRes, groupsRes, onDeckRes, rosterRes] = await Promise.all([
        friendApi.getFriends(),
        rosterApi.getGroups(),
        rosterApi.getOnDeck(),
        rosterApi.getRoster(),
      ]);

      // Get on-deck user IDs to filter them out from roster
      const onDeckUserIds = new Set<string>();
      let onDeck: ExtendedFriend[] = [];

      if (onDeckRes.success && onDeckRes.onDeck) {
        // Convert on-deck roster contacts to Friend format
        onDeck = onDeckRes.onDeck.map((m) => {
          const nameParts = (m.contact?.name ?? "").split(" ");
          return {
            id: m.contact?.userId || m.id,
            rosterId: m.id,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            username: m.contact?.username,
            handicap: m.contact?.handicap,
            avatar: m.contact?.avatar,
            phone: m.contact?.phone,
            friendshipStatus: "friend" as const,
            friendsSince: "",
          };
        });

        // Track on-deck user IDs
        onDeckRes.onDeck.forEach((m) => {
          if (m.contact?.userId) {
            onDeckUserIds.add(m.contact.userId);
          }
        });

        setOnDeckFriends(onDeck);
      }

      // Start with friends list, then merge in roster members who aren't friends.
      // This ensures every roster member (friend or not) appears in the invite step.
      const friendIds = new Set<string>();
      let combinedRosterList: ExtendedFriend[] = [];

      if (friendsRes.success) {
        combinedRosterList = friendsRes.friends.map((f) => ({
          ...f,
          rosterId: undefined,
          phone: (f as any).phone ?? undefined,
        }));
        friendsRes.friends.forEach((f) => friendIds.add(f.id));
      }

      // Append roster members who are NOT already in friends and NOT on-deck.
      if (rosterRes.success && rosterRes.roster) {
        const rosterOnlyMembers: ExtendedFriend[] = rosterRes.roster
          .filter((m) => {
            const uid = m.contact?.userId;
            return uid && !friendIds.has(uid) && !onDeckUserIds.has(uid);
          })
          .map((m) => {
            const nameParts = (m.contact?.name ?? "").split(" ");
            return {
              id: m.contact!.userId!,
              rosterId: m.id,
              contactUserId: m.contact!.userId,
              firstName: nameParts[0] || "",
              lastName: nameParts.slice(1).join(" ") || "",
              username: m.contact?.username,
              handicap: m.contact?.handicap,
              avatar: m.contact?.avatar,
              phone: m.contact?.phone,
              friendshipStatus: "friend" as const,
              friendsSince: "",
            };
          });
        combinedRosterList = [...combinedRosterList, ...rosterOnlyMembers];
      }

      // Exclude anyone already on-deck from the main invite list
      const rosterFriends = combinedRosterList.filter(
        (f) => !onDeckUserIds.has(f.id)
      );

      setFriends(rosterFriends);
      setOrderedPlayers(rosterFriends.map((f) => f.id));
      setFcfsSelectedPlayers(rosterFriends.map((f) => f.id));

      // Add all roster members to the loaded-players pool used by manual invite & review
      setAllLoadedPlayers((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPlayers = combinedRosterList.filter((f) => !existingIds.has(f.id));
        const updated = [...prev, ...newPlayers];
        allLoadedPlayersRef.current = updated;
        return updated;
      });

      if (groupsRes.success) {
        setGroups(groupsRes.groups);
      }

      // Add on-deck to all loaded players
      if (onDeck.length > 0) {
        setAllLoadedPlayers((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPlayers = onDeck.filter((f) => !existingIds.has(f.id));
          const updated = [...prev, ...newPlayers];
          allLoadedPlayersRef.current = updated;
          return updated;
        });
      }
    } catch (e) {
      logger.error("Failed to load tee time data", e);
    }
  };

  // Load group members when a group is selected for FCFS
  const loadGroupMembers = useCallback(async (groupId: string) => {
    try {
      const response = await rosterApi.getGroupMembers(groupId);
      if (response.success) {
        // Convert roster contacts to Friend format; never list yourself as a group pick target
        const members: ExtendedFriend[] = rosterGroupMembersExceptSelf(
          response.members,
          user?.id,
        ).map((m) => {
            const nameParts = (m.contact?.name ?? "").split(" ");
            const contactUserId = m.contact?.userId;
            return {
              // Roster row id is unique per group slot (avoids duplicate keys / one invite for whole group)
              id: m.id,
              rosterId: m.id,
              contactUserId: contactUserId || undefined,
              firstName: nameParts[0] || "",
              lastName: nameParts.slice(1).join(" ") || "",
              username: m.contact?.username,
              handicap: m.contact?.handicap,
              avatar: m.contact?.avatar,
              phone: m.contact?.phone,
              friendshipStatus: "friend" as const,
              friendsSince: "",
            };
          });
        setGroupMembers(members);
        // Initialize FCFS selected players with all group members
        setFcfsSelectedPlayers(members.map((m) => m.id));
        // Add to all loaded players for manual invite lookup
        setAllLoadedPlayers((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPlayers = members.filter((m) => !existingIds.has(m.id));
          const updated = [...prev, ...newPlayers];
          allLoadedPlayersRef.current = updated;
          return updated;
        });
      }
    } catch (e) {
      logger.error("Failed to load group members", e);
      setGroupMembers([]);
    }
  }, [user?.id]);

  // Handle group selection for FCFS
  const handleGroupSelect = useCallback(
    (groupId: string | null) => {
      setSelectedGroupId(groupId);
      if (groupId) {
        loadGroupMembers(groupId);
        // Selected players will be initialized in loadGroupMembers
      } else {
        setGroupMembers([]);
        setFcfsSelectedPlayers([]);
      }
    },
    [loadGroupMembers]
  );

  /** Fetch friends with availability matching selected date + time and show modal. */
  const applyParsedTime = useCallback((t: string) => {
    setSelectedTime(t);
    setTimeInputDraft(t);
  }, []);

  const handleSeeMatchingAvailability = useCallback(async () => {
    const effectiveTime =
      parseFlexibleTeeTime(timeInputDraft.trim()) ?? selectedTime ?? "";
    if (!selectedDate || !effectiveTime) return;
    const dayOfWeek = getDayOfWeekFromDate(selectedDate);
    const timeSlot = getTimeSlotFromTime(effectiveTime);
    const allUserFriends = [...friends, ...onDeckFriends];
    const userIds = allUserFriends.map((f) => f.id).filter(Boolean);
    if (userIds.length === 0) {
      Alert.alert("No friends", "Add friends or roster connections to see who's available.");
      return;
    }
    setLoadingMatchingFriends(true);
    try {
      const res = await availabilityApi.getMultipleUsersAvailability(userIds);
      if (!res.success || !res.data) {
        setMatchingFriends([]);
        setShowMatchingFriendsModal(true);
        return;
      }
      const matchingIds = new Set(
        userIds.filter((id) => {
          const slots = res.data![id] || [];
          return slots.some(
            (s: { dayOfWeek: DayOfWeek; timeSlot: TimeSlotType }) =>
              s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot
          );
        })
      );
      const list = allUserFriends.filter((f) => matchingIds.has(f.id));
      setMatchingFriends(list);
      setShowMatchingFriendsModal(true);
    } catch (e) {
      logger.error("Failed to fetch matching availability", e);
      Alert.alert("Error", "Couldn't load friends' availability. Try again.");
    } finally {
      setLoadingMatchingFriends(false);
    }
  }, [selectedDate, selectedTime, timeInputDraft, friends, onDeckFriends]);

  const formatDateForApi = (date: Date | null) => {
    if (!date) return "";
    // Use local date components to avoid timezone issues
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${m}-${d}-${y}`;
  };

  /** MM-DD-YYYY display format for invite flow */
  const formatDateMDY = (date: Date | null) => {
    return formatDateMMDDYYYY(date);
  };

  const formatTimeForApi = (time: string) => {
    const normalized = parseFlexibleTeeTime(time.trim()) ?? time;
    const match = normalized.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return "10:00";
    let hour = parseInt(match[1]);
    const minute = match[2];
    const period = match[3].toUpperCase();
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  };

  const handleContinue = async () => {
    if (step === 1) {
      // Step 1: Select Invite Type → go to Step 2 (Invite Details) with no validation
      setStep(2);
    } else if (step === 2) {
      if (!selectedDate || !location) {
        Alert.alert("Missing Info", "Please fill in date and location");
        return;
      }

      const parsedTime = parseFlexibleTeeTime(timeInputDraft.trim());
      if (!parsedTime) {
        Alert.alert(
          "Invalid time",
          "Enter a valid time such as 8:30 AM, 2:45 PM, or 14:30 (24-hour).",
        );
        return;
      }
      setSelectedTime(parsedTime);
      setTimeInputDraft(parsedTime);

      // Validate tee time is not in the past
      const now = new Date();
      const teeDateTime = new Date(selectedDate);
      const timeParts = parsedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeParts) {
        let hour = parseInt(timeParts[1], 10);
        const minute = parseInt(timeParts[2], 10);
        const period = timeParts[3].toUpperCase();
        if (period === "PM" && hour !== 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;
        teeDateTime.setHours(hour, minute, 0, 0);
      }

      if (teeDateTime < now) {
        Alert.alert(
          "Invalid Time",
          "Cannot create a tee time in the past. Please select a future date and time."
        );
        return;
      }

      setStep(3);
    } else if (step === 3) {
      // For all invite types, go to review step
      if (inviteType === "roster" || inviteType === "fcfs" || inviteType === "manual") {
        // For roster: auto-commit any pending phone number typed in the inline form
        if (inviteType === "roster" && showRosterPhoneInput) {
          const digits = rosterPhoneInput.replace(/\D/g, "");
          if (digits.length >= 10) {
            setPhoneInvites((prev) => [...prev, { phone: rosterPhoneInput.trim(), name: rosterPhoneName.trim() }]);
          }
          setRosterPhoneInput("");
          setRosterPhoneName("");
          setShowRosterPhoneInput(false);
        }
        setStep(4);
      } else {
        await handleCreate();
      }
    } else if (step === 4) {
      await handleCreate();
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const locationStr = location ?? "";
      const courseName = locationStr.split(",")[0]?.trim() ?? "";
      if (!courseName || !selectedDate) {
        setLoading(false);
        Alert.alert("Missing Info", "Please fill in date and location.");
        return;
      }

      logger.info("Creating tee time", {
        course: courseName,
        date: formatDateForApi(selectedDate),
        time: formatTimeForApi(selectedTime),
        inviteType,
      });

      // Create tee time
      const teeTimeData: any = {
        courseName,
        courseLocation: locationStr,
        courseId: selectedCourse?.id, // Include courseId for distance calculations
        teeDate: formatDateForApi(selectedDate),
        teeTime: formatTimeForApi(selectedTime),
        maxPlayers: groupSize,
        inviteType: inviteType,
      };

      // Add distance radius for Open invites
      if (inviteType === "open") {
        teeTimeData.distanceRadius = openDistance;
      }

      const response = await teeTimeApi.createTeeTime(teeTimeData);

      logger.debug("Tee time creation response", { success: response.success });

      const teeTimeId = response.teeTime.id;
      logger.debug("Tee time created", { teeTimeId });

      // Send invites based on type
      logger.debug("Sending invites", {
        inviteType,
        selectedCount: selectedPlayers.length,
        loadedCount: allLoadedPlayers.length,
      });

      if (inviteType === "roster") {
        // Roster invite - sequential with response window
        logger.debug("Roster invite", { orderedCount: orderedPlayers.length, phoneInvitesCount: phoneInvites.length });
        if (orderedPlayers.length === 0 && phoneInvites.length === 0) {
          logger.debug("No ordered players or phone invites to invite");
        } else {
          const invitees: Array<{
            userId?: string;
            phone?: string;
            name?: string;
            order: number;
          }> = [];
          
          // Add roster players (friends and non-friend roster members)
          orderedPlayers.forEach((id, index) => {
            const player =
              friends.find((f) => f.id === id) ??
              allLoadedPlayersRef.current.find((p) => p.id === id);
            invitees.push({
              userId: id,
              name: player
                ? `${player.firstName} ${player.lastName}`
                : undefined,
              order: index + 1,
            });
          });
          
          // Add phone invites (non-registered users). Backend expects phone as E.164-style digits only.
          phoneInvites.forEach((phoneInvite, index) => {
            const e164 = toE164Phone(phoneInvite.phone);
            if (e164) {
              invitees.push({
                phone: e164,
                name: phoneInvite.name || undefined,
                order: orderedPlayers.length + index + 1,
              });
            }
          });
          
          logger.debug("Roster invitees prepared", { count: invitees.length, phoneInvites: phoneInvites.length });
          const inviteResponse = await inviteApi.createInvites(
            teeTimeId,
            invitees,
            "roster",
            responseWindow
          );
          logger.debug("Roster invite response", { success: inviteResponse.success });
        }
      } else if (inviteType === "fcfs") {
        // FCFS - send to all at once. Merge current group members so ref/state never misses rows.
        const loadedPool = allLoadedPlayersRef.current;
        const poolIds = new Set(loadedPool.map((p) => p.id));
        const mergedPool: ExtendedFriend[] =
          fcfsTargetType === "group" && groupMembers.length > 0
            ? [
                ...loadedPool,
                ...groupMembers.filter((m) => !poolIds.has(m.id)),
              ]
            : [...loadedPool];

        const invitees = fcfsSelectedPlayers
          .map((selId) => {
            const player = mergedPool.find((p) => p.id === selId);
            if (!player) {
              logger.warn("FCFS: selected player not in loaded pool", { selId });
            }
            const name = player
              ? `${player.firstName} ${player.lastName}`.trim()
              : undefined;
            const isValidUuid = (v: string | undefined) =>
              !!v &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                v
              );
            const invitee: {
              userId?: string;
              phone?: string;
              name?: string;
            } = {};
            const linkedUser = player?.contactUserId;
            if (isValidUuid(linkedUser)) {
              invitee.userId = linkedUser;
            } else if (
              isValidUuid(selId) &&
              player?.rosterId != null &&
              player.rosterId === selId
            ) {
              // Group slot keyed by roster row: backend resolves contact_user_id from this id
              invitee.userId = selId;
            } else if (isValidUuid(selId) && player?.rosterId !== selId) {
              invitee.userId = selId;
            }
            if (player?.phone) {
              const e164 = toE164Phone(player.phone);
              if (e164) invitee.phone = e164;
            }
            if (name) invitee.name = name;
            return invitee;
          })
          .filter((inv) => inv.userId || inv.phone);

        if (invitees.length > 0) {
          logger.debug("FCFS invitees prepared", { count: invitees.length, deadline: fcfsDeadline });
          // Pass deadline directly when creating invites (no separate setFCFSDeadline call needed)
          const inviteResponse = await inviteApi.createInvites(
            teeTimeId,
            invitees,
            "fcfs",
            undefined, // no responseWindow for FCFS
            fcfsDeadline ? fcfsDeadline.toISOString() : undefined
          );
          logger.debug("FCFS invite response", { success: inviteResponse.success });
        } else {
          logger.debug("No FCFS invitees to send");
        }
      } else if (inviteType === "manual") {
        // Manual - send to selected players only
        // Use ref for immediate access to avoid stale state
        const currentLoadedPlayers = allLoadedPlayersRef.current;
        logger.debug("Manual invite", {
          selectedCount: selectedPlayers.length,
          loadedCount: currentLoadedPlayers.length,
        });

        // Look in all loaded players (friends, onDeck, and group members); preserve review order
        const invitees = selectedPlayers
          .map((id, index) => {
            const player = currentLoadedPlayers.find((p) => p.id === id);
            if (!player) {
              logger.warn("Player not found in loaded players", { id });
            }

            const name = player
              ? `${player.firstName} ${player.lastName}`.trim()
              : undefined;

            // Check if this is a real user ID (UUID format)
            const isValidUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                id
              );

            // Build invitee object - only include fields that have values
            const invitee: { userId?: string; phone?: string; name?: string; order?: number } =
              {};

            // If the ID is a valid UUID and it's not just a roster entry ID, use it as userId
            if (isValidUuid && player?.rosterId !== id) {
              invitee.userId = id;
            }

            // Include phone if available (backend expects E.164)
            if (player?.phone) {
              const e164 = toE164Phone(player.phone);
              if (e164) invitee.phone = e164;
            }

            // Include name
            if (name) {
              invitee.name = name;
            }

            // Preserve manual invite order for backend (1-based position)
            invitee.order = index + 1;

            return invitee;
          })
          .filter((inv) => inv.userId || inv.phone); // Only include invitees with valid identifier

        logger.debug("Manual invitees prepared", { count: invitees.length });

        if (invitees.length > 0) {
          const inviteResponse = await inviteApi.createInvites(
            teeTimeId,
            invitees,
            "manual"
          );
          logger.debug("Manual invite response", { success: inviteResponse.success });
        } else {
          logger.debug("No manual invitees - players may not have userId or phone");
        }
      } else if (inviteType === "open") {
        // Open invite - no specific invites needed, just mark tee time as open
        // The tee time will be visible on community board
        logger.debug("Open invite created", { distance: openDistance });
        // No invites to send - tee time is open to community
      }

      navigation?.replace("TeeTimeDetail", { teeTimeId, showAllSet: true });
    } catch (error: any) {
      logger.error("Create tee time error", error);
      // Try to get more detailed error info
      let errorMessage = "Failed to create tee time";
      if (error?.message) {
        errorMessage = error.message;
      }
      if (error?.errors) {
        // Validation errors
        const errorDetails = Object.entries(error.errors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join("\n");
        errorMessage = `Validation failed:\n${errorDetails}`;
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = useCallback(
    (id: string) => {
      setSelectedPlayers((prev) =>
        prev.includes(id)
          ? prev.filter((p) => p !== id)
          : [...prev, id]
      );
    },
    []
  );

  /** Toggle selection in the "Add players" modal (draft until Done). */
  const toggleAddPlayersDraft = useCallback((id: string) => {
    setAddPlayersDraft((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }, []);

  // Handle selecting multiple players from a group
  const handleSelectGroupMembers = useCallback(
    (memberIds: string[]) => {
      setSelectedPlayers((prev) => {
        const newIds = memberIds.filter((id) => !prev.includes(id));
        return [...prev, ...newIds];
      });
    },
    []
  );

  const handleSelectDate = (day: number) => {
    setSelectedDate(new Date(calendarYear, calendarMonth, day));
    setShowDatePicker(false);
  };

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation?.goBack();
    }
  };

  const getHeaderTitle = () => {
    if (step === 1) return "Select Invite Type";
    if (step === 2) return "Invite Details";
    if (step === 3) {
      if (inviteType === "roster") return "Set Up Roster Invite";
      if (inviteType === "fcfs") return "First Come First Serve";
      return "Select Players";
    }
    if (step === 4 && inviteType === "roster") return "Review Invite Order";
    if (step === 4 && inviteType === "fcfs") return "Review Invite List";
    if (step === 4 && inviteType === "manual") return "Review Invite Order";
    return "Create Tee Time";
  };

  const getButtonText = () => {
    if (step === 3) return "Next";
    if (step === 4) return "Send invites";
    return "Continue";
  };

  const canContinue = () => {
    if (step === 1) return true;
    if (step === 2) return selectedDate && location;
    if (step === 3) {
      if (inviteType === "roster") {
        // Also count a valid phone that's been typed but not yet committed via "Add"
        const hasPendingPhone = showRosterPhoneInput && rosterPhoneInput.replace(/\D/g, "").length >= 10;
        return orderedPlayers.length > 0 || phoneInvites.length > 0 || hasPendingPhone;
      }
      if (inviteType === "fcfs") {
        return fcfsSelectedPlayers.length > 0;
      }
      if (inviteType === "manual") return selectedPlayers.length > 0;
    }
    if (step === 4) {
      if (inviteType === "roster") return orderedPlayers.length > 0 || phoneInvites.length > 0;
      if (inviteType === "fcfs") return fcfsSelectedPlayers.length > 0;
      if (inviteType === "manual") return selectedPlayers.length > 0;
    }
    return true;
  };

  return (
    <ScreenShell>

      {/* Header */}
      <AppHeader title={getHeaderTitle()} onBack={handleBack} />

      {/* Content */}
      {step === 1 && (
        <>
          <View style={{ flex: 1 }}>
            <InviteTypeStep inviteType={inviteType} onSelectType={setInviteType} />
          </View>
          <View style={{ backgroundColor: "#F3F4F6" }}>
            <BannerAd slotKey="banner_2" />
          </View>
        </>
      )}

      {step === 2 && (
        <InviteDetailsStep
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          timeInputDraft={timeInputDraft}
          onTimeInputDraftChange={setTimeInputDraft}
          onParsedTime={applyParsedTime}
          location={location}
          groupSize={groupSize}
          onOpenDatePicker={() => setShowDatePicker(true)}
          onOpenTimePicker={() => setShowTimePicker(true)}
          onLocationChange={setLocation}
          onCourseSelect={(course) => {
            setSelectedCourse(course);
            // Also update location string
            const fullLocation = course.location && course.location !== "Custom entry"
              ? `${course.name}, ${course.location}`
              : course.name;
            setLocation(fullLocation);
          }}
          onGroupSizeChange={setGroupSize}
          onSeeMatchingAvailability={handleSeeMatchingAvailability}
          loadingMatchingAvailability={loadingMatchingFriends}
        />
      )}

      {step === 3 && inviteType === "roster" && (
        <RosterInviteStep
          friends={friends}
          responseWindow={responseWindow}
          orderedPlayers={orderedPlayers}
          onResponseWindowChange={setResponseWindow}
          onReorderPlayers={setOrderedPlayers}
          onAddPhoneInvite={(phone, name) => {
            setPhoneInvites((prev) => [...prev, { phone, name }]);
            // Reset the controlled form state after committing
            setRosterPhoneInput("");
            setRosterPhoneName("");
            setShowRosterPhoneInput(false);
          }}
          phoneInvites={phoneInvites}
          showPhoneInput={showRosterPhoneInput}
          onShowPhoneInputChange={setShowRosterPhoneInput}
          phoneInputValue={rosterPhoneInput}
          onPhoneInputValueChange={setRosterPhoneInput}
          phoneNameValue={rosterPhoneName}
          onPhoneNameValueChange={setRosterPhoneName}
          creatorName={user ? `${user.firstName} ${user.lastName}`.trim() : undefined}
          creatorAvatarUrl={user?.avatar ?? user?.avatarUrl ?? undefined}
        />
      )}

      {step === 3 && inviteType === "fcfs" && (
        <FCFSInviteStep
          friends={friends}
          groups={groups}
          targetType={fcfsTargetType}
          selectedGroupId={selectedGroupId}
          onTargetTypeChange={(type) => {
            setFcfsTargetType(type);
            // Reset selected players when switching target type
            if (type === "roster") {
              setFcfsSelectedPlayers(friends.map((f) => f.id));
            } else {
              setFcfsSelectedPlayers([]);
              setSelectedGroupId(null);
            }
          }}
          onGroupSelect={handleGroupSelect}
          deadline={fcfsDeadline}
          onDeadlineChange={setFcfsDeadline}
          selectedPlayers={fcfsSelectedPlayers}
          onTogglePlayer={(id) => {
            setFcfsSelectedPlayers((prev) =>
              prev.includes(id)
                ? prev.filter((p) => p !== id)
                : [...prev, id]
            );
          }}
          onSelectAllPlayers={() => {
            const currentList = fcfsTargetType === "roster" 
              ? friends 
              : (selectedGroupId && groupMembers.length > 0 ? groupMembers : []);
            setFcfsSelectedPlayers(currentList.map((p) => p.id));
          }}
          onDeselectAllPlayers={() => {
            setFcfsSelectedPlayers([]);
          }}
          groupMembers={groupMembers}
        />
      )}

      {step === 3 && inviteType === "manual" && (
        <ManualInviteStep
          friends={friends}
          onDeckFriends={onDeckFriends}
          groups={groups}
          selectedPlayers={selectedPlayers}
          groupSize={groupSize}
          onTogglePlayer={togglePlayer}
          onSelectGroupMembers={handleSelectGroupMembers}
          onGroupMembersLoaded={(members) => {
            // Members already have phone and rosterId from ManualInviteStep
            setAllLoadedPlayers((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newPlayers: ExtendedFriend[] = members
                .filter((m) => !existingIds.has(m.id))
                .map((m) => ({
                  ...m,
                  phone: m.phone,
                  rosterId: m.rosterId,
                }));
              const updated = [...prev, ...newPlayers];
              allLoadedPlayersRef.current = updated;
              return updated;
            });
          }}
        />
      )}

      {step === 4 && inviteType === "roster" && (
        <>
          <ReviewInviteOrderStep
            friends={friends}
            orderedPlayers={orderedPlayers}
            onReorderPlayers={setOrderedPlayers}
            onReorderPhoneInvites={setPhoneInvites}
            teeDate={formatDateMDY(selectedDate)}
            teeTime={selectedTime}
            courseName={location.split(',')[0]?.trim() || ''}
            groupSize={groupSize}
            phoneInvites={phoneInvites}
            onRemovePhoneInvite={(phone) => setPhoneInvites((prev) => prev.filter((p) => p.phone !== phone))}
            onAddMore={() => setShowAddMoreModal(true)}
          />
        </>
      )}

      {step === 4 && inviteType === "fcfs" && (
        <ReviewFCFSInviteStep
          friends={allLoadedPlayers}
          selectedPlayers={fcfsSelectedPlayers}
          onRemovePlayer={(playerId) => {
            setFcfsSelectedPlayers(prev => prev.filter(id => id !== playerId));
          }}
          teeDate={formatDateMDY(selectedDate)}
          teeTime={selectedTime}
          courseName={location.split(',')[0]?.trim() || ''}
          groupName={selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name : undefined}
        />
      )}

      {step === 4 && inviteType === "manual" && (
        <ReviewManualInviteStep
          friends={allLoadedPlayers}
          orderedPlayers={selectedPlayers}
          onReorderPlayers={setSelectedPlayers}
          onRemovePlayer={(playerId) => {
            setSelectedPlayers(prev => prev.filter(id => id !== playerId));
          }}
          teeDate={formatDateMDY(selectedDate)}
          teeTime={selectedTime}
          courseName={location.split(',')[0]?.trim() || ''}
        />
      )}

      {/* Modals */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        calendarMonth={calendarMonth}
        calendarYear={calendarYear}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
      />

      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={(t) => applyParsedTime(t)}
        initialTime={timeInputDraft}
      />

      {/* Matching availability modal */}
      <Modal
        visible={showMatchingFriendsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMatchingFriendsModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => setShowMatchingFriendsModal(false)}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 24,
              maxHeight: "80%",
              minWidth: 280,
            }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingRight: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold", flex: 1 }} numberOfLines={2}>
                Friends with matching availability
              </Text>
              <TouchableOpacity onPress={() => setShowMatchingFriendsModal(false)} hitSlop={12} style={{ marginLeft: 8 }}>
                <X size={24} color="#374151" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {matchingFriends.length === 0 ? (
              <Text style={{ fontSize: 15, color: "#6B7280", fontFamily: "Inter_400Regular", marginBottom: 24, lineHeight: 22 }}>
                No friends in your network have set availability for this date and time. You can still invite anyone from your roster.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
                {matchingFriends.map((f) => {
                  const displayName = [f.firstName, f.lastName].filter(Boolean).join(" ") || "Friend";
                  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  const avatarUri = f.avatar;
                  return (
                    <View
                      key={f.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: "#F3F4F6",
                      }}
                    >
                      {avatarUri ? (
                        <Image
                          source={{ uri: avatarUri }}
                          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB", marginRight: 12, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold" }}>
                            {initials}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 15, color: "#111827", fontFamily: "Inter_500Medium", flex: 1 }} numberOfLines={1}>
                        {displayName}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 24, minHeight: 48 }}>
              <TouchableOpacity
                onPress={() => setShowMatchingFriendsModal(false)}
                style={{
                  flex: 1,
                  minHeight: 48,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
                  Maybe later
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setInviteType("manual");
                  setSelectedPlayers(matchingFriends.map((f) => f.id));
                  setFcfsSelectedPlayers(matchingFriends.map((f) => f.id));
                  setShowMatchingFriendsModal(false);
                  setStep(3);
                }}
                style={{
                  flex: 1,
                  minHeight: 48,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: "#111827",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.8}
                disabled={matchingFriends.length === 0}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: matchingFriends.length > 0 ? "#FFFFFF" : "#9CA3AF",
                    fontFamily: "Inter_600SemiBold",
                  }}
                  numberOfLines={1}
                >
                  Invite these players
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add more modal (Select from players / Invite via phone number) */}
      <Modal
        visible={showAddMoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMoreModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={addMoreStyles.backdrop}
          onPress={() => setShowAddMoreModal(false)}
        >
          <View style={addMoreStyles.sheet} onStartShouldSetResponder={() => true}>
            <View style={addMoreStyles.sheetHeader}>
              <Text style={addMoreStyles.sheetTitle}>Add more</Text>
              <TouchableOpacity onPress={() => setShowAddMoreModal(false)} hitSlop={12}>
                <X size={24} color="#374151" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={addMoreStyles.optionRow}
              onPress={() => {
                setShowAddMoreModal(false);
                setAddPlayersDraft([...orderedPlayers]);
                setShowAddPlayersModal(true);
              }}
              activeOpacity={0.7}
            >
              <Users size={22} color="#6B7280" strokeWidth={2} />
              <Text style={addMoreStyles.optionTitle}>Select from players</Text>
              <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={addMoreStyles.optionRow}
              onPress={() => {
                setShowAddMoreModal(false);
                setShowPhoneInviteModal(true);
              }}
              activeOpacity={0.7}
            >
              <Phone size={22} color="#6B7280" strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={addMoreStyles.optionTitle}>Invite via phone number</Text>
                <Text style={addMoreStyles.optionSubtitle}>Invite someone not on Tee Time Social.</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Select players (stay on Review step — same UI as manual “Your players”) */}
      <Modal
        visible={showAddPlayersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddPlayersModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top", "left", "right"]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <TouchableOpacity
              onPress={() => setShowAddPlayersModal(false)}
              hitSlop={12}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: "#6B7280",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 17,
                color: "#111827",
              }}
            >
              Add players
            </Text>
            <TouchableOpacity
              onPress={() => {
                setOrderedPlayers(addPlayersDraft);
                setShowAddPlayersModal(false);
              }}
              hitSlop={12}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: "#22C55E",
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <SelectPlayersStep
              friends={friends}
              selectedPlayers={addPlayersDraft}
              groupSize={groupSize}
              onTogglePlayer={toggleAddPlayersDraft}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Invite via phone number modal */}
      <Modal
        visible={showPhoneInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowPhoneInviteModal(false); setPhoneInviteInput(""); }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={addMoreStyles.backdrop}
          onPress={() => { setShowPhoneInviteModal(false); setPhoneInviteInput(""); }}
        >
          <View style={addMoreStyles.sheet} onStartShouldSetResponder={() => true}>
            <View style={addMoreStyles.sheetHeader}>
              <Text style={addMoreStyles.sheetTitle}>Invite via phone number</Text>
              <TouchableOpacity
                onPress={() => { setShowPhoneInviteModal(false); setPhoneInviteInput(""); }}
                hitSlop={12}
              >
                <X size={24} color="#374151" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={addMoreStyles.phoneInput}
              placeholder="(555) 123-4567"
              placeholderTextColor="#9CA3AF"
              value={phoneInviteInput}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, "").slice(0, 10);
                if (digits.length <= 3) setPhoneInviteInput(digits);
                else if (digits.length <= 6) setPhoneInviteInput(`(${digits.slice(0, 3)}) ${digits.slice(3)}`);
                else setPhoneInviteInput(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`);
              }}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={[
                addMoreStyles.addButton,
                phoneInviteInput.replace(/\D/g, "").length < 10 && addMoreStyles.addButtonDisabled,
              ]}
              onPress={() => {
                const digits = phoneInviteInput.replace(/\D/g, "");
                if (digits.length >= 10) {
                  const formatted = phoneInviteInput.trim() || `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                  setPhoneInvites((prev) => [...prev, { phone: formatted, name: "" }]);
                  setPhoneInviteInput("");
                  setShowPhoneInviteModal(false);
                }
              }}
              disabled={phoneInviteInput.replace(/\D/g, "").length < 10}
              activeOpacity={0.8}
            >
              <Text style={addMoreStyles.addButtonText}>Add to invite list</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Footer */}
      <View className="p-5 bg-white border-t border-gray-200" style={{ paddingBottom: insets.bottom + 16 }}>
        <TouchableOpacity
          className={`bg-primary rounded-md py-4 items-center ${
            (loading || !canContinue()) ? "opacity-50" : ""
          }`}
          onPress={handleContinue}
          disabled={loading || !canContinue()}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text className="text-white text-base font-semibold">{getButtonText()}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}

const addMoreStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#111827",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  optionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },
  optionSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  phoneInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
