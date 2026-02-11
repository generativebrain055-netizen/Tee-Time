import React, { memo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { X, Check } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { Friend } from "../../../../services/api";
import { getInitials } from "../utils";

interface SelectMembersViewProps {
    friends: Friend[];
    selectedMembers: string[];
    onClose: () => void;
    onNext: () => void;
    onToggleMember: (id: string) => void;
}

export const SelectMembersView = memo(({
    friends,
    selectedMembers,
    onClose,
    onNext,
    onToggleMember,
}: SelectMembersViewProps) => (
    <View className="flex-1 bg-white pt-[50px]">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={onClose} className="w-15 items-center">
                <X size={24} color={COLORS.textMain} />
            </TouchableOpacity>
            <Text className="text-[17px] font-semibold text-gray-900">Select Members</Text>
            <TouchableOpacity
                onPress={onNext}
                className="w-15 items-center"
                disabled={selectedMembers.length === 0}
            >
                <Text className={`text-base font-semibold ${selectedMembers.length === 0 ? 'text-gray-500' : ''}`} style={selectedMembers.length > 0 ? { color: COLORS.primary } : undefined}>
                    Next
                </Text>
            </TouchableOpacity>
        </View>

        <Text className="text-sm text-gray-500 px-4 py-3">{selectedMembers.length} selected</Text>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            {friends.map((friend) => {
                const isSelected = selectedMembers.includes(friend.id);
                return (
                    <TouchableOpacity
                        key={friend.id}
                        className="flex-row items-center py-3 border-b border-gray-100"
                        onPress={() => onToggleMember(friend.id)}
                    >
                        <View className="mr-3">
                            {friend.avatar ? (
                                <Image source={{ uri: friend.avatar }} className="w-11 h-11 rounded-full" />
                            ) : (
                                <View className="w-11 h-11 rounded-full bg-gray-200 justify-center items-center">
                                    <Text className="text-sm font-semibold text-gray-500">
                                        {getInitials(friend.firstName, friend.lastName)}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text className="flex-1 text-[15px] font-medium text-gray-900">
                            {friend.firstName} {friend.lastName}
                        </Text>
                        <View className={`w-6 h-6 rounded-full border-2 justify-center items-center ${isSelected ? '' : 'border-gray-200'}`} style={isSelected ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : undefined}>
                            {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                        </View>
                    </TouchableOpacity>
                );
            })}
            {friends.length === 0 && (
                <View className="items-center py-10">
                    <Text className="text-base font-semibold text-gray-900">No friends yet</Text>
                    <Text className="text-sm text-gray-500 mt-1">Add friends from Availability first</Text>
                </View>
            )}
        </ScrollView>
    </View>
));
