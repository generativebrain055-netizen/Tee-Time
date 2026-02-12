import React, { memo, useCallback, useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Modal, FlatList, ActivityIndicator, TextInput } from "react-native";
import { X, Check, Search } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { Friend, rosterApi } from "../../../../services/api";
import { getFriendInitials } from "../utils";
import { useDebounce } from "../../../../hooks";
import { logger } from "../../../../utils/logger";

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
    memberUserIds?: string[]; // User IDs already in the group
}

interface SearchUser {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatar?: string;
    username?: string;
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
    memberUserIds = [],
}: Props) => {
    const [searchText, setSearchText] = useState("");
    const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    
    const debouncedSearch = useDebounce(searchText, 300);
    
    // Filter friends based on search
    useEffect(() => {
        if (!debouncedSearch || debouncedSearch.trim().length < 2) {
            setShowSearchResults(false);
            setSearchUsers([]);
            return;
        }
        
        // Search users via API
        const performSearch = async () => {
            setSearching(true);
            try {
                const response = await rosterApi.searchUsers(debouncedSearch.trim());
                if (response.success && response.users) {
                    // Filter out users already in group and format
                    const filtered = (response.users as any[]).filter((user: any) => {
                        const userId = user.id;
                        return !memberUserIds.includes(userId);
                    }).map((user: any) => {
                        // Handle both name formats
                        let firstName = user.firstName || '';
                        let lastName = user.lastName || '';
                        if (!firstName && !lastName && user.name) {
                            const nameParts = user.name.trim().split(/\s+/);
                            firstName = nameParts[0] || '';
                            lastName = nameParts.slice(1).join(' ') || '';
                        }
                        return {
                            ...user,
                            firstName,
                            lastName,
                        };
                    });
                    setSearchUsers(filtered);
                    setShowSearchResults(true);
                }
            } catch (error) {
                logger.error("[AddMembersModal] Search error", error);
                setSearchUsers([]);
            } finally {
                setSearching(false);
            }
        };
        
        performSearch();
    }, [debouncedSearch, memberUserIds]);
    
    // Reset search when modal closes
    useEffect(() => {
        if (!visible) {
            setSearchText("");
            setSearchUsers([]);
            setShowSearchResults(false);
        }
    }, [visible]);
    
    const renderFriendItem = useCallback(
        ({ item }: { item: Friend }) => (
            <FriendItem
                friend={item}
                isSelected={selectedFriends.includes(item.id)}
                onToggle={() => onToggleFriend(item.id)}
            />
        ),
        [selectedFriends, onToggleFriend]
    );
    
    const renderSearchUserItem = useCallback(
        ({ item }: { item: SearchUser }) => {
            const name = item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim();
            const initials = getFriendInitials(item.firstName || '', item.lastName || '');
            const isSelected = selectedFriends.includes(item.id);
            
            return (
                <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100" onPress={() => onToggleFriend(item.id)}>
                    {item.avatar ? (
                        <Image source={{ uri: item.avatar }} className="w-11 h-11 rounded-full mr-3" />
                    ) : (
                        <View className="w-11 h-11 rounded-full bg-gray-200 justify-center items-center mr-3">
                            <Text className="text-sm font-semibold" style={{ color: COLORS.textSub }}>{initials}</Text>
                        </View>
                    )}
                    <Text className="flex-1 text-[15px] font-medium" style={{ color: COLORS.textMain }}>{name || 'Unknown'}</Text>
                    <View className="w-6 h-6 rounded-full justify-center items-center border-2" style={isSelected ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : { borderColor: '#E5E7EB' }}>
                        {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                    </View>
                </TouchableOpacity>
            );
        },
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

                {/* Search Bar */}
                <View className="px-4 py-3 border-b border-gray-100">
                    <View className="relative">
                        <View className="absolute left-3 top-1/2" style={{ transform: [{ translateY: -9 }], zIndex: 1 }}>
                            <Search size={18} color="#9CA3AF" strokeWidth={2} />
                        </View>
                        <TextInput
                            placeholder="Search friends or players..."
                            value={searchText}
                            onChangeText={setSearchText}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-10 text-[15px]"
                            style={{ color: COLORS.textMain }}
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                className="absolute right-3 top-1/2"
                                style={{ transform: [{ translateY: -9 }] }}
                                onPress={() => setSearchText("")}
                            >
                                <X size={18} color="#9CA3AF" strokeWidth={2} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View className="flex-1 px-4">
                    {showSearchResults ? (
                        // Show search results
                        searching ? (
                            <View className="items-center py-10">
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text className="text-sm font-medium mt-2" style={{ color: COLORS.textSub }}>Searching...</Text>
                            </View>
                        ) : searchUsers.length > 0 ? (
                            <FlatList
                                data={searchUsers}
                                renderItem={renderSearchUserItem}
                                keyExtractor={(item) => item.id}
                            />
                        ) : (
                            <View className="items-center py-10">
                                <Text className="text-sm font-medium" style={{ color: COLORS.textSub }}>No users found</Text>
                                <Text className="text-[13px] mt-1" style={{ color: COLORS.textSub }}>
                                    Try a different search term
                                </Text>
                            </View>
                        )
                    ) : (
                        // Show friends list
                        friends.length > 0 ? (
                            <FlatList
                                data={friends}
                                renderItem={renderFriendItem}
                                keyExtractor={(item) => item.id}
                            />
                        ) : (
                            <View className="items-center py-10">
                                <Text className="text-sm font-medium" style={{ color: COLORS.textSub }}>No friends available to add</Text>
                                <Text className="text-[13px] mt-1" style={{ color: COLORS.textSub }}>
                                    All your friends are already in this group. Try searching for other players.
                                </Text>
                            </View>
                        )
                    )}
                </View>
            </View>
        </Modal>
    );
});

export default AddMembersModal;
