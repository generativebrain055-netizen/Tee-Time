import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, MoreHorizontal, MessageCircle, Calendar, Star, MapPin, Clock, Award, TrendingUp, Users } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { RosterPerson, PlayingHistory } from "./types";
import { rosterApi, MemberProfile } from "../../services/api";

interface PersonDetailProps {
    person: RosterPerson;
    onBack: () => void;
}

export default function PersonDetail({ person, onBack }: PersonDetailProps) {
    const [profile, setProfile] = useState<MemberProfile | null>(null);
    const [history, setHistory] = useState<PlayingHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'equipment'>('stats');

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

    const handleRemove = () => {
        Alert.alert("Remove from Roster", `Remove ${person.name} from your roster?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Remove",
                style: "destructive",
                onPress: async () => {
                    try {
                        await rosterApi.removeFromRoster(person.id);
                        onBack();
                    } catch (error) {
                        Alert.alert("Error", "Failed to remove from roster");
                    }
                },
            },
        ]);
    };

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
            <View style={styles.statsGrid}>
                <StatCard icon={Award} label="Handicap" value={profile?.stats.handicap} />
                <StatCard icon={Star} label="Social Rate" value={profile?.stats.socialRate?.toFixed(1)} color="#F59E0B" />
                <StatCard icon={TrendingUp} label="Rounds" value={profile?.stats.roundsPlayed} />
                <StatCard icon={Users} label="Played Together" value={profile?.stats.timesPlayedTogether} />
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
                    <Text style={styles.infoSectionTitle}>Memberships</Text>
                    <View style={styles.membershipBadge}>
                        <Text style={styles.membershipText}>{profile.membership}</Text>
                    </View>
                </View>
            )}
        </View>
    );

    const renderHistoryTab = () => (
        <View style={styles.tabContent}>
            {history.length === 0 ? (
                <View style={styles.emptyHistory}>
                    <Text style={styles.emptyText}>No playing history yet</Text>
                </View>
            ) : (
                history.map((h) => (
                    <View key={h.id} style={styles.historyItem}>
                        <View style={styles.historyLeft}>
                            <Text style={styles.historyDate}>
                                {h.teeDate ? new Date(h.teeDate).toLocaleDateString() : 'Unknown date'}
                            </Text>
                            <Text style={styles.historyCourse}>{h.courseName || 'Unknown course'}</Text>
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
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Driver</Text>
                        <Text style={styles.infoValue}>{profile.equipment.driver}</Text>
                    </View>
                )}
                {profile?.equipment?.irons && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Irons</Text>
                        <Text style={styles.infoValue}>{profile.equipment.irons}</Text>
                    </View>
                )}
                {profile?.equipment?.putter && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Putter</Text>
                        <Text style={styles.infoValue}>{profile.equipment.putter}</Text>
                    </View>
                )}
                {profile?.equipment?.ball && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Ball</Text>
                        <Text style={styles.infoValue}>{profile.equipment.ball}</Text>
                    </View>
                )}
                {!profile?.equipment?.driver && !profile?.equipment?.irons && (
                    <Text style={styles.emptyText}>No equipment info available</Text>
                )}
            </View>
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
                <TouchableOpacity style={styles.moreButton}>
                    <MoreHorizontal size={24} color="black" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.profileHeader}>
                        <Image
                            source={{ uri: profile?.contact.avatar || person.img }}
                            style={styles.avatar}
                        />
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
                        <TouchableOpacity style={styles.profileActionBtn}>
                            <MessageCircle size={24} color={COLORS.primary} />
                            <Text style={styles.profileActionText}>Message</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.profileActionBtn}>
                            <Calendar size={24} color={COLORS.primary} />
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

                    <View style={styles.dangerSection}>
                        <TouchableOpacity style={styles.dangerButton} onPress={handleRemove}>
                            <Text style={styles.dangerText}>Remove from Roster</Text>
                        </TouchableOpacity>
                    </View>
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
    },
    backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center", marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: "600", color: COLORS.textMain },
    moreButton: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    profileHeader: { alignItems: "center", paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.divider },
    profileName: { fontSize: 24, fontWeight: "bold", color: COLORS.textMain, marginTop: 16 },
    username: { fontSize: 14, color: COLORS.textSub, marginTop: 4 },
    groupBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
    groupBadgeText: { fontSize: 12, fontWeight: "600", color: COLORS.textMain },
    profileActions: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 32,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    profileActionBtn: { alignItems: "center", gap: 6 },
    profileActionText: { fontSize: 12, fontWeight: "500", color: COLORS.textMain },
    tabBar: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    tabButton: { flex: 1, paddingVertical: 14, alignItems: "center" },
    tabButtonActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
    tabButtonText: { fontSize: 14, fontWeight: "500", color: COLORS.textSub },
    tabButtonTextActive: { color: COLORS.primary },
    tabContent: { padding: 16 },
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
    infoSection: { marginBottom: 16 },
    infoSectionTitle: { fontSize: 14, fontWeight: "600", color: COLORS.textSub, marginBottom: 12 },
    infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
    infoIconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    infoLabel: { fontSize: 14, color: COLORS.textMain },
    infoValue: { fontSize: 14, color: COLORS.textSub },
    membershipBadge: { backgroundColor: "#E8F5E9", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: "flex-start" },
    membershipText: { fontSize: 14, fontWeight: "500", color: COLORS.primary },
    emptyHistory: { alignItems: "center", paddingVertical: 40 },
    emptyText: { fontSize: 14, color: COLORS.textSub },
    historyItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    historyLeft: { flex: 1 },
    historyDate: { fontSize: 14, fontWeight: "600", color: COLORS.textMain },
    historyCourse: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
    historyStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    historyPlayed: { backgroundColor: "#E8F5E9" },
    historyMissed: { backgroundColor: "#FEE2E2" },
    historyStatusText: { fontSize: 12, fontWeight: "500" },
    historyPlayedText: { color: COLORS.primary },
    historyMissedText: { color: "#EF4444" },
    dangerSection: { paddingHorizontal: 20, paddingVertical: 24 },
    dangerButton: { paddingVertical: 16, alignItems: "center" },
    dangerText: { fontSize: 14, fontWeight: "500", color: "#EF4444" },
});
