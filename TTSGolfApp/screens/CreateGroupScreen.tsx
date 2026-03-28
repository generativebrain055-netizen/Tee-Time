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
    ActionSheetIOS,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { X, Check, Search, Camera } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { useColors, useTheme } from "../ui/theme";
import { friendApi, rosterApi, profileApi } from "../services/api";
import { useAuthStore } from "../stores";
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

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const currentUser = useAuthStore((s) => s.user);
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
    const [groupAvatarUri, setGroupAvatarUri] = useState<string | null>(null);
    const [groupAvatarBase64, setGroupAvatarBase64] = useState<string | null>(null);

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

    const handlePickGroupAvatar = useCallback(() => {
        const options = ["Take Photo", "Choose from Library", "Cancel"];
        const cancelIndex = 2;
        const runPicker = async (buttonIndex: number) => {
            if (buttonIndex === cancelIndex) return;
            try {
                if (buttonIndex === 0) {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== "granted") {
                        Alert.alert("Permission Required", "Camera access is needed to take a photo.");
                        return;
                    }
                    try {
                        const result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ["images"],
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.8,
                        base64: true,
                    });
                    if (result.canceled || !result.assets[0]) return;
                    const asset = result.assets[0];
                    setGroupAvatarUri(asset.uri);
                    setGroupAvatarBase64(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null);
                    } catch (camErr: any) {
                        if (camErr?.message?.toLowerCase().includes("simulator") || camErr?.message?.toLowerCase().includes("camera not available")) {
                            Alert.alert("Camera unavailable", "Camera is not available on this device or simulator. Use “Choose from Library” to pick a photo.");
                        } else {
                            throw camErr;
                        }
                    }
                } else if (buttonIndex === 1) {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== "granted") {
                        Alert.alert("Photo library access needed", "Allow access to choose a photo.");
                        return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ["images"],
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.8,
                        base64: true,
                    });
                    if (result.canceled || !result.assets[0]) return;
                    const asset = result.assets[0];
                    setGroupAvatarUri(asset.uri);
                    setGroupAvatarBase64(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null);
                }
            } catch (e: any) {
                logger.error("[CreateGroupScreen] Pick avatar error", e);
                Alert.alert("Error", e?.message || "Failed to pick photo.");
            }
        };
        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: cancelIndex },
                (buttonIndex) => { runPicker(buttonIndex); }
            );
        } else {
            Alert.alert("Group photo", undefined, [
                { text: "Take Photo", onPress: () => runPicker(0) },
                { text: "Choose from Library", onPress: () => runPicker(1) },
                { text: "Cancel", style: "cancel" },
            ]);
        }
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
            let iconUrl: string | undefined;
            if (groupAvatarBase64) {
                try {
                    const uploadRes = await profileApi.uploadAvatar(groupAvatarBase64);
                    if (uploadRes.success && uploadRes.avatarUrl) iconUrl = uploadRes.avatarUrl;
                } catch (uploadErr: any) {
                    logger.error("[CreateGroupScreen] Avatar upload failed", uploadErr);
                    Alert.alert("Upload failed", uploadErr?.message || "Could not upload photo. Create group without photo?");
                    setCreating(false);
                    return;
                }
            }

            const selectedIds = Array.from(selectedFriends);
            const memberUserIds = Array.from(
                new Set(
                    selectedIds
                        .map((id) => {
                            const friend = friends.find((f) => f.id === id) as (Friend & { userId?: string }) | undefined;
                            if (friend?.userId) return friend.userId;
                            if (friend?.id) return friend.id;
                            const user = searchUsers.find((u) => u.id === id) as (SearchUser & { userId?: string }) | undefined;
                            if (user?.userId) return user.userId;
                            if (user?.id) return user.id;
                            return id;
                        })
                        .filter((id): id is string => !!id && UUID_REGEX.test(id) && id !== currentUser?.id)
                )
            );

            if (memberUserIds.length === 0) {
                Alert.alert("Invalid Members", "Please select valid members and try again.");
                setCreating(false);
                return;
            }

            const createResponse = await rosterApi.createGroup({
                name: groupName.trim(),
                description: "",
                color: groupColor,
                icon: iconUrl,
            });

            if (createResponse.success && createResponse.group) {
                const groupId = createResponse.group.id;
                logger.info("[CreateGroupScreen] Group created successfully", {
                    groupId,
                    selectedCount: selectedIds.length,
                    inviteCount: memberUserIds.length,
                });

                // Invite selected members (in-app + push). Do not fall back to addMembersToGroup:
                // direct add skips notifications and invitees never see Accept/Decline.
                let successDetail = "";
                try {
                    const inviteRes = await rosterApi.inviteToGroup(groupId, memberUserIds);
                    const sent = inviteRes?.sent ?? 0;
                    if (sent < memberUserIds.length) {
                        logger.warn("[CreateGroupScreen] Some group invites were not delivered", {
                            groupId,
                            expected: memberUserIds.length,
                            sent,
                        });
                        successDetail =
                            "\n\nSome invitations may not have been delivered. Invite again from the group or check notification settings.";
                    }
                } catch (inviteErr: any) {
                    logger.error("[CreateGroupScreen] inviteToGroup failed", inviteErr);
                    successDetail = `\n\nInvitations could not be sent: ${inviteErr?.message || "Unknown error"}. Open the group and invite members again.`;
                }

                Alert.alert("Success", `Group created successfully.${successDetail}`, [
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
                title={step === "players" ? "Invite members" : "Group details"}
                onBack={step === "details" ? () => setStep("players") : () => navigation?.goBack()}
            />

            <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1, backgroundColor: "#F3F4F6" }} contentContainerStyle={{ paddingBottom: step === "players" ? 102 : 24 }}>
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
                                        <View style={{ width: FIGMA.avatarList, height: FIGMA.avatarList, borderRadius: FIGMA.avatarList / 2, backgroundColor: FIGMA.primaryGreen, alignItems: "center", justifyContent: "center" }}>
                                            <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#FFFFFF" }}>{getInitials(friend.firstName, friend.lastName)}</Text>
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

                    </>
                ) : (
                    <>
                {/* Step 2: Group details - Figma 362x84 card: 58px avatar (tappable for camera/library), camera overlay, group name input */}
                <View style={{ marginHorizontal: 20, marginTop: 16, marginBottom: 24 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", minHeight: FIGMA.groupNameCardHeight, paddingVertical: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: FIGMA.inputRadius, paddingLeft: 17, paddingRight: 18 }}>
                        <TouchableOpacity onPress={handlePickGroupAvatar} style={{ position: "relative" }} activeOpacity={0.8}>
                            {groupAvatarUri ? (
                                <>
                                    <Image source={{ uri: groupAvatarUri }} style={{ width: FIGMA.groupAvatarSize, height: FIGMA.groupAvatarSize, borderRadius: FIGMA.groupAvatarSize / 2 }} resizeMode="cover" />
                                    <View style={{ position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF", borderWidth: 1.2, borderColor: "#E4E4E4", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4.8 }, shadowOpacity: 0.14, shadowRadius: 9.12, elevation: 4 }}>
                                        <Camera size={12} color="#6D6D6D" strokeWidth={1.4} />
                                    </View>
                                </>
                            ) : groupName.trim() ? (
                                <>
                                    <View style={{ width: FIGMA.groupAvatarSize, height: FIGMA.groupAvatarSize, borderRadius: FIGMA.groupAvatarSize / 2, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" }}>
                                        <Text style={{ fontFamily: theme.fontFamily.medium, fontSize: 18, lineHeight: 24, color: "#FFFFFF" }}>{getGroupInitials(groupName)}</Text>
                                    </View>
                                    <View style={{ position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF", borderWidth: 1.2, borderColor: "#E4E4E4", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4.8 }, shadowOpacity: 0.14, shadowRadius: 9.12, elevation: 4 }}>
                                        <Camera size={12} color="#6D6D6D" strokeWidth={1.4} />
                                    </View>
                                </>
                            ) : (
                                <View style={{ width: FIGMA.groupAvatarSize, height: FIGMA.groupAvatarSize, borderRadius: FIGMA.groupAvatarSize / 2, backgroundColor: FIGMA.groupAvatarEmpty, alignItems: "center", justifyContent: "center" }}>
                                    <Camera size={22} color="#0000FF" strokeWidth={1.8} />
                                </View>
                            )}
                        </TouchableOpacity>
                        <TextInput
                            value={groupName}
                            onChangeText={setGroupName}
                            placeholder="Group name"
                            placeholderTextColor={FIGMA.groupNameLabel}
                            includeFontPadding={Platform.OS === "android" ? false : undefined}
                            textAlignVertical={Platform.OS === "android" ? "center" : undefined}
                            style={{
                                flex: 1,
                                marginLeft: 12,
                                fontFamily: theme.fontFamily.medium,
                                fontSize: 18,
                                lineHeight: 24,
                                color: FIGMA.groupNameValue,
                                paddingVertical: Platform.OS === "ios" ? 10 : 8,
                            }}
                            maxLength={50}
                        />
                    </View>
                </View>

                {/* Group members (N) - 16px/600 #1F2937 */}
                <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, lineHeight: 28, color: "#1F2937", marginHorizontal: 20, marginBottom: 12 }}>
                    Group members ({(currentUser ? 1 : 0) + selectedPeopleList.length})
                </Text>

                {/* List: You first, then selected members - 44px avatar, 15px/500 name */}
                <View style={{ backgroundColor: "#FFFFFF", marginHorizontal: 20, borderRadius: FIGMA.inputRadius, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" }}>
                    {currentUser && (
                        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 20 }}>
                            {currentUser.avatar || currentUser.avatarUrl ? (
                                <Image source={{ uri: (currentUser.avatar || currentUser.avatarUrl) ?? "" }} style={{ width: FIGMA.avatarList, height: FIGMA.avatarList, borderRadius: FIGMA.avatarList / 2 }} />
                            ) : (
                                <View style={{ width: FIGMA.avatarList, height: FIGMA.avatarList, borderRadius: FIGMA.avatarList / 2, backgroundColor: "#E3E4E7", alignItems: "center", justifyContent: "center" }}>
                                    <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 14, color: "#6B7280" }}>{getInitials(currentUser.firstName, currentUser.lastName)}</Text>
                                </View>
                            )}
                            <Text style={{ marginLeft: 14, fontFamily: theme.fontFamily.medium, fontSize: 15, lineHeight: 22, color: "#000000" }}>You</Text>
                        </View>
                    )}
                    {selectedPeopleList.map((p) => (
                        <View key={p.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
                            {p.avatar ? (
                                <Image source={{ uri: p.avatar }} style={{ width: FIGMA.avatarList, height: FIGMA.avatarList, borderRadius: FIGMA.avatarList / 2 }} />
                            ) : (
                                <View style={{ width: FIGMA.avatarList, height: FIGMA.avatarList, borderRadius: FIGMA.avatarList / 2, backgroundColor: "#E3E4E7", alignItems: "center", justifyContent: "center" }}>
                                    <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 14, color: "#6B7280" }}>{getInitials(p.firstName, p.lastName)}</Text>
                                </View>
                            )}
                            <Text style={{ marginLeft: 14, fontFamily: theme.fontFamily.medium, fontSize: 15, lineHeight: 22, color: "#000000" }}>{`${p.firstName} ${p.lastName}`.trim() || "—"}</Text>
                        </View>
                    ))}
                </View>

                {/* We'll invite these members to join the group - 15px/400 centered */}
                <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 15, lineHeight: 22, color: "#000000", textAlign: "center", marginTop: 24, marginHorizontal: 20 }}>
                    We'll invite these members to join the group
                </Text>

                {/* Create group - full width 362px, 46px height, #5EBC68 */}
                <View style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 40 }}>
                    <TouchableOpacity
                        onPress={handleCreate}
                        disabled={creating || !groupName.trim() || selectedFriends.size === 0}
                        style={{ width: "100%", height: FIGMA.footerButtonHeight, borderRadius: FIGMA.buttonRadius, backgroundColor: (creating || !groupName.trim() || selectedFriends.size === 0) ? "#9CA3AF" : FIGMA.primaryGreen, alignItems: "center", justifyContent: "center", opacity: (creating || !groupName.trim() || selectedFriends.size === 0) ? 0.5 : 1 }}
                    >
                        <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, lineHeight: 22, color: "#FFFFFF" }}>
                            {creating ? "Creating..." : "Create group"}
                        </Text>
                    </TouchableOpacity>
                </View>
                    </>
                )}
            </ScrollView>

            {/* Step 1 fixed footer: Frame 2608800 - white bar, border-top #F3F3F3, shadow */}
            {step === "players" && (
                <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 102, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F3F3F3", paddingHorizontal: 20, paddingTop: 25, paddingBottom: 31, flexDirection: "row", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 7, elevation: 4 }}>
                    <TouchableOpacity
                        onPress={() => navigation?.goBack()}
                        style={{ flex: 1, height: FIGMA.footerButtonHeight, borderRadius: FIGMA.buttonRadius, backgroundColor: FIGMA.cancelBg, alignItems: "center", justifyContent: "center" }}
                    >
                        <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, lineHeight: 22, color: FIGMA.cancelText }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setStep("details")}
                        disabled={selectedFriends.size === 0}
                        style={{ flex: 1, height: FIGMA.footerButtonHeight, borderRadius: FIGMA.buttonRadius, backgroundColor: selectedFriends.size === 0 ? FIGMA.primaryGreen : FIGMA.primaryGreen, alignItems: "center", justifyContent: "center", opacity: selectedFriends.size === 0 ? 0.5 : 1 }}
                    >
                        <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, lineHeight: 22, color: "#FFFFFF" }}>
                            {selectedFriends.size > 0 ? `Next (${selectedFriends.size})` : "Next"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
            </View>
        </ScreenShell>
    );
}
