import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, MoreHorizontal, MessageCircle, Calendar, Star, MapPin, Clock, Award, TrendingUp, Users, Ban, Trash2, ChevronRight } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { rosterApi, MemberProfile, friendApi, messagesApi } from "../../services/api";
import { logger } from "../../utils/logger";

interface RosterPerson {
    id: string;
    name: string;
    img?: string;
}

interface PlayingHistory {
    id: string;
    teeTimeId?: string;
    courseName?: string;
    teeDate?: string;
    teeTime?: string;
    inviteStatus?: string;
    playedTogether?: boolean;
    teeTimeStatus?: string;
    createdAt?: string;
}

interface PersonDetailProps {
    person: RosterPerson;
    onBack: () => void;
    onRemoved?: () => void;
    navigation?: any;
}

export default function PersonDetail({ person, onBack, onRemoved, navigation }: PersonDetailProps) {
    const [profile, setProfile] = useState<MemberProfile | null>(null);
    const [history, setHistory] = useState<PlayingHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'equipment'>('stats');
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    useEffect(() => {
        loadProfile();
    }, [person.id]);

    const loadProfile = async () => {
        try {
            const [profileRes, historyRes] = await Promise.all([
                rosterApi.getMemberProfile(person.id),
                rosterApi.getMemberHistory(person.id)
            ]);
            if (profileRes.success) setProfile(profileRes.profile);
            if (historyRes.success) setHistory((historyRes.history || []) as any);
        } catch (error) {
            logger.error("[PersonDetail] Failed to load profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = useCallback(() => {
        Alert.alert(
            "Remove from Roster",
            `Remove ${person.name} from your roster? They will no longer be auto-invited to your tee times.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await rosterApi.removeFromRoster(person.id);
                            onRemoved?.();
                            onBack();
                        } catch (error) {
                            Alert.alert("Error", "Failed to remove from roster");
                        }
                    },
                },
            ]
        );
    }, [person.id, person.name, onBack, onRemoved]);

    const handleBlock = useCallback(() => {
        const targetUserId = profile?.contact?.userId;

        if (!targetUserId) {
            Alert.alert(
                "Cannot Block",
                "This contact is not a registered user and cannot be blocked. You can remove them from your roster instead."
            );
            return;
        }

        Alert.alert(
            "Block User",
            `Block ${person.name}? They will be removed from your roster and won't be able to:\n\n• Send you friend requests\n• Invite you to tee times\n• See your availability`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Block",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Remove from roster first
                            await rosterApi.removeFromRoster(person.id);
                            // Then block the user
                            await friendApi.blockUser(targetUserId);
                            Alert.alert("Blocked", `${person.name} has been blocked.`);
                            onRemoved?.();
                            onBack();
                        } catch (error) {
                            Alert.alert("Error", "Failed to block user");
                        }
                    },
                },
            ]
        );
    }, [person.id, person.name, profile, onBack, onRemoved]);

    const handleInvite = useCallback(() => {
        // Navigate to create tee time with this person pre-selected
        Alert.alert("Invite", "Navigate to create tee time (to be implemented)");
    }, []);

    const handleMessage = useCallback(async () => {
        const userId = profile?.contact?.userId;
        if (!userId) {
            Alert.alert("Message", "This contact is not a registered user and cannot be messaged.");
            return;
        }
        try {
            const convRes = await messagesApi.getOrCreateConversation({ recipientId: userId });
            if (convRes.success && convRes.conversation && navigation) {
                navigation.navigate("ChatDetail", {
                    chatInfo: {
                        conversationId: convRes.conversation.id,
                        recipientId: userId,
                        id: userId,
                        name: person.name,
                        subtitle: "Direct message",
                        img: profile?.contact?.avatar,
                        isGroup: false,
                    },
                });
            }
        } catch (err) {
            logger.error("[PersonDetail] Failed to open conversation", err);
            Alert.alert("Error", "Could not open conversation.");
        }
    }, [profile?.contact?.userId, profile?.contact?.avatar, person.name, navigation]);


    const StatCard = ({ icon: Icon, label, value, color = COLORS.primary }: any) => (
        <View className="w-[47%] bg-gray-50 rounded-md p-4 items-center gap-1">
            <Icon size={20} color={color} />
            <Text className="text-2xl font-bold text-gray-900">{value ?? 'N/A'}</Text>
            <Text className="text-xs text-gray-500">{label}</Text>
        </View>
    );

    const TabButton = ({ tab, label }: { tab: typeof activeTab; label: string }) => (
        <TouchableOpacity
            className={`flex-1 py-3.5 items-center ${activeTab === tab ? 'border-b-2' : ''}`}
            style={activeTab === tab ? { borderBottomColor: COLORS.primary } : {}}
            onPress={() => setActiveTab(tab)}
        >
            <Text className={`text-sm font-medium ${activeTab === tab ? 'font-semibold' : 'text-gray-500'}`}
                  style={activeTab === tab ? { color: COLORS.primary } : {}}>{label}</Text>
        </TouchableOpacity>
    );

    const renderStatsTab = () => (
        <View className="p-4">
            {/* Social Rate Highlight */}
            {profile?.stats.socialRate != null && (
                <View className="bg-amber-50 rounded-md p-5 items-center mb-4 border border-amber-100">
                    <View className="flex-row items-center gap-2 mb-2">
                        <Star size={24} color="#F59E0B" fill="#F59E0B" />
                        <Text className="text-sm font-semibold text-amber-900">Social Rate</Text>
                    </View>
                    <Text className="text-5xl font-bold text-amber-500">{Number(profile.stats.socialRate).toFixed(1)}</Text>
                    <Text className="text-xs text-amber-900 text-center mt-1">Reliability score based on attendance history</Text>
                </View>
            )}

            <View className="flex-row flex-wrap gap-3 mb-4">
                <StatCard icon={Award} label="Handicap" value={profile?.stats.handicap} />
                <StatCard icon={TrendingUp} label="Rounds" value={profile?.stats.roundsPlayed} />
                <StatCard icon={Users} label="Played Together" value={profile?.stats.timesPlayedTogether} />
                <StatCard icon={Calendar} label="Avg Score" value={profile?.stats.averageScore} />
            </View>

            <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Invite Stats</Text>
                <View className="flex-row justify-between py-3 border-b border-gray-100">
                    <Text className="text-sm text-gray-900">Acceptance Rate</Text>
                    <Text className="text-sm text-gray-500 font-medium">{profile?.stats.acceptanceRate || 'N/A'}</Text>
                </View>
                <View className="flex-row justify-between py-3 border-b border-gray-100">
                    <Text className="text-sm text-gray-900">Total Invites</Text>
                    <Text className="text-sm text-gray-500 font-medium">{profile?.stats.totalInvites || 0}</Text>
                </View>
                <View className="flex-row justify-between py-3 border-b border-gray-100">
                    <Text className="text-sm text-gray-900">Invites Accepted</Text>
                    <Text className="text-sm text-gray-500 font-medium">{profile?.stats.invitesAccepted || 0}</Text>
                </View>
                <View className="flex-row justify-between py-3 border-b border-gray-100">
                    <Text className="text-sm text-gray-900">Last Played Together</Text>
                    <Text className="text-sm text-gray-500 font-medium">
                        {profile?.stats.lastPlayedTogether
                            ? new Date(profile.stats.lastPlayedTogether).toLocaleDateString()
                            : 'Never'}
                    </Text>
                </View>
            </View>

            <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Preferences</Text>
                {profile?.preferences.homeCourse && (
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <View className="flex-row items-center gap-2">
                            <MapPin size={16} color={COLORS.textSub} />
                            <Text className="text-sm text-gray-900">Home Course</Text>
                        </View>
                        <Text className="text-sm text-gray-500 font-medium">{profile.preferences.homeCourse}</Text>
                    </View>
                )}
                {profile?.preferences.location && (
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <View className="flex-row items-center gap-2">
                            <MapPin size={16} color={COLORS.textSub} />
                            <Text className="text-sm text-gray-900">Location</Text>
                        </View>
                        <Text className="text-sm text-gray-500 font-medium">{profile.preferences.location}</Text>
                    </View>
                )}
                {profile?.preferences.preferredTeeTime && (
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <View className="flex-row items-center gap-2">
                            <Clock size={16} color={COLORS.textSub} />
                            <Text className="text-sm text-gray-900">Preferred Time</Text>
                        </View>
                        <Text className="text-sm text-gray-500 font-medium">{profile.preferences.preferredTeeTime}</Text>
                    </View>
                )}
                {profile?.preferences.walkOrRide && (
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <Text className="text-sm text-gray-900">Play Style</Text>
                        <Text className="text-sm text-gray-500 font-medium">
                            {profile.preferences.walkOrRide === 'walk' ? 'Walker' :
                                profile.preferences.walkOrRide === 'ride' ? 'Rider' : 'Either'}
                        </Text>
                    </View>
                )}
            </View>

            {profile?.membership && (
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Club Memberships</Text>
                    <View className="bg-green-50 px-3 py-2 rounded-md self-start">
                        <Text className="text-sm font-medium" style={{ color: COLORS.primary }}>{profile.membership}</Text>
                    </View>
                </View>
            )}

            {profile?.distanceToCourse && (
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Distance</Text>
                    <Text className="text-sm text-gray-900">{profile.distanceToCourse} miles from your home course</Text>
                </View>
            )}
        </View>
    );


    const renderHistoryTab = () => (
        <View className="p-4">
            <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Playing History</Text>
            {history.length === 0 ? (
                <View className="items-center py-10">
                    <Calendar size={48} color={COLORS.textSub} strokeWidth={1} />
                    <Text className="text-[15px] font-medium text-gray-900 mt-3">No playing history yet</Text>
                    <Text className="text-[13px] text-gray-500 mt-1 text-center">Invite them to a tee time to start building history</Text>
                </View>
            ) : (
                history.map((h) => (
                    <View key={h.id} className="flex-row justify-between items-center py-3.5 border-b border-gray-100">
                        <View className="flex-1">
                            <Text className="text-sm font-semibold text-gray-900">
                                {h.teeDate ? new Date(h.teeDate).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                }) : 'Unknown date'}
                            </Text>
                            <Text className="text-[13px] text-gray-500 mt-0.5">{h.courseName || 'Unknown course'}</Text>
                            {h.teeTime && <Text className="text-xs text-gray-500 mt-0.5">{h.teeTime}</Text>}
                        </View>
                        <View className={`px-3 py-1.5 rounded-md ${h.playedTogether ? 'bg-green-50' : 'bg-red-50'}`}>
                            <Text className={`text-xs font-semibold ${h.playedTogether ? 'text-green-600' : 'text-red-500'}`}>
                                {h.playedTogether ? 'Played' : h.inviteStatus || 'Missed'}
                            </Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderEquipmentTab = () => (
        <View className="p-4">
            <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Equipment</Text>
                {profile?.equipment?.driver && (
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <Text className="text-sm text-gray-900">Driver</Text>
                        <Text className="text-sm text-gray-500 font-medium">{profile.equipment.driver}</Text>
                    </View>
                )}
                {profile?.equipment?.irons && (
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <Text className="text-sm text-gray-900">Irons</Text>
                        <Text className="text-sm text-gray-500 font-medium">{profile.equipment.irons}</Text>
                    </View>
                )}
                {profile?.equipment?.putter && (
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <Text className="text-sm text-gray-900">Putter</Text>
                        <Text className="text-sm text-gray-500 font-medium">{profile.equipment.putter}</Text>
                    </View>
                )}
                {profile?.equipment?.ball && (
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <Text className="text-sm text-gray-900">Ball</Text>
                        <Text className="text-sm text-gray-500 font-medium">{profile.equipment.ball}</Text>
                    </View>
                )}
                {!profile?.equipment?.driver && !profile?.equipment?.irons && !profile?.equipment?.putter && !profile?.equipment?.ball && (
                    <View className="items-center py-10">
                        <Text className="text-[15px] font-medium text-gray-900 mt-3">No equipment info available</Text>
                    </View>
                )}
            </View>

            {profile?.contact?.bio && (
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Bio</Text>
                    <Text className="text-sm text-gray-900 leading-[22px]">{profile.contact.bio}</Text>
                </View>
            )}
        </View>
    );

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <View className="flex-row justify-between items-center px-4 pt-12 pb-2 bg-white z-10">
                <TouchableOpacity className="w-10 h-10 justify-center items-center -ml-2" onPress={onBack}>
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900">Profile</Text>
                <TouchableOpacity className="w-8 h-8 justify-center items-center" onPress={() => setShowMoreMenu(!showMoreMenu)}>
                    <MoreHorizontal size={24} color="black" />
                </TouchableOpacity>
            </View>

            {/* More Menu Dropdown */}
            {showMoreMenu && (
                <View className="absolute top-[90px] right-4 bg-white rounded-md shadow-2xl z-[100] min-w-[180px]"
                      style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.15,
                          shadowRadius: 12,
                          elevation: 8
                      }}>
                    <TouchableOpacity className="flex-row items-center gap-3 px-4 py-3.5 border-b border-gray-100" onPress={() => { setShowMoreMenu(false); handleRemove(); }}>
                        <Trash2 size={18} color="#EF4444" />
                        <Text className="text-[15px] text-red-500 font-medium">Remove from Roster</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center gap-3 px-4 py-3.5 border-b border-gray-100" onPress={() => { setShowMoreMenu(false); handleBlock(); }}>
                        <Ban size={18} color="#EF4444" />
                        <Text className="text-[15px] text-red-500 font-medium">Block User</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="items-center py-6 border-b border-gray-100">
                        {profile?.contact.avatar || person.img ? (
                            <Image
                                source={{ uri: profile?.contact.avatar || person.img }}
                                className="w-[100px] h-[100px] rounded-full bg-gray-200"
                            />
                        ) : (
                            <View className="w-[100px] h-[100px] rounded-full bg-gray-200 justify-center items-center">
                                <Text className="text-[32px] font-semibold text-gray-500">
                                    {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </Text>
                            </View>
                        )}
                        <Text className="text-2xl font-bold text-gray-900 mt-4">{profile?.contact.name || person.name}</Text>
                        {profile?.contact.username && (
                            <Text className="text-sm text-gray-500 mt-1">@{profile.contact.username}</Text>
                        )}
                        {profile?.contact.phone && (
                            <Text className="text-sm text-gray-500 mt-1">{profile.contact.phone}</Text>
                        )}
                        {profile?.groupName && (
                            <View className="px-3 py-1 rounded-md mt-2" style={{ backgroundColor: profile.groupColor || '#E8F5E9' }}>
                                <Text className="text-xs font-semibold text-gray-900">{profile.groupName}</Text>
                            </View>
                        )}
                    </View>

                    <View className="flex-row justify-center gap-10 py-5 border-b border-gray-100">
                        <TouchableOpacity className="items-center gap-2" onPress={handleMessage}>
                            <View className="w-12 h-12 rounded-full bg-green-50 justify-center items-center">
                                <MessageCircle size={22} color={COLORS.primary} />
                            </View>
                            <Text className="text-xs font-medium text-gray-900">Message</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="items-center gap-2" onPress={handleInvite}>
                            <View className="w-12 h-12 rounded-full bg-green-50 justify-center items-center">
                                <Calendar size={22} color={COLORS.primary} />
                            </View>
                            <Text className="text-xs font-medium text-gray-900">Invite</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row border-b border-gray-100">
                        <TabButton tab="stats" label="Stats" />
                        <TabButton tab="history" label="History" />
                        <TabButton tab="equipment" label="Equipment" />
                    </View>

                    {activeTab === 'stats' && renderStatsTab()}
                    {activeTab === 'history' && renderHistoryTab()}
                    {activeTab === 'equipment' && renderEquipmentTab()}

                    <View className="h-10" />
                </ScrollView>
            )}
        </View>
    );
}
