import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, MoreHorizontal, MessageCircle, Calendar } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { Avatar } from "../../components/common";
import { RosterPerson } from "./types";

interface PersonDetailProps {
    person: RosterPerson;
    onBack: () => void;
}

export default function PersonDetail({ person, onBack }: PersonDetailProps) {
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
                <View style={styles.profileHeader}>
                    <Avatar uri={person.img} size={120} />
                    <Text style={styles.profileName}>{person.name}</Text>
                    <Text style={styles.profileSub}>{person.sub}</Text>
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

                <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Contact Info</Text>
                    {person.phone && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Phone</Text>
                            <Text style={styles.infoValue}>{person.phone}</Text>
                        </View>
                    )}
                    {person.email && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Email</Text>
                            <Text style={styles.infoValue}>{person.email}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Golf Stats</Text>
                    {person.handicap !== undefined && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Handicap</Text>
                            <Text style={styles.infoValue}>{person.handicap}</Text>
                        </View>
                    )}
                    {person.gamesPlayed !== undefined && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Games Played</Text>
                            <Text style={styles.infoValue}>{person.gamesPlayed}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Groups in Common</Text>
                    <View style={styles.commonGroupRow}>
                        <View style={styles.commonGroupIcon}>
                            <Text style={styles.commonGroupInitials}>SA</Text>
                        </View>
                        <Text style={styles.commonGroupName}>Saturday AM Crew</Text>
                    </View>
                </View>

                <View style={styles.dangerSection}>
                    <TouchableOpacity style={styles.dangerButton}>
                        <Text style={styles.dangerText}>Remove from Roster</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dangerButton}>
                        <Text style={styles.dangerText}>Block Contact</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
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
    profileHeader: {
        alignItems: "center",
        paddingVertical: 32,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    profileName: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginTop: 16,
    },
    profileSub: {
        fontSize: 14,
        color: COLORS.textSub,
        marginTop: 4,
    },
    profileActions: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    profileActionBtn: {
        alignItems: "center",
        gap: 8,
    },
    profileActionText: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.textMain,
    },
    infoSection: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    infoSectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: COLORS.textMain,
    },
    infoValue: {
        fontSize: 14,
        color: COLORS.textSub,
    },
    commonGroupRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
    },
    commonGroupIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#D1FAE5",
        justifyContent: "center",
        alignItems: "center",
    },
    commonGroupInitials: {
        fontSize: 12,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    commonGroupName: {
        fontSize: 14,
        color: COLORS.textMain,
    },
    dangerSection: {
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    dangerButton: {
        paddingVertical: 16,
        alignItems: "center",
    },
    dangerText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.red,
    },
});
