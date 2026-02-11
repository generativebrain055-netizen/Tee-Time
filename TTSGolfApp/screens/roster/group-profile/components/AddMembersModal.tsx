import React, { memo, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, Modal, FlatList, ActivityIndicator } from "react-native";
import { X, Check } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { Friend } from "../../../../services/api";
import { getFriendInitials } from "../utils";

interface FriendItemProps {
    friend: Friend;
    isSelected: boolean;
    onToggle: () => void;
}

const FriendItem = memo(({ friend, isSelected, onToggle }: FriendItemProps) => {
    const name = `${friend.firstName} ${friend.lastName}`;
    const initials = getFriendInitials(friend.firstName, friend.lastName);

    return (
        <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100" onPress={onToggle}>
            {friend.avatar ? (
                <Image source={{ uri: friend.avatar }} className="w-11 h-11 rounded-full mr-3" />
            ) : (
                <View className="w-11 h-11 rounded-full bg-gray-200 justify-center items-center mr-3">
                    <Text className="text-sm font-semibold" style={{ color: COLORS.textSub }}>{initials}</Text>
                </View>
            )}
            <Text className="flex-1 text-[15px] font-medium" style={{ color: COLORS.textMain }}>{name}</Text>
            <View className="w-6 h-6 rounded-full justify-center items-center border-2" style={isSelected ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : { borderColor: '#E5E7EB' }}>
                {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
            </View>
        </TouchableOpacity>
    );
});

interface Props {
    visible: boolean;
    friends: Friend[];
    selectedFriends: string[];
    loading: boolean;
    topInset: number;
    onClose: () => void;
    onToggleFriend: (id: string) => void;
    onAdd: () => void;
}

const AddMembersModal = memo(({
    visible,
    friends,
    selectedFriends,
    loading,
    topInset,
    onClose,
    onToggleFriend,
    onAdd,
}: Props) => {
    const renderItem = useCallback(
        ({ item }: { item: Friend }) => (
            <FriendItem
                friend={item}
                isSelected={selectedFriends.includes(item.id)}
                onToggle={() => onToggleFriend(item.id)}
            />
        ),
        [selectedFriends, onToggleFriend]
    );

    return (
        <Modal visible={visible} animationType="slide">
            <View className="flex-1" style={{ backgroundColor: COLORS.white, paddingTop: topInset }}>
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                    <TouchableOpacity className="w-20 items-center" onPress={onClose}>
                        <X size={24} color={COLORS.textMain} />
                    </TouchableOpacity>
                    <Text className="text-[17px] font-semibold" style={{ color: COLORS.textMain }}>Add People</Text>
                    <TouchableOpacity
                        className="w-20 items-center"
                        onPress={onAdd}
                        disabled={selectedFriends.length === 0 || loading}
                    >
                        {loading ? (
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
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id}
                        />
                    ) : (
                        <View className="items-center py-10">
                            <Text className="text-sm font-medium" style={{ color: COLORS.textSub }}>No friends available to add</Text>
                            <Text className="text-[13px] mt-1" style={{ color: COLORS.textSub }}>
                                All your friends are already in this group
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
});

export default AddMembersModal;
