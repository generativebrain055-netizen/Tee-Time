import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Users, Edit2, Trash2, Calendar } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { RosterGroup } from "../../../../services/api";

interface GroupCardProps {
    group: RosterGroup;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const GroupCard = memo(({ group, onPress, onEdit, onDelete }: GroupCardProps) => {
    /** API `memberCount` is total people including host (see backend totalGroupMemberCount). */
    const memberTotal =
        typeof group.memberCount === "number" && !Number.isNaN(group.memberCount)
            ? group.memberCount
            : 0;
    const upcomingCount = group.upcomingTeeTimeCount ?? 0;
    const avatarUri = group.avatar || group.icon;
    return (
    <TouchableOpacity className="flex-row items-center bg-white rounded-md p-4 my-2 border border-gray-100 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }} onPress={onPress}>
        {avatarUri ? (
            <Image
                source={{ uri: avatarUri }}
                className="w-12 h-12 rounded-full"
            />
        ) : (
            <View className="w-12 h-12 rounded-full justify-center items-center" style={{ backgroundColor: group.color + "20" }}>
                <Text className="text-base font-bold" style={{ color: group.color }}>
                    {group.name.substring(0, 2).toUpperCase()}
                </Text>
            </View>
        )}
        <View className="flex-1 ml-3.5">
            <View className="flex-row items-center gap-2">
                <Text className="text-base font-semibold text-gray-900">{group.name}</Text>
                {group.isOwner === false && (
                    <View className="bg-indigo-100 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-semibold text-indigo-600">Member</Text>
                    </View>
                )}
            </View>
            <View className="mt-1">
                <View className="flex-row items-center gap-1">
                    <Users size={12} color={COLORS.textSub} />
                    <Text className="text-xs text-gray-500">
                        {memberTotal} member{memberTotal !== 1 ? "s" : ""}
                        {group.hasPendingInvites ? " (pending)" : ""}
                    </Text>
                </View>
                {upcomingCount > 0 && (
                    <View className="flex-row items-center gap-1 mt-1">
                        <Calendar size={12} color={COLORS.textSub} />
                        <Text className="text-xs text-gray-500">
                            {upcomingCount} upcoming tee time{upcomingCount !== 1 ? "s" : ""}
                        </Text>
                    </View>
                )}
            </View>
        </View>
        {group.isOwner !== false && (
            <View className="flex-row gap-2">
                <TouchableOpacity className="w-8 h-8 rounded-md bg-gray-100 justify-center items-center" onPress={onEdit}>
                    <Edit2 size={16} color={COLORS.textSub} />
                </TouchableOpacity>
                <TouchableOpacity className="w-8 h-8 rounded-md bg-gray-100 justify-center items-center" onPress={onDelete}>
                    <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
            </View>
        )}
    </TouchableOpacity>
    );
});
