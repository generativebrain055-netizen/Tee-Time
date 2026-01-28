import React, { useCallback, memo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, MoreHorizontal, MessageCircle, Calendar, UserPlus } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";
import { useGroupDetail } from "./hooks/useGroupDetail";
import { ActionButton, AddPeopleModal, MemberRow, TeeTimeCard } from "./components";
import { getInitials } from "./utils";
import { GroupDetailProps } from "./types";

function GroupDetail({
    groupId,
    onBack,
    onNavigateToCreateTeeTime,
    onNavigateToChat
}: GroupDetailProps) {
    const {
        loading,
        refreshing,
        group,
        members,
        upcomingTeeTimes,
        showAddModal,
        friends,
        selectedFriends,
        addingMembers,
        onRefresh,
        openAddPeopleModal,
        closeAddModal,
        toggleFriend,
        handleAddMembers,
    } = useGroupDetail(groupId);

    const handleGroupChat = useCallback(() => {
        if (onNavigateToChat) {
            onNavigateToChat(groupId);
        } else {
            Alert.alert("Coming Soon", "Group chat feature is coming soon!");
        }
    }, [groupId, onNavigateToChat]);

    const handleAddTeeTime = useCallback(() => {
        if (onNavigateToCreateTeeTime) {
            onNavigateToCreateTeeTime(groupId);
        } else {
            Alert.alert("Coming Soon", "Navigate to create tee time with group pre-selected");
        }
    }, [groupId, onNavigateToCreateTeeTime]);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

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

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.groupInfo}>
                    <View style={[styles.groupImage, { backgroundColor: (group?.color || "#5DB075") + "30" }]}>
                        <Text style={[styles.groupImageText, { color: group?.color || "#5DB075" }]}>
                            {group?.name ? getInitials(group.name) : "GR"}
                        </Text>
                    </View>
                    <Text style={styles.groupName}>{group?.name || "Group"}</Text>

                    <View style={styles.actionButtons}>
                        <ActionButton icon={MessageCircle} label="Group chat" onPress={handleGroupChat} />
                        <ActionButton icon={Calendar} label="Add tee time" onPress={handleAddTeeTime} />
                        {group?.isOwner !== false && (
                            <ActionButton icon={UserPlus} label="Add people" onPress={openAddPeopleModal} />
                        )}
                    </View>
                </View>

                {/* Upcoming Tee Times Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming tee time</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    {upcomingTeeTimes.length > 0 ? (
                        upcomingTeeTimes.map((teeTime) => <TeeTimeCard key={teeTime.id} teeTime={teeTime} />)
                    ) : (
                        <View style={styles.emptyTeeTime}>
                            <Text style={styles.emptyText}>No upcoming tee times</Text>
                            <TouchableOpacity style={styles.createTeeTimeBtn} onPress={handleAddTeeTime}>
                                <Text style={styles.createTeeTimeBtnText}>Create one now</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* People Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>People ({members.length})</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    {group?.isOwner !== false && (
                        <TouchableOpacity style={styles.addPeopleButton} onPress={openAddPeopleModal}>
                            <View style={styles.addPeopleIcon}>
                                <UserPlus size={16} color={COLORS.primary} />
                            </View>
                            <Text style={styles.addPeopleText}>Add people to group</Text>
                        </TouchableOpacity>
                    )}

                    {members.map((member) => (
                        <MemberRow key={member.id} member={member} onMore={() => { }} />
                    ))}

                    {members.length === 0 && (
                        <View style={styles.emptyMembers}>
                            <Text style={styles.emptyText}>No members yet</Text>
                            <Text style={styles.emptySubtext}>Add friends to this group</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <AddPeopleModal
                visible={showAddModal}
                friends={friends}
                selectedFriends={selectedFriends}
                addingMembers={addingMembers}
                onClose={closeAddModal}
                onToggleFriend={toggleFriend}
                onAddMembers={handleAddMembers}
            />
        </View>
    );
}

export default memo(GroupDetail);


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
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
        justifyContent: "center",
        alignItems: "center",
    },
    groupImageText: {
        fontSize: 32,
        fontWeight: "bold",
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
    emptyTeeTime: {
        alignItems: "center",
        paddingVertical: 24,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
    },
    emptySubtext: {
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 4,
    },
    createTeeTimeBtn: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    createTeeTimeBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
    },
    addPeopleButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        marginBottom: 8,
    },
    addPeopleIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1.5,
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
    emptyMembers: {
        alignItems: "center",
        paddingVertical: 24,
    },
});
