import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, MoreHorizontal, MessageCircle, Calendar, Star, MapPin, Clock, Award, TrendingUp, Users, Ban, Trash2, ChevronRight } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { rosterApi, MemberProfile, friendApi } from "../../services/api";

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
}

export default function PersonDetail({ person, onBack, onRemoved }: PersonDetailProps) {
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
            if (historyRes.success) setHistory(historyRes.history);
        } catch (error) {
            console.error("Failed to load profile:", error);
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
                            await friendApi.blockUser(profile?.contact?.userId || person.id);
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

    const handleMessage = useCallback(() => {
        // Navigate to chat
        Alert.alert("Message", "Navigate to chat (to be implemented)");
    }, []);


    const StatCard = ({ icon: Icon, label, value, color = COLORS.primary }: any) => (
        <View style={styles.statCard}>
            <Icon size={20} color={color} />
            <Text style={styles.statValue}>{value ?? 'N/A'}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    const TabButton = ({ tab, label }: { tab: typeof activeTab; label: string }) => (
        <TouchableOpacity
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
        >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    const renderStatsTab = () => (
        <View style={styles.tabContent}>
            {/* Social Rate Highlight */}
            {profile?.stats.socialRate != null && (
                <View style={styles.socialRateCard}>
                    <View style={styles.socialRateHeader}>
                        <Star size={24} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.socialRateTitle}>Social Rate</Text>
                    </View>
                    <Text style={styles.socialRateValue}>{Number(profile.stats.socialRate).toFixed(1)}</Text>
                    <Text style={styles.socialRateDesc}>Reliability score based on attendance history</Text>
                </View>
            )}

            <View style={styles.statsGrid}>
                <StatCard icon={Award} label="Handicap" value={profile?.stats.handicap} />
                <StatCard icon={TrendingUp} label="Rounds" value={profile?.stats.roundsPlayed} />
                <StatCard icon={Users} label="Played Together" value={profile?.stats.timesPlayedTogether} />
                <StatCard icon={Calendar} label="Avg Score" value={profile?.stats.averageScore} />
            </View>

            <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Invite Stats</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Acceptance Rate</Text>
                    <Text style={styles.infoValue}>{profile?.stats.acceptanceRate || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Total Invites</Text>
                    <Text style={styles.infoValue}>{profile?.stats.totalInvites || 0}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Invites Accepted</Text>
                    <Text style={styles.infoValue}>{profile?.stats.invitesAccepted || 0}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Last Played Together</Text>
                    <Text style={styles.infoValue}>
                        {profile?.stats.lastPlayedTogether
                            ? new Date(profile.stats.lastPlayedTogether).toLocaleDateString()
                            : 'Never'}
                    </Text>
                </View>
            </View>

            <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Preferences</Text>
                {profile?.preferences.homeCourse && (
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconRow}>
                            <MapPin size={16} color={COLORS.textSub} />
                            <Text style={styles.infoLabel}>Home Course</Text>
                        </View>
                        <Text style={styles.infoValue}>{profile.preferences.homeCourse}</Text>
                    </View>
                )}
                {profile?.preferences.location && (
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconRow}>
                            <MapPin size={16} color={COLORS.textSub} />
                            <Text style={styles.infoLabel}>Location</Text>
                        </View>
                        <Text style={styles.infoValue}>{profile.preferences.location}</Text>
                    </View>
                )}
                {profile?.preferences.preferredTeeTime && (
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconRow}>
                            <Clock size={16} color={COLORS.textSub} />
                            <Text style={styles.infoLabel}>Preferred Time</Text>
                        </View>
                        <Text style={styles.infoValue}>{profile.preferences.preferredTeeTime}</Text>
                    </View>
                )}
                {profile?.preferences.walkOrRide && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Play Style</Text>
                        <Text style={styles.infoValue}>
                            {profile.preferences.walkOrRide === 'walk' ? 'Walker' :
                                profile.preferences.walkOrRide === 'ride' ? 'Rider' : 'Either'}
                        </Text>
                    </View>
                )}
            </View>

            {profile?.membership && (
                <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Club Memberships</Text>
                    <View style={styles.membershipBadge}>
                        <Text style={styles.membershipText}>{profile.membership}</Text>
                    </View>
                </View>
            )}

            {profile?.distanceToCourse && (
                <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Distance</Text>
                    <Text style={styles.distanceText}>{profile.distanceToCourse} miles from your home course</Text>
                </View>
            )}
        </View>
    );


    const renderHistoryTab = () => (
        <View style={styles.tabContent}>
            <Text style={styles.infoSectionTitle}>Playing History</Text>
            {history.length === 0 ? (
                <View style={styles.emptyHistory}>
                    <Calendar size={48} color={COLORS.textSub} strokeWidth={1} />
                    <Text style={styles.emptyText}>No playing history yet</Text>
                    <Text style={styles.emptySubtext}>Invite them to a tee time to start building history</Text>
                </View>
            ) : (
                history.map((h) => (
                    <View key={h.id} style={styles.historyItem}>
                        <View style={styles.historyLeft}>
                            <Text style={styles.historyDate}>
                                {h.teeDate ? new Date(h.teeDate).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                }) : 'Unknown date'}
                            </Text>
                            <Text style={styles.historyCourse}>{h.courseName || 'Unknown course'}</Text>
                            {h.teeTime && <Text style={styles.historyTime}>{h.teeTime}</Text>}
                        </View>
                        <View style={[styles.historyStatus, h.playedTogether ? styles.historyPlayed : styles.historyMissed]}>
                            <Text style={[styles.historyStatusText, h.playedTogether ? styles.historyPlayedText : styles.historyMissedText]}>
                                {h.playedTogether ? 'Played' : h.inviteStatus || 'Missed'}
                            </Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderEquipmentTab = () => (
        <View style={styles.tabContent}>
            <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Equipment</Text>
                {profile?.equipment?.driver && (
                    <View style={styles.equipmentRow}>
                        <Text style={styles.equipmentLabel}>Driver</Text>
                        <Text style={styles.equipmentValue}>{profile.equipment.driver}</Text>
                    </View>
                )}
                {profile?.equipment?.irons && (
                    <View style={styles.equipmentRow}>
                        <Text style={styles.equipmentLabel}>Irons</Text>
                        <Text style={styles.equipmentValue}>{profile.equipment.irons}</Text>
                    </View>
                )}
                {profile?.equipment?.putter && (
                    <View style={styles.equipmentRow}>
                        <Text style={styles.equipmentLabel}>Putter</Text>
                        <Text style={styles.equipmentValue}>{profile.equipment.putter}</Text>
                    </View>
                )}
                {profile?.equipment?.ball && (
                    <View style={styles.equipmentRow}>
                        <Text style={styles.equipmentLabel}>Ball</Text>
                        <Text style={styles.equipmentValue}>{profile.equipment.ball}</Text>
                    </View>
                )}
                {!profile?.equipment?.driver && !profile?.equipment?.irons && !profile?.equipment?.putter && !profile?.equipment?.ball && (
                    <View style={styles.emptyHistory}>
                        <Text style={styles.emptyText}>No equipment info available</Text>
                    </View>
                )}
            </View>

            {profile?.contact?.bio && (
                <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Bio</Text>
                    <Text style={styles.bioText}>{profile.contact.bio}</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity style={styles.moreButton} onPress={() => setShowMoreMenu(!showMoreMenu)}>
                    <MoreHorizontal size={24} color="black" />
                </TouchableOpacity>
            </View>

            {/* More Menu Dropdown */}
            {showMoreMenu && (
                <View style={styles.moreMenu}>
                    <TouchableOpacity style={styles.moreMenuItem} onPress={() => { setShowMoreMenu(false); handleRemove(); }}>
                        <Trash2 size={18} color="#EF4444" />
                        <Text style={styles.moreMenuTextDanger}>Remove from Roster</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.moreMenuItem} onPress={() => { setShowMoreMenu(false); handleBlock(); }}>
                        <Ban size={18} color="#EF4444" />
                        <Text style={styles.moreMenuTextDanger}>Block User</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.profileHeader}>
                        {profile?.contact.avatar || person.img ? (
                            <Image
                                source={{ uri: profile?.contact.avatar || person.img }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitials}>
                                    {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.profileName}>{profile?.contact.name || person.name}</Text>
                        {profile?.contact.username && (
                            <Text style={styles.username}>@{profile.contact.username}</Text>
                        )}
                        {profile?.groupName && (
                            <View style={[styles.groupBadge, { backgroundColor: profile.groupColor || '#E8F5E9' }]}>
                                <Text style={styles.groupBadgeText}>{profile.groupName}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.profileActions}>
                        <TouchableOpacity style={styles.profileActionBtn} onPress={handleMessage}>
                            <View style={styles.actionIconContainer}>
                                <MessageCircle size={22} color={COLORS.primary} />
                            </View>
                            <Text style={styles.profileActionText}>Message</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.profileActionBtn} onPress={handleInvite}>
                            <View style={styles.actionIconContainer}>
                                <Calendar size={22} color={COLORS.primary} />
                            </View>
                            <Text style={styles.profileActionText}>Invite</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabBar}>
                        <TabButton tab="stats" label="Stats" />
                        <TabButton tab="history" label="History" />
                        <TabButton tab="equipment" label="Equipment" />
                    </View>

                    {activeTab === 'stats' && renderStatsTab()}
                    {activeTab === 'history' && renderHistoryTab()}
                    {activeTab === 'equipment' && renderEquipmentTab()}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 8,
        backgroundColor: COLORS.white,
        zIndex: 10,
    },
    backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center", marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: "600", color: COLORS.textMain },
    moreButton: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
    moreMenu: {
        position: "absolute",
        top: 90,
        right: 16,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 100,
        minWidth: 180,
    },
    moreMenuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    moreMenuTextDanger: { fontSize: 15, color: "#EF4444", fontWeight: "500" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    profileHeader: { alignItems: "center", paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.divider },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: { fontSize: 32, fontWeight: "600", color: COLORS.textSub },
    profileName: { fontSize: 24, fontWeight: "bold", color: COLORS.textMain, marginTop: 16 },
    username: { fontSize: 14, color: COLORS.textSub, marginTop: 4 },
    groupBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
    groupBadgeText: { fontSize: 12, fontWeight: "600", color: COLORS.textMain },
    profileActions: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 40,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    profileActionBtn: { alignItems: "center", gap: 8 },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#E8F5E9",
        justifyContent: "center",
        alignItems: "center",
    },
    profileActionText: { fontSize: 12, fontWeight: "500", color: COLORS.textMain },
    tabBar: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    tabButton: { flex: 1, paddingVertical: 14, alignItems: "center" },
    tabButtonActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
    tabButtonText: { fontSize: 14, fontWeight: "500", color: COLORS.textSub },
    tabButtonTextActive: { color: COLORS.primary, fontWeight: "600" },
    tabContent: { padding: 16 },
    socialRateCard: {
        backgroundColor: "#FFFBEB",
        borderRadius: 16,
        padding: 20,
        alignItems: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#FEF3C7",
    },
    socialRateHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    socialRateTitle: { fontSize: 14, fontWeight: "600", color: "#92400E" },
    socialRateValue: { fontSize: 48, fontWeight: "bold", color: "#F59E0B" },
    socialRateDesc: { fontSize: 12, color: "#92400E", textAlign: "center", marginTop: 4 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
    statCard: {
        width: "47%",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        gap: 4,
    },
    statValue: { fontSize: 24, fontWeight: "bold", color: COLORS.textMain },
    statLabel: { fontSize: 12, color: COLORS.textSub },
    infoSection: { marginBottom: 20 },
    infoSectionTitle: { fontSize: 14, fontWeight: "600", color: COLORS.textSub, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
    infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    infoIconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    infoLabel: { fontSize: 14, color: COLORS.textMain },
    infoValue: { fontSize: 14, color: COLORS.textSub, fontWeight: "500" },
    membershipBadge: { backgroundColor: "#E8F5E9", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: "flex-start" },
    membershipText: { fontSize: 14, fontWeight: "500", color: COLORS.primary },
    distanceText: { fontSize: 14, color: COLORS.textMain },
    emptyHistory: { alignItems: "center", paddingVertical: 40 },
    emptyText: { fontSize: 15, fontWeight: "500", color: COLORS.textMain, marginTop: 12 },
    emptySubtext: { fontSize: 13, color: COLORS.textSub, marginTop: 4, textAlign: "center" },
    historyItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    historyLeft: { flex: 1 },
    historyDate: { fontSize: 14, fontWeight: "600", color: COLORS.textMain },
    historyCourse: { fontSize: 13, color: COLORS.textSub, marginTop: 2 },
    historyTime: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
    historyStatus: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    historyPlayed: { backgroundColor: "#E8F5E9" },
    historyMissed: { backgroundColor: "#FEE2E2" },
    historyStatusText: { fontSize: 12, fontWeight: "600" },
    historyPlayedText: { color: COLORS.primary },
    historyMissedText: { color: "#EF4444" },
    equipmentRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    equipmentLabel: { fontSize: 14, color: COLORS.textMain },
    equipmentValue: { fontSize: 14, color: COLORS.textSub, fontWeight: "500" },
    bioText: { fontSize: 14, color: COLORS.textMain, lineHeight: 22 },
});
