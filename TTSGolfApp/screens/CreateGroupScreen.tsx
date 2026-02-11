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
import { X, Check } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { useColors, useTheme } from "../ui/theme";
import { friendApi, rosterApi } from "../services/api";

interface Friend {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
}

export default function CreateGroupScreen({ navigation }: any) {
    const colors = useColors();
    const theme = useTheme();
    const [groupName, setGroupName] = useState("");
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const response = await friendApi.getFriends();
            if (response.success && response.friends) {
                setFriends(response.friends);
            }
        } catch (error) {
            console.error("Failed to load friends:", error);
        } finally {
            setLoading(false);
        }
    };

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
            // Create the group
            const createResponse = await rosterApi.createGroup({
                name: groupName.trim(),
                description: "",
                color: "#3B82F6",
            });

            if (createResponse.success && createResponse.group) {
                const groupId = createResponse.group.id;

                // Add selected friends to the group by updating their group membership
                // First, we need to get the roster entries for these friends
                const rosterResponse = await rosterApi.getRoster();
                
                if (rosterResponse.success && rosterResponse.roster) {
                    const memberIds = Array.from(selectedFriends);
                    
                    // Find roster entries for selected friends and update their group
                    const updatePromises = rosterResponse.roster
                        .filter(member => member.contact?.userId && memberIds.includes(member.contact.userId))
                        .map(member => rosterApi.updateMemberGroup(member.id, groupId));
                    
                    await Promise.all(updatePromises);
                }

                Alert.alert("Success", "Group created successfully", [
                    {
                        text: "OK",
                        onPress: () => {
                            navigation?.navigate("GroupProfile", { groupId });
                        },
                    },
                ]);
            }
        } catch (error) {
            console.error("Failed to create group:", error);
            Alert.alert("Error", "Failed to create group. Please try again.");
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
                title="Create Group"
                onBack={() => navigation?.goBack()}
                rightComponent={
                    <TouchableOpacity
                        onPress={handleCreate}
                        disabled={creating || !groupName.trim() || selectedFriends.size === 0}
                        style={{ padding: 4 }}
                    >
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color:
                                    creating || !groupName.trim() || selectedFriends.size === 0
                                        ? "#9CA3AF"
                                        : colors.primary,
                            }}
                        >
                            {creating ? "Creating..." : "Create"}
                        </Text>
                    </TouchableOpacity>
                }
            />

            <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
                {/* Group Name Input */}
                <View
                    style={{
                        backgroundColor: "#FFFFFF",
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                        marginBottom: 8,
                    }}
                >
                    <Text
                        style={{
                            fontFamily: theme.fontFamily.medium,
                            fontSize: 13,
                            color: "#6B7280",
                            marginBottom: 8,
                        }}
                    >
                        GROUP NAME
                    </Text>
                    <TextInput
                        value={groupName}
                        onChangeText={setGroupName}
                        placeholder="Enter group name"
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

                {/* Members Section */}
                <View style={{ backgroundColor: "#FFFFFF", paddingTop: 16 }}>
                    <Text
                        style={{
                            fontFamily: theme.fontFamily.semiBold,
                            fontSize: 15,
                            color: "#111827",
                            paddingHorizontal: 20,
                            marginBottom: 12,
                        }}
                    >
                        Add Members ({selectedFriends.size})
                    </Text>

                    {loading ? (
                        <View style={{ paddingVertical: 40, alignItems: "center" }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
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
                                No friends available. Add friends from the Roster tab first.
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

                <View style={{ height: 100 }} />
            </ScrollView>
        </ScreenShell>
    );
}
