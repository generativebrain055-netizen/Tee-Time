import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
    ArrowLeft,
    MoreHorizontal,
    MessageCircle,
    Calendar,
    UserPlus,
    MapPin,
    CheckCircle2,
} from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { GROUP_MEMBERS } from "./mockData";

interface GroupDetailProps {
    groupId: string;
    onBack: () => void;
}

export default function GroupDetail({ groupId, onBack }: GroupDetailProps) {
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <View style={{ width: 40 }} />
                <TouchableOpacity style={styles.moreButton}>
                    <MoreHorizontal size={24} color="black" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.groupInfo}>
                    <Image
                        source={{
                            uri: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&q=80&w=150&h=150",
                        }}
                        style={styles.groupImage}
                    />
                    <Text style={styles.groupName}>Saturday AM Crew</Text>

                    <View style={styles.actionButtons}>
                        <ActionButton icon={MessageCircle} label="Group chat" />
                        <ActionButton icon={Calendar} label="Add tee time" />
                        <ActionButton icon={UserPlus} label="Add people" />
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming tee time</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.teeTimeCard}>
                        <View style={styles.teeTimeRow}>
                            <Calendar size={18} color={COLORS.textSub} />
                            <View style={styles.teeTimeInfo}>
                                <Text style={styles.teeTimeTitle}>Tuesday, 16th Dec 2025</Text>
                                <Text style={styles.teeTimeSub}>10:30 AM</Text>
                            </View>
                        </View>
                        <View style={styles.teeTimeRow}>
                            <MapPin size={18} color={COLORS.textSub} />
                            <View style={styles.teeTimeInfo}>
                                <Text style={styles.teeTimeTitle}>The Farms</Text>
                                <Text style={styles.teeTimeSub}>2750 Rancho Camino Rd., Rancho Santa Fe</Text>
                            </View>
                        </View>
                        <View style={styles.attendees}>
                            <View style={styles.avatarStack}>
                                {GROUP_MEMBERS.slice(0, 4).map((m, idx) => (
                                    <View key={m.id} style={[styles.stackedAvatar, { marginLeft: idx > 0 ? -8 : 0 }]}>
                                        <Image source={{ uri: m.img }} style={styles.smallAvatar} />
                                        <View style={styles.confirmedBadge}>
                                            <CheckCircle2 size={8} color="white" />
                                        </View>
                                    </View>
                                ))}
                            </View>
                            <Text style={styles.othersText}>+2 others</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>People</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.addPeopleButton}>
                        <View style={styles.addPeopleIcon}>
                            <UserPlus size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.addPeopleText}>Add people to group</Text>
                    </TouchableOpacity>
                    {GROUP_MEMBERS.map((member) => (
                        <View key={member.id} style={styles.memberRow}>
                            <View style={styles.memberLeft}>
                                <Image source={{ uri: member.img }} style={styles.avatar} />
                                <Text style={styles.memberName}>{member.name}</Text>
                            </View>
                            <TouchableOpacity>
                                <MoreHorizontal size={20} color={COLORS.textSub} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

function ActionButton({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <TouchableOpacity style={styles.actionButton}>
            <Icon size={20} color={COLORS.textMain} />
            <Text style={styles.actionButtonText}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 8,
        backgroundColor: COLORS.white,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: -8,
    },
    moreButton: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    groupInfo: {
        alignItems: "center",
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    groupImage: {
        width: 96,
        height: 96,
        borderRadius: 48,
        marginBottom: 16,
        borderWidth: 4,
        borderColor: COLORS.white,
    },
    groupName: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 24,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
        justifyContent: "center",
    },
    actionButton: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.secondary,
        borderRadius: 12,
        width: 96,
        height: 80,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textSub,
        textAlign: "center",
        paddingHorizontal: 4,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.primary,
    },
    teeTimeCard: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    teeTimeRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    teeTimeInfo: {
        flex: 1,
    },
    teeTimeTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    teeTimeSub: {
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 2,
    },
    attendees: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#F9FAFB",
    },
    avatarStack: {
        flexDirection: "row",
    },
    stackedAvatar: {
        position: "relative",
    },
    smallAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: COLORS.white,
        backgroundColor: COLORS.divider,
    },
    confirmedBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#10B981",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.white,
        width: 12,
        height: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    othersText: {
        fontSize: 12,
        color: COLORS.textSub,
        marginLeft: 8,
    },
    addPeopleButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
        marginBottom: 8,
    },
    addPeopleIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    addPeopleText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.primary,
    },
    memberRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
    },
    memberLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.divider,
    },
    memberName: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
});
