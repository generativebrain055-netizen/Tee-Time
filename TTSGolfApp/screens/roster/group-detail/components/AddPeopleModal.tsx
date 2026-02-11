import React, { memo } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator } from "react-native";
import { X } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { Friend } from "../../../../services/api";
import { FriendItem } from "./FriendItem";

interface AddPeopleModalProps {
    visible: boolean;
    friends: Friend[];
    selectedFriends: string[];
    addingMembers: boolean;
    onClose: () => void;
    onToggleFriend: (id: string) => void;
    onAddMembers: () => void;
}

export const AddPeopleModal = memo(({
    visible,
    friends,
    selectedFriends,
    addingMembers,
    onClose,
    onToggleFriend,
    onAddMembers,
}: AddPeopleModalProps) => (
    <Modal visible={visible} animationType="slide">
        <View className="flex-1 pt-[50px]" style={{ backgroundColor: COLORS.white }}>
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                <TouchableOpacity className="w-20 items-center" onPress={onClose}>
                    <X size={24} color={COLORS.textMain} />
                </TouchableOpacity>
                <Text className="text-[17px] font-semibold" style={{ color: COLORS.textMain }}>Add People</Text>
                <TouchableOpacity
                    className="w-20 items-center"
                    onPress={onAddMembers}
                    disabled={selectedFriends.length === 0 || addingMembers}
                >
                    {addingMembers ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Text className="text-base font-semibold" style={{ color: selectedFriends.length === 0 ? COLORS.textSub : COLORS.primary }}>
                            Add ({selectedFriends.length})
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <View className="flex-1 px-4">
                {friends.length > 0 ? (
                    <FlatList
                        data={friends}
                        renderItem={({ item }) => (
                            <FriendItem
                                friend={item}
                                isSelected={selectedFriends.includes(item.id)}
                                onToggle={() => onToggleFriend(item.id)}
                            />
                        )}
                        keyExtractor={(item) => item.id}
                    />
                ) : (
                    <View className="items-center py-10">
                        <Text className="text-sm font-medium" style={{ color: COLORS.textSub }}>No friends available to add</Text>
                        <Text className="text-xs mt-1" style={{ color: COLORS.textSub }}>All your friends are already in this group</Text>
                    </View>
                )}
            </View>
        </View>
    </Modal>
));
