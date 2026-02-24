import React, { useState, useCallback, useEffect, useMemo } from "react";
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

const FIGMA = {
    primaryGreen: "#5EBC68",
    cancelBg: "#F0F0F0",
    cancelText: "#565656",
    checkboxBorder: "#D3D3D3",
    nameColor: "#000000",
    sectionTitle: "#1F2937",
    groupNameLabel: "#848484",
    groupNameValue: "#2E2E2E",
    groupAvatarEmpty: "#ECECEC",
    searchBorder: "#E5E7EB",
    footerBorder: "#F3F3F3",
    inputRadius: 12,
    avatarList: 44,
    checkboxSize: 20,
    footerButtonHeight: 46,
    buttonRadius: 8,
    groupAvatarSize: 58,
    groupNameCardHeight: 84,
} as const;

export default function CreateGroupScreen({ navigation, route }: any) {
    const colors = useColors();
    const theme = useTheme();
    const initialParticipantIds = route?.params?.initialParticipantIds as string[] | undefined;
    const [step, setStep] = useState<"players" | "details">("players");
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

    const getGroupInitials = useCallback((name: string): string => {
        if (!name || !name.trim()) return "";
        return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    }, []);

    const selectedPeopleList = useMemo(() => {
        const list: { id: string; firstName: string; lastName: string; avatar?: string }[] = [];
        selectedFriends.forEach((id) => {
            const f = friends.find((x) => x.id === id);
            if (f) {
                list.push({ id, firstName: f.firstName, lastName: f.lastName, avatar: f.avatar });
                return;
            }
            const u = searchUsers.find((x) => x.id === id);
            if (u) list.push({ id, firstName: u.firstName ?? "", lastName: u.lastName ?? "", avatar: u.avatar });
        });
        return list;
    }, [selectedFriends, friends, searchUsers]);

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
                title={step === "players" ? "Invite Players" : "Group details"}
                onBack={step === "details" ? () => setStep("players") : () => navigation?.goBack()}
            />

            <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
                {step === "players" ? (
                    <>
                {/* Step 1: Search - Figma 48px height, "Search players" #A9A9A9 */}
                <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", height: 48, paddingHorizontal: 18, gap: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: FIGMA.searchBorder, borderRadius: FIGMA.inputRadius }}>
                        <Search size={18} color="#9E9E9E" strokeWidth={2} />
                        <TextInput
                            placeholder="Search players"
                            value={searchText}
                            onChangeText={setSearchText}
                            style={{ flex: 1, fontFamily: theme.fontFamily.medium, fontSize: 14, lineHeight: 28, color: "#000000", paddingVertical: 0 }}
                            placeholderTextColor="#A9A9A9"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchText("")} hitSlop={8}>
                                <X size={18} color="#9E9E9E" strokeWidth={2} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Horizontal selected members - 48px avatars, X to remove, 13px truncated names */}
                {selectedPeopleList.length > 0 ? (
                    <View style={{ marginBottom: 16 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                            {selectedPeopleList.map((p) => (
                                <TouchableOpacity key={p.id} onPress={() => toggleFriend(p.id)} style={{ alignItems: "center", width: 56, marginRight: 16 }}>
                                    <View style={{ position: "relative" }}>
                                        {p.avatar ? (
                                            <Image source={{ uri: p.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                                        ) : (
                                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E3E4E7", alignItems: "center", justifyContent: "center" }}>
                                                <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 14, color: "#6B7280" }}>{getInitials(p.firstName, p.lastName)}</Text>
                                            </View>
                                        )}
                                        <View style={{ position: "absolute", right: -4, top: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E4E4", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 7.6, elevation: 4 }}>
                                            <X size={10} color="#2F2F2F" strokeWidth={2} />
                                        </View>
                                    </View>
                                    <Text style={{ fontFamily: theme.fontFamily.medium, fontSize: 13, lineHeight: 22, color: "#000000", marginTop: 4 }} numberOfLines={1}>
                                        {`${p.firstName} ${p.lastName}`.trim() || "—"}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                ) : null}

                {/* Your players - section title and list */}
                <View style={{ backgroundColor: "#FFFFFF", paddingTop: 8, paddingBottom: 16 }}>
                    <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, lineHeight: 28, color: FIGMA.sectionTitle, paddingHorizontal: 20, marginBottom: 4 }}>
                        Your players
                    </Text>

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
                                        <Image source={{ uri: friend.avatar }} style={{ width: FIGMA.avatarList, height: FIGMA.avatarList, borderRadius: FIGMA.avatarList / 2 }} />
                                    ) : (
                                        <View style={{ width: FIGMA.avatarList, height: FIGMA.avatarList, borderRadius: FIGMA.avatarList / 2, backgroundColor: "#E3E4E7", alignItems: "center", justifyContent: "center" }}>
                                            <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#6B7280" }}>{getInitials(friend.firstName, friend.lastName)}</Text>
                                        </View>
                                    )}
                                    <Text style={{ flex: 1, marginLeft: 12, fontFamily: theme.fontFamily.medium, fontSize: 15, lineHeight: 22, color: FIGMA.nameColor }}>{friend.firstName} {friend.lastName}</Text>
                                    <View style={{ width: FIGMA.checkboxSize, height: FIGMA.checkboxSize, borderRadius: FIGMA.checkboxSize / 2, borderWidth: 1, borderColor: isSelected ? FIGMA.primaryGreen : FIGMA.checkboxBorder, backgroundColor: isSelected ? FIGMA.primaryGreen : "transparent", alignItems: "center", justifyContent: "center" }}>
                                        {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={2.5} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                {/* Figma: Cancel #F0F0F0 #565656, Next #5EBC68 46px height, "Next (N)" when N>0 */}
                <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 12 }}>
                    <TouchableOpacity
                        onPress={() => navigation?.goBack()}
                        style={{ flex: 1, height: FIGMA.footerButtonHeight, borderRadius: FIGMA.buttonRadius, backgroundColor: FIGMA.cancelBg, alignItems: "center", justifyContent: "center" }}
                    >
                        <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, lineHeight: 22, color: FIGMA.cancelText }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setStep("details")}
                        disabled={selectedFriends.size === 0}
                        style={{ flex: 1, height: FIGMA.footerButtonHeight, borderRadius: FIGMA.buttonRadius, backgroundColor: selectedFriends.size === 0 ? "#9CA3AF" : FIGMA.primaryGreen, alignItems: "center", justifyContent: "center", opacity: selectedFriends.size === 0 ? 0.5 : 1 }}
                    >
                        <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, lineHeight: 22, color: "#FFFFFF" }}>
                            {selectedFriends.size > 0 ? `Next (${selectedFriends.size})` : "Next"}
                        </Text>
                    </TouchableOpacity>
                </View>
                    </>
                ) : (
                    <>
                {/* Step 2: Group details - name and color */}
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

                <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
                    <TouchableOpacity
                        onPress={handleCreate}
                        disabled={creating || !groupName.trim() || selectedFriends.size === 0}
                        style={{
                            backgroundColor: (creating || !groupName.trim() || selectedFriends.size === 0) ? "#9CA3AF" : (colors.primary ?? "#5EBC68"),
                            borderRadius: 8,
                            paddingVertical: 16,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#FFFFFF" }}>
                            {creating ? "Creating..." : "Create group"}
                        </Text>
                    </TouchableOpacity>
                </View>
                    </>
                )}
            </ScrollView>
        </ScreenShell>
    );
}
