import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Users, Calendar, Plus } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { GROUPS_DATA } from "./mockData";

interface GroupsListProps {
    onGroupClick: (groupId: number) => void;
}

export default function GroupsList({ onGroupClick }: GroupsListProps) {
    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {GROUPS_DATA.map((group) => (
                    <TouchableOpacity
                        key={group.id}
                        style={styles.groupCard}
                        onPress={() => onGroupClick(group.id)}
                    >
                        <View style={styles.groupAvatar}>
                            {group.isIcon ? (
                                <View style={[styles.groupIconContainer, { backgroundColor: group.color }]}>
                                    <Text style={styles.groupInitials}>{group.initials}</Text>
                                </View>
                            ) : (
                                <Image source={{ uri: group.img }} style={styles.groupImage} />
                            )}
                        </View>
                        <View style={styles.groupInfo}>
                            <Text style={styles.groupName}>{group.name}</Text>
                            <View style={styles.groupMeta}>
                                <View style={styles.groupMetaRow}>
                                    <Users size={12} color={COLORS.textSub} />
                                    <Text style={styles.groupMetaText}>{group.members} members</Text>
                                </View>
                                <View style={styles.groupMetaRow}>
                                    <Calendar size={12} color={COLORS.textSub} />
                                    <Text style={styles.groupMetaText}>{group.next}</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={styles.fab}>
                <Plus size={32} color={COLORS.white} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    groupCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        marginVertical: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: "#F9FAFB",
    },
    groupAvatar: {
        paddingLeft: 12,
    },
    groupIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    groupInitials: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    groupImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    groupInfo: {
        flex: 1,
        marginLeft: 16,
        paddingVertical: 8,
    },
    groupName: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    groupMeta: {
        marginTop: 4,
        gap: 2,
    },
    groupMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    groupMetaText: {
        fontSize: 12,
        color: COLORS.textSub,
    },
    fab: {
        position: "absolute",
        bottom: 96,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
