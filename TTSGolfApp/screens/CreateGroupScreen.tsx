import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
} from "react-native";
import { X, Check, Search } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { useColors, useTheme } from "../ui/theme";
import { friendApi, rosterApi } from "../services/api";
import { useDebounce } from "../hooks";
import { logger } from "../utils/logger";

interface Friend {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
}

interface SearchUser {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatar?: string;
}

const GROUP_COLORS = [
    "#5EBC68",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
];

export default function CreateGroupScreen({ navigation, route }: any) {
    const colors = useColors();
    const theme = useTheme();
    const initialParticipantIds = route?.params?.initialParticipantIds as string[] | undefined;
    const [groupName, setGroupName] = useState("");
    const [groupColor, setGroupColor] = useState(GROUP_COLORS[0]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    
    const debouncedSearch = useDebounce(searchText, 300);

    useEffect(() => {
        loadFriends();
    }, []);

    // Pre-select participants if coming from chat (Figma 1269-2563: Creating a group from TT/ad hoc group chat)
    useEffect(() => {
        if (initialParticipantIds && initialParticipantIds.length > 0 && friends.length > 0) {
            const validIds = initialParticipantIds.filter((id) => friends.some((f) => f.id === id));
            if (validIds.length > 0) {
                setSelectedFriends(new Set(validIds));
            }
        }
    }, [initialParticipantIds, friends]);

    const loadFriends = async () => {
        try {
            const response = await friendApi.getFriends();
            if (response.success && response.friends) {
                setFriends(response.friends);
            }
        } catch (error) {
            logger.error("[CreateGroupScreen] Failed to load friends", error);
        } finally {
            setLoading(false);
        }
    };
    
    // Search users when typing
    useEffect(() => {
        if (!debouncedSearch || debouncedSearch.trim().length < 2) {
            setShowSearchResults(false);
            setSearchUsers([]);
            return;
        }
        
        const performSearch = async () => {
            setSearching(true);
            try {
                const response = await rosterApi.searchUsers(debouncedSearch.trim());
                if (response.success && response.users) {
                    // Format users and filter out already selected friends
                    const formatted = (response.users as any[]).map((user: any) => {
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
                    setSearchUsers(formatted);
                    setShowSearchResults(true);
                }
            } catch (error) {
                logger.error("[CreateGroupScreen] Search error", error);
                setSearchUsers([]);
            } finally {
                setSearching(false);
            }
        };
        
        performSearch();
    }, [debouncedSearch]);

    const toggleFriend = useCallback((friendId: string) => {
        setSelectedFriends((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(friendId)) {
                newSet.delete(friendId);
            } else {
                newSet.add(friendId);
            }
            return newSet;
        });
    }, []);

    const handleCreate = async () => {
        if (!groupName.trim()) {
            Alert.alert("Group Name Required", "Please enter a name for your group");
            return;
        }

        if (selectedFriends.size === 0) {
            Alert.alert("Add Members", "Please select at least one member for your group");
            return;
        }

        setCreating(true);
        try {
            // Create the group with members using memberIds parameter
            const memberIds = Array.from(selectedFriends);
            const createResponse = await rosterApi.createGroup({
                name: groupName.trim(),
                description: "",
                color: groupColor,
                memberIds: memberIds,
            });

            if (createResponse.success && createResponse.group) {
                const groupId = createResponse.group.id;
                logger.info("[CreateGroupScreen] Group created successfully", { groupId, memberCount: memberIds.length });

                Alert.alert("Success", "Group created successfully", [
                    {
                        text: "OK",
                        onPress: () => {
                            navigation?.navigate("GroupProfile", { groupId });
                        },
                    },
                ]);
            }
        } catch (error: any) {
            logger.error("[CreateGroupScreen] Failed to create group", error);
            const errorMessage = error.message || "Failed to create group. Please try again.";
            Alert.alert("Error", errorMessage);
        } finally {
            setCreating(false);
        }
    };

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    return (
        <ScreenShell>
            <AppHeader
                title="Group details"
                onBack={() => navigation?.goBack()}
            />

            <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
                {/* Group Name Input */}
                <View
                    style={{
                        backgroundColor: "#FFFFFF",
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                        marginHorizontal: 20,
                        marginTop: 16,
                        marginBottom: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                    }}
                >
                    <TextInput
                        value={groupName}
                        onChangeText={setGroupName}
                        placeholder="Group name"
                        placeholderTextColor="#9CA3AF"
                        style={{
                            fontFamily: theme.fontFamily.regular,
                            fontSize: 16,
                            color: "#111827",
                            paddingVertical: 8,
                        }}
                        maxLength={50}
                    />
                </View>

                {/* Color Selection */}
                <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingVertical: 16, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
                    <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 15, color: "#1F2937", marginBottom: 12 }}>
                        Color
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                        {GROUP_COLORS.map((color) => (
                            <TouchableOpacity
                                key={color}
                                onPress={() => setGroupColor(color)}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: color,
                                    borderWidth: groupColor === color ? 3 : 0,
                                    borderColor: "#111827",
                                }}
                            />
                        ))}
                    </View>
                </View>

                {/* Search Bar */}
                <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingVertical: 16, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
                    <View style={{ position: "relative" }}>
                        <View style={{ position: "absolute", left: 12, top: "50%", transform: [{ translateY: -9 }], zIndex: 1 }}>
                            <Search size={18} color="#9CA3AF" strokeWidth={2} />
                        </View>
                        <TextInput
                            placeholder="Search friends or players..."
                            value={searchText}
                            onChangeText={setSearchText}
                            style={{
                                width: "100%",
                                backgroundColor: "#F9FAFB",
                                borderWidth: 1,
                                borderColor: "#E5E7EB",
                                borderRadius: 8,
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                paddingLeft: 40,
                                paddingRight: searchText.length > 0 ? 40 : 16,
                                fontSize: 15,
                                fontFamily: theme.fontFamily.regular,
                                color: "#111827",
                            }}
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                style={{ position: "absolute", right: 12, top: "50%", transform: [{ translateY: -9 }] }}
                                onPress={() => setSearchText("")}
                            >
                                <X size={18} color="#9CA3AF" strokeWidth={2} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Figma 1269-2434: Group members (N) section */}
                <View style={{ backgroundColor: "#FFFFFF", paddingTop: 16, marginTop: 8 }}>
                    <Text
                        style={{
                            fontFamily: theme.fontFamily.semiBold,
                            fontSize: 15,
                            color: "#1F2937",
                            paddingHorizontal: 20,
                            marginBottom: 4,
                        }}
                    >
                        Group members ({selectedFriends.size})
                    </Text>
                    {selectedFriends.size > 0 ? (
                        <Text
                            style={{
                                fontFamily: theme.fontFamily.regular,
                                fontSize: 14,
                                color: "#374151",
                                paddingHorizontal: 20,
                                marginBottom: 12,
                            }}
                        >
                            We'll invite these members to join the group
                        </Text>
                    ) : null}

                    {loading ? (
                        <View style={{ paddingVertical: 40, alignItems: "center" }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : showSearchResults ? (
                        // Show search results
                        searching ? (
                            <View style={{ paddingVertical: 40, alignItems: "center" }}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 14, color: "#9CA3AF", marginTop: 12 }}>
                                    Searching...
                                </Text>
                            </View>
                        ) : searchUsers.length > 0 ? (
                            searchUsers.map((user, index) => {
                                const isSelected = selectedFriends.has(user.id);
                                const name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
                                return (
                                    <TouchableOpacity
                                        key={user.id}
                                        onPress={() => toggleFriend(user.id)}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            paddingHorizontal: 20,
                                            paddingVertical: 12,
                                            borderTopWidth: index === 0 ? 0 : 1,
                                            borderTopColor: "#F3F4F6",
                                        }}
                                    >
                                        {user.avatar ? (
                                            <Image
                                                source={{ uri: user.avatar }}
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 24,
                                                }}
                                            />
                                        ) : (
                                            <View
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 24,
                                                    backgroundColor: "#E5E7EB",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontFamily: theme.fontFamily.semiBold,
                                                        fontSize: 16,
                                                        color: "#6B7280",
                                                    }}
                                                >
                                                    {getInitials(user.firstName || '', user.lastName || '')}
                                                </Text>
                                            </View>
                                        )}

                                        <Text
                                            style={{
                                                flex: 1,
                                                marginLeft: 12,
                                                fontFamily: theme.fontFamily.medium,
                                                fontSize: 16,
                                                color: "#111827",
                                            }}
                                        >
                                            {name || 'Unknown'}
                                        </Text>

                                        <View
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: 12,
                                                borderWidth: 2,
                                                borderColor: isSelected ? colors.primary : "#D1D5DB",
                                                backgroundColor: isSelected ? colors.primary : "#FFFFFF",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <View style={{ paddingVertical: 40, paddingHorizontal: 20, alignItems: "center" }}>
                                <Text
                                    style={{
                                        fontFamily: theme.fontFamily.regular,
                                        fontSize: 14,
                                        color: "#9CA3AF",
                                        textAlign: "center",
                                    }}
                                >
                                    No users found. Try a different search term.
                                </Text>
                            </View>
                        )
                    ) : friends.length === 0 ? (
                        <View style={{ paddingVertical: 40, paddingHorizontal: 20, alignItems: "center" }}>
                            <Text
                                style={{
                                    fontFamily: theme.fontFamily.regular,
                                    fontSize: 14,
                                    color: "#9CA3AF",
                                    textAlign: "center",
                                }}
                            >
                                No friends available. Add friends from the Roster tab first or search for players.
                            </Text>
                        </View>
                    ) : (
                        friends.map((friend, index) => {
                            const isSelected = selectedFriends.has(friend.id);
                            return (
                                <TouchableOpacity
                                    key={friend.id}
                                    onPress={() => toggleFriend(friend.id)}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        paddingHorizontal: 20,
                                        paddingVertical: 12,
                                        borderTopWidth: index === 0 ? 0 : 1,
                                        borderTopColor: "#F3F4F6",
                                    }}
                                >
                                    {friend.avatar ? (
                                        <Image
                                            source={{ uri: friend.avatar }}
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 24,
                                            }}
                                        />
                                    ) : (
                                        <View
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 24,
                                                backgroundColor: "#E5E7EB",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontFamily: theme.fontFamily.semiBold,
                                                    fontSize: 16,
                                                    color: "#6B7280",
                                                }}
                                            >
                                                {getInitials(friend.firstName, friend.lastName)}
                                            </Text>
                                        </View>
                                    )}

                                    <Text
                                        style={{
                                            flex: 1,
                                            marginLeft: 12,
                                            fontFamily: theme.fontFamily.medium,
                                            fontSize: 16,
                                            color: "#111827",
                                        }}
                                    >
                                        {friend.firstName} {friend.lastName}
                                    </Text>

                                    <View
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            borderWidth: 2,
                                            borderColor: isSelected ? colors.primary : "#D1D5DB",
                                            backgroundColor: isSelected ? colors.primary : "#FFFFFF",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                {/* Figma 1269-2434: Create group button (Primary Green, 8px radius) */}
                <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
                    <TouchableOpacity
                        onPress={handleCreate}
                        disabled={creating || !groupName.trim() || selectedFriends.size === 0}
                        style={{
                            backgroundColor:
                                creating || !groupName.trim() || selectedFriends.size === 0
                                    ? "#9CA3AF"
                                    : colors.primary ?? "#5EBC68",
                            borderRadius: 8,
                            paddingVertical: 16,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: theme.fontFamily.semiBold,
                                fontSize: 16,
                                color: "#FFFFFF",
                            }}
                        >
                            {creating ? "Creating..." : "Create group"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenShell>
    );
}
