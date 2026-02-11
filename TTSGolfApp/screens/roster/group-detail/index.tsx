import React, { useCallback, memo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
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
            <View className="flex-1 justify-center items-center" style={{ backgroundColor: COLORS.white }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: COLORS.white }}>
            <StatusBar style="dark" />
            <View className="flex-row justify-between items-center px-4 pt-12 pb-2" style={{ backgroundColor: COLORS.white }}>
                <TouchableOpacity className="w-10 h-10 justify-center items-center -ml-2" onPress={onBack}>
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <View className="w-10" />
                <TouchableOpacity className="w-8 h-8 justify-center items-center">
                    <MoreHorizontal size={24} color="black" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="items-center px-6 pb-6 border-b border-gray-100">
                    <View className="w-24 h-24 rounded-full mb-4 justify-center items-center" style={{ backgroundColor: (group?.color || "#5EBC68") + "30" }}>
                        <Text className="text-[32px] font-bold" style={{ color: group?.color || "#5EBC68" }}>
                            {group?.name ? getInitials(group.name) : "GR"}
                        </Text>
                    </View>
                    <Text className="text-xl font-bold mb-6" style={{ color: COLORS.textMain }}>{group?.name || "Group"}</Text>

                    <View className="flex-row gap-3 w-full justify-center">
                        <ActionButton icon={MessageCircle} label="Group chat" onPress={handleGroupChat} />
                        <ActionButton icon={Calendar} label="Add tee time" onPress={handleAddTeeTime} />
                        {group?.isOwner !== false && (
                            <ActionButton icon={UserPlus} label="Add people" onPress={openAddPeopleModal} />
                        )}
                    </View>
                </View>

                {/* Upcoming Tee Times Section */}
                <View className="px-5 pt-6">
                    <View className="flex-row justify-between items-baseline mb-3">
                        <Text className="text-base font-bold" style={{ color: COLORS.textMain }}>Upcoming tee time</Text>
                        <TouchableOpacity>
                            <Text className="text-xs font-medium" style={{ color: COLORS.primary }}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    {upcomingTeeTimes.length > 0 ? (
                        upcomingTeeTimes.map((teeTime) => <TeeTimeCard key={teeTime.id} teeTime={teeTime} />)
                    ) : (
                        <View className="items-center py-6 bg-gray-50 rounded-md">
                            <Text className="text-sm font-medium" style={{ color: COLORS.textSub }}>No upcoming tee times</Text>
                            <TouchableOpacity className="mt-3 px-4 py-2 rounded-md" style={{ backgroundColor: COLORS.primary }} onPress={handleAddTeeTime}>
                                <Text className="text-sm font-semibold" style={{ color: COLORS.white }}>Create one now</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* People Section */}
                <View className="px-5 pt-6">
                    <View className="flex-row justify-between items-baseline mb-3">
                        <Text className="text-base font-bold" style={{ color: COLORS.textMain }}>People ({members.length})</Text>
                        <TouchableOpacity>
                            <Text className="text-xs font-medium" style={{ color: COLORS.primary }}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    {group?.isOwner !== false && (
                        <TouchableOpacity className="flex-row items-center gap-3 py-3 mb-2" onPress={openAddPeopleModal}>
                            <View className="w-10 h-10 rounded-full border-[1.5px] border-dashed justify-center items-center" style={{ borderColor: COLORS.primary }}>
                                <UserPlus size={16} color={COLORS.primary} />
                            </View>
                            <Text className="text-sm font-medium" style={{ color: COLORS.primary }}>Add people to group</Text>
                        </TouchableOpacity>
                    )}

                    {members.map((member) => (
                        <MemberRow key={member.id} member={member} onMore={() => { }} />
                    ))}

                    {members.length === 0 && (
                        <View className="items-center py-6">
                            <Text className="text-sm font-medium" style={{ color: COLORS.textSub }}>No members yet</Text>
                            <Text className="text-xs mt-1" style={{ color: COLORS.textSub }}>Add friends to this group</Text>
                        </View>
                    )}
                </View>

                <View className="h-10" />
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
