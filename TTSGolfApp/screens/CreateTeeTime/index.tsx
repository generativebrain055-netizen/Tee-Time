import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { teeTimeApi, inviteApi, friendApi, rosterApi, Friend, RosterGroup } from "../../services/api";
import { Header } from "../../components/common";
import { COLORS } from "./constants";
import DatePickerModal from "./DatePickerModal";
import TimePickerModal from "./TimePickerModal";
import InviteDetailsStep from "./InviteDetailsStep";
import InviteTypeStep, { InviteType } from "./InviteTypeStep";
import RosterInviteStep from "./RosterInviteStep";
import FCFSInviteStep from "./FCFSInviteStep";
import ManualInviteStep from "./ManualInviteStep";

type FCFSTargetType = "roster" | "group";

// Extended Friend type to include phone for non-app users
interface ExtendedFriend extends Friend {
    phone?: string;
    rosterId?: string; // Original roster entry ID
}

export default function CreateTeeTimeScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form state - Step 1
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>("10:00 AM");
    const [location, setLocation] = useState("");
    const [groupSize, setGroupSize] = useState(4);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Calendar state
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

    // Step 2 - Invite Type
    const [inviteType, setInviteType] = useState<InviteType>("roster");

    // Data
    const [friends, setFriends] = useState<Friend[]>([]);
    const [onDeckFriends, setOnDeckFriends] = useState<ExtendedFriend[]>([]);
    const [groups, setGroups] = useState<RosterGroup[]>([]);

    // Roster Invite state
    const [responseWindow, setResponseWindow] = useState(2); // hours
    const [orderedPlayers, setOrderedPlayers] = useState<string[]>([]);

    // FCFS state
    const [fcfsTargetType, setFcfsTargetType] = useState<FCFSTargetType>("roster");
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [groupMembers, setGroupMembers] = useState<ExtendedFriend[]>([]);
    const [fcfsDeadline, setFcfsDeadline] = useState<Date | null>(null);

    // Manual Invite state
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [allLoadedPlayers, setAllLoadedPlayers] = useState<ExtendedFriend[]>([]);
    // Keep a ref for immediate access in handleCreate
    const allLoadedPlayersRef = React.useRef<ExtendedFriend[]>([]);

    // Load data when moving to step 2
    useEffect(() => {
        if (step === 2) {
            loadData();
        }
    }, [step]);

    const loadData = async () => {
        try {
            const [friendsRes, groupsRes, onDeckRes] = await Promise.all([
                friendApi.getFriends(),
                rosterApi.getGroups(),
                rosterApi.getOnDeck(),
            ]);

            if (friendsRes.success) {
                setFriends(friendsRes.friends);
                // Initialize ordered players with friend IDs
                setOrderedPlayers(friendsRes.friends.map(f => f.id));
                // Add to all loaded players - friends have valid user UUIDs
                setAllLoadedPlayers(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPlayers: ExtendedFriend[] = friendsRes.friends
                        .filter(f => !existingIds.has(f.id))
                        .map(f => ({ ...f, rosterId: undefined, phone: undefined }));
                    const updated = [...prev, ...newPlayers];
                    allLoadedPlayersRef.current = updated;
                    return updated;
                });
            }
            if (groupsRes.success) {
                setGroups(groupsRes.groups);
            }
            if (onDeckRes.success) {
                // Convert on-deck roster contacts to Friend format
                const onDeck: ExtendedFriend[] = onDeckRes.onDeck.map(m => ({
                    id: m.contact.userId || m.id, // Use roster ID as fallback for display
                    rosterId: m.id,
                    firstName: m.contact.name?.split(' ')[0] || '',
                    lastName: m.contact.name?.split(' ').slice(1).join(' ') || '',
                    username: m.contact.username,
                    handicap: m.contact.handicap,
                    avatar: m.contact.avatar,
                    phone: m.contact.phone,
                    friendshipStatus: 'friend' as const,
                    friendsSince: '',
                }));
                setOnDeckFriends(onDeck);
                // Add to all loaded players
                setAllLoadedPlayers(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPlayers = onDeck.filter(f => !existingIds.has(f.id));
                    const updated = [...prev, ...newPlayers];
                    allLoadedPlayersRef.current = updated;
                    return updated;
                });
            }
        } catch (e) {
            console.log("Failed to load data:", e);
        }
    };

    // Load group members when a group is selected for FCFS
    const loadGroupMembers = useCallback(async (groupId: string) => {
        try {
            const response = await rosterApi.getGroupMembers(groupId);
            if (response.success) {
                // Convert roster contacts to Friend format for display
                const members: ExtendedFriend[] = response.members.map(m => ({
                    id: m.contact.userId || m.id,
                    rosterId: m.id,
                    firstName: m.contact.name?.split(' ')[0] || '',
                    lastName: m.contact.name?.split(' ').slice(1).join(' ') || '',
                    username: m.contact.username,
                    handicap: m.contact.handicap,
                    avatar: m.contact.avatar,
                    phone: m.contact.phone,
                    friendshipStatus: 'friend' as const,
                    friendsSince: '',
                }));
                setGroupMembers(members);
                // Add to all loaded players for manual invite lookup
                setAllLoadedPlayers(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPlayers = members.filter(m => !existingIds.has(m.id));
                    const updated = [...prev, ...newPlayers];
                    allLoadedPlayersRef.current = updated;
                    return updated;
                });
            }
        } catch (e) {
            console.log("Failed to load group members:", e);
            setGroupMembers([]);
        }
    }, []);

    // Handle group selection for FCFS
    const handleGroupSelect = useCallback((groupId: string | null) => {
        setSelectedGroupId(groupId);
        if (groupId) {
            loadGroupMembers(groupId);
        } else {
            setGroupMembers([]);
        }
    }, [loadGroupMembers]);

    const formatDateForApi = (date: Date | null) => {
        if (!date) return "";
        // Use local date components to avoid timezone issues
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        const d = date.getDate().toString().padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const formatTimeForApi = (time: string) => {
        const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
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
            if (!selectedDate || !location) {
                Alert.alert("Missing Info", "Please fill in date and location");
                return;
            }

            // Validate tee time is not in the past
            const now = new Date();
            const teeDateTime = new Date(selectedDate);
            const timeParts = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (timeParts) {
                let hour = parseInt(timeParts[1]);
                const minute = parseInt(timeParts[2]);
                const period = timeParts[3].toUpperCase();
                if (period === "PM" && hour !== 12) hour += 12;
                if (period === "AM" && hour === 12) hour = 0;
                teeDateTime.setHours(hour, minute, 0, 0);
            }

            if (teeDateTime < now) {
                Alert.alert("Invalid Time", "Cannot create a tee time in the past. Please select a future date and time.");
                return;
            }

            setStep(2);
        } else if (step === 2) {
            setStep(3);
        } else if (step === 3) {
            await handleCreate();
        }
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            console.log("Creating tee time with data:", {
                courseName: location.split(",")[0].trim(),
                courseLocation: location,
                teeDate: formatDateForApi(selectedDate),
                teeTime: formatTimeForApi(selectedTime),
                maxPlayers: groupSize,
                inviteType: inviteType,
            });

            // Create tee time
            const response = await teeTimeApi.createTeeTime({
                courseName: location.split(",")[0].trim(),
                courseLocation: location,
                teeDate: formatDateForApi(selectedDate),
                teeTime: formatTimeForApi(selectedTime),
                maxPlayers: groupSize,
                inviteType: inviteType,
            });

            console.log("Tee time creation response:", response);

            if (!response.success) {
                throw new Error(response.message || "Failed to create tee time");
            }

            const teeTimeId = response.teeTime.id;
            console.log("Tee time created with ID:", teeTimeId);

            // Send invites based on type
            console.log("Sending invites for type:", inviteType);
            console.log("Selected players:", selectedPlayers);
            console.log("All loaded players:", allLoadedPlayers.length);

            if (inviteType === "roster") {
                // Roster invite - sequential with response window
                console.log("Roster invite - orderedPlayers:", orderedPlayers);
                if (orderedPlayers.length === 0) {
                    console.log("No ordered players to invite");
                } else {
                    const invitees = orderedPlayers.map((id, index) => {
                        const friend = friends.find(f => f.id === id);
                        return {
                            userId: id,
                            name: friend ? `${friend.firstName} ${friend.lastName}` : undefined,
                            order: index + 1,
                        };
                    });
                    console.log("Roster invitees:", JSON.stringify(invitees, null, 2));
                    const inviteResponse = await inviteApi.createInvites(teeTimeId, invitees, "roster", responseWindow);
                    console.log("Invite response:", inviteResponse);
                }
            } else if (inviteType === "fcfs") {
                // FCFS - send to all at once
                let invitees: Array<{ userId?: string; phone?: string; name?: string }> = [];

                if (fcfsTargetType === "roster") {
                    invitees = friends.map(f => ({
                        userId: f.id,
                        name: `${f.firstName} ${f.lastName}`,
                    }));
                } else if (selectedGroupId && groupMembers.length > 0) {
                    // Use already loaded group members - handle both app users and phone contacts
                    invitees = groupMembers.map(m => {
                        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id);
                        const invitee: { userId?: string; phone?: string; name?: string } = {
                            name: `${m.firstName} ${m.lastName}`,
                        };
                        if (isValidUuid && m.rosterId !== m.id) {
                            invitee.userId = m.id;
                        }
                        if (m.phone) {
                            invitee.phone = m.phone;
                        }
                        return invitee;
                    }).filter(inv => inv.userId || inv.phone);
                }

                if (invitees.length > 0) {
                    console.log("FCFS invitees:", JSON.stringify(invitees, null, 2));
                    console.log("FCFS deadline:", fcfsDeadline);
                    const inviteResponse = await inviteApi.createInvites(teeTimeId, invitees, "fcfs");
                    console.log("FCFS invite response:", inviteResponse);

                    // Set deadline if specified
                    if (fcfsDeadline) {
                        try {
                            await teeTimeApi.setFCFSDeadline(teeTimeId, fcfsDeadline.toISOString());
                            console.log("FCFS deadline set successfully");
                        } catch (deadlineError) {
                            console.error("Failed to set FCFS deadline:", deadlineError);
                        }
                    }
                } else {
                    console.log("No FCFS invitees to send");
                }
            } else if (inviteType === "manual") {
                // Manual - send to selected players only
                // Use ref for immediate access to avoid stale state
                const currentLoadedPlayers = allLoadedPlayersRef.current;
                console.log("Manual invite - selectedPlayers:", selectedPlayers);
                console.log("Manual invite - loaded players count:", currentLoadedPlayers.length);

                // Look in all loaded players (friends, onDeck, and group members)
                const invitees = selectedPlayers.map(id => {
                    const player = currentLoadedPlayers.find(p => p.id === id);
                    if (!player) {
                        console.log(`Player ${id} NOT FOUND in loaded players`);
                    }

                    const name = player ? `${player.firstName} ${player.lastName}`.trim() : undefined;

                    // Check if this is a real user ID (UUID format)
                    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

                    // Build invitee object - only include fields that have values
                    const invitee: { userId?: string; phone?: string; name?: string } = {};

                    // If the ID is a valid UUID and it's not just a roster entry ID, use it as userId
                    if (isValidUuid && player?.rosterId !== id) {
                        invitee.userId = id;
                    }

                    // Include phone if available
                    if (player?.phone) {
                        invitee.phone = player.phone;
                    }

                    // Include name
                    if (name) {
                        invitee.name = name;
                    }

                    return invitee;
                }).filter(inv => inv.userId || inv.phone); // Only include invitees with valid identifier

                console.log("Manual invitees to send:", invitees.length);

                if (invitees.length > 0) {
                    const inviteResponse = await inviteApi.createInvites(teeTimeId, invitees, "manual");
                    console.log("Manual invite response:", inviteResponse);
                } else {
                    console.log("No manual invitees - players may not have userId or phone");
                }
            }

            Alert.alert("Success", "Tee time created and invites sent!", [
                { text: "OK", onPress: () => navigation?.goBack() },
            ]);
        } catch (error: any) {
            console.error("Create tee time error:", error);
            // Try to get more detailed error info
            let errorMessage = "Failed to create tee time";
            if (error?.message) {
                errorMessage = error.message;
            }
            if (error?.errors) {
                // Validation errors
                const errorDetails = Object.entries(error.errors)
                    .map(([field, msg]) => `${field}: ${msg}`)
                    .join('\n');
                errorMessage = `Validation failed:\n${errorDetails}`;
            }
            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const togglePlayer = useCallback((id: string) => {
        setSelectedPlayers((prev) =>
            prev.includes(id)
                ? prev.filter((p) => p !== id)
                : prev.length < groupSize - 1
                    ? [...prev, id]
                    : prev
        );
    }, [groupSize]);

    // Handle selecting multiple players from a group
    const handleSelectGroupMembers = useCallback((memberIds: string[]) => {
        setSelectedPlayers((prev) => {
            const spotsLeft = groupSize - 1 - prev.length;
            const newIds = memberIds.filter(id => !prev.includes(id));
            const toAdd = newIds.slice(0, spotsLeft);
            return [...prev, ...toAdd];
        });
    }, [groupSize]);

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
        if (step === 1) return "Invite Details";
        if (step === 2) return "Select Invite Type";
        if (step === 3) {
            if (inviteType === "roster") return "Set Up Roster Invite";
            if (inviteType === "fcfs") return "First Come First Serve";
            return "Select Players";
        }
        return "Create Tee Time";
    };

    const getButtonText = () => {
        if (step === 3) return "Create Invite";
        return "Continue";
    };

    const canContinue = () => {
        if (step === 1) return selectedDate && location;
        if (step === 2) return true;
        if (step === 3) {
            if (inviteType === "roster") return orderedPlayers.length > 0;
            if (inviteType === "fcfs") {
                if (fcfsTargetType === "roster") return friends.length > 0;
                return selectedGroupId !== null;
            }
            if (inviteType === "manual") return selectedPlayers.length > 0;
        }
        return true;
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <Header title={getHeaderTitle()} onBack={handleBack} />

            {/* Content */}
            {step === 1 && (
                <InviteDetailsStep
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    location={location}
                    groupSize={groupSize}
                    onOpenDatePicker={() => setShowDatePicker(true)}
                    onOpenTimePicker={() => setShowTimePicker(true)}
                    onLocationChange={setLocation}
                    onGroupSizeChange={setGroupSize}
                />
            )}

            {step === 2 && (
                <InviteTypeStep
                    inviteType={inviteType}
                    onSelectType={setInviteType}
                />
            )}

            {step === 3 && inviteType === "roster" && (
                <RosterInviteStep
                    friends={friends}
                    responseWindow={responseWindow}
                    orderedPlayers={orderedPlayers}
                    onResponseWindowChange={setResponseWindow}
                    onReorderPlayers={setOrderedPlayers}
                />
            )}

            {step === 3 && inviteType === "fcfs" && (
                <FCFSInviteStep
                    friends={fcfsTargetType === "roster" ? friends : groupMembers}
                    groups={groups}
                    targetType={fcfsTargetType}
                    selectedGroupId={selectedGroupId}
                    onTargetTypeChange={setFcfsTargetType}
                    onGroupSelect={handleGroupSelect}
                    deadline={fcfsDeadline}
                    onDeadlineChange={setFcfsDeadline}
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
                        setAllLoadedPlayers(prev => {
                            const existingIds = new Set(prev.map(p => p.id));
                            const newPlayers: ExtendedFriend[] = members
                                .filter(m => !existingIds.has(m.id))
                                .map(m => ({
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
                onSelect={setSelectedTime}
                initialTime={selectedTime}
            />

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[
                        styles.continueBtn,
                        (loading || !canContinue()) && styles.continueBtnDisabled
                    ]}
                    onPress={handleContinue}
                    disabled={loading || !canContinue()}
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.continueBtnText}>{getButtonText()}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    footer: {
        padding: 20,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    continueBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
    },
    continueBtnDisabled: {
        opacity: 0.5,
    },
    continueBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "600",
    },
});
