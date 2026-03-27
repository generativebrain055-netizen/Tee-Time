/**
 * Group Profile Screen - Modular Implementation
 */
import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, ActionSheetIOS, Platform, Modal, TextInput } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../../../constants/colors";
import { RosterContact, rosterApi, friendApi, profileApi } from "../../../services/api";
import { useToast } from "../../../ui/feedback";
import { useAuthStore } from "../../../stores";
import { logger } from "../../../utils/logger";

import { useGroupProfile } from "./hooks/useGroupProfile";
import {
    GroupBanner,
    GroupInfo,
    GroupActions,
    GroupStats,
    TeeTimesList,
    MembersList,
    AddMembersModal,
    GroupOptionsSheet,
} from "./components";
import { getGroupInitials, calculateAvgHandicap } from "./utils";

interface Props {
    navigation: any;
    route: { params: { groupId: string } };
}

export default function GroupProfileScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const { groupId } = route.params;
    const toast = useToast();
    const [showOptionsSheet, setShowOptionsSheet] = useState(false);
    const [editNameModalVisible, setEditNameModalVisible] = useState(false);
    const [editNameValue, setEditNameValue] = useState("");
    const currentUserId = useAuthStore((s) => s.user?.id);

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
        handleLeaveGroup,
        handleGroupChat,
        handleSettings,
        updateGroup,
    } = useGroupProfile(groupId, navigation);

    const handleBack = useCallback(() => {
        if (typeof navigation?.canGoBack === "function" && navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        navigation?.navigate("Home");
    }, [navigation]);

    const handleOpenOptions = useCallback(() => {
        setShowOptionsSheet(true);
    }, []);

    const handleEditAvatar = useCallback(() => {
        const options = ["Take Photo", "Choose from Library", "Cancel"];
        const cancelIndex = 2;
        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: cancelIndex },
                async (buttonIndex) => {
                    if (buttonIndex === cancelIndex) return;
                    try {
                        if (buttonIndex === 0) {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== "granted") {
                                Alert.alert("Permission Required", "Camera access is needed to take a photo.");
                                return;
                            }
                                let result;
                                try {
                                    result = await ImagePicker.launchCameraAsync({
                                        mediaTypes: ["images"],
                                        allowsEditing: true,
                                        aspect: [1, 1],
                                        quality: 0.8,
                                        base64: true,
                                    });
                                } catch (camErr: any) {
                                    if (camErr?.message?.toLowerCase().includes("simulator") || camErr?.message?.toLowerCase().includes("camera not available")) {
                                        Alert.alert("Camera unavailable", "Camera is not available on this device or simulator. Use “Choose from Library” to pick a photo.");
                                    } else {
                                        throw camErr;
                                    }
                                    return;
                                }
                            if (result!.canceled || !result!.assets[0]) return;
                            const asset = result!.assets[0];
                            const dataUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null;
                            if (!dataUrl) {
                                Alert.alert("Image too large", "Could not process this photo. Try a smaller image.");
                                return;
                            }
                            const data = await profileApi.uploadAvatar(dataUrl);
                            if (data.success && data.avatarUrl) {
                                await updateGroup({ icon: data.avatarUrl, avatar: data.avatarUrl });
                                toast.show({ message: "Group photo updated", type: "success" });
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
                            const dataUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null;
                            if (!dataUrl) {
                                Alert.alert("Image too large", "Try a smaller image.");
                                return;
                            }
                            const data = await profileApi.uploadAvatar(dataUrl);
                            if (data.success && data.avatarUrl) {
                                await updateGroup({ icon: data.avatarUrl, avatar: data.avatarUrl });
                                toast.show({ message: "Group photo updated", type: "success" });
                            }
                        }
                    } catch (e: any) {
                        logger.error("[GroupProfile] Edit avatar error", e);
                        Alert.alert("Error", e?.message || "Failed to update group photo.");
                    }
                }
            );
        } else {
            Alert.alert("Edit group photo", undefined, [
                { text: "Take Photo", onPress: async () => {
                    try {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed."); return; }
                        try {
                            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });
                            if (result.canceled || !result.assets[0]) return;
                            const dataUrl = result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : null;
                            if (!dataUrl) { Alert.alert("Image too large", "Try a smaller image."); return; }
                            const data = await profileApi.uploadAvatar(dataUrl);
                            if (data.success && data.avatarUrl) { await updateGroup({ icon: data.avatarUrl, avatar: data.avatarUrl }); toast.show({ message: "Group photo updated", type: "success" }); }
                        } catch (camErr: any) {
                            if (camErr?.message?.toLowerCase().includes("simulator") || camErr?.message?.toLowerCase().includes("camera not available")) {
                                Alert.alert("Camera unavailable", "Camera is not available on this device or simulator. Use “Choose from Library” to pick a photo.");
                            } else {
                                throw camErr;
                            }
                        }
                    } catch (err: any) { Alert.alert("Error", err?.message || "Failed to update photo."); }
                }},
                { text: "Choose from Library", onPress: async () => {
                    try {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== "granted") { Alert.alert("Photo library access needed", "Allow access to choose a photo."); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });
                        if (result.canceled || !result.assets[0]) return;
                        const dataUrl = result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : null;
                        if (!dataUrl) { Alert.alert("Image too large", "Try a smaller image."); return; }
                        const data = await profileApi.uploadAvatar(dataUrl);
                        if (data.success && data.avatarUrl) { await updateGroup({ icon: data.avatarUrl, avatar: data.avatarUrl }); toast.show({ message: "Group photo updated", type: "success" }); }
                    } catch (err: any) { Alert.alert("Error", err?.message || "Failed to update photo."); }
                }},
                { text: "Cancel", style: "cancel" },
            ]);
        }
    }, [updateGroup, toast]);

    const handleEditName = useCallback(() => {
        setShowOptionsSheet(false);
        setEditNameValue(group?.name ?? "");
        setEditNameModalVisible(true);
    }, [group?.name]);

    const handleSaveEditName = useCallback(async () => {
        const name = editNameValue.trim();
        if (!name) return;
        setEditNameModalVisible(false);
        try {
            const res = await updateGroup({ name });
            if (res?.success) toast.show({ message: "Group name updated", type: "success" });
            else Alert.alert("Error", "Failed to update name.");
        } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to update name.");
        }
    }, [editNameValue, updateGroup, toast]);

    const handleLeaveGroupConfirm = useCallback(() => {
        Alert.alert(
            "Leave group?",
            "You'll no longer be part of this group. You can rejoin if you're invited again.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave group",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await rosterApi.leaveGroup(groupId);
                            if (res.success) {
                                toast.show({ message: "You've left the group", type: "success" });
                                handleBack();
                            } else {
                                Alert.alert("Error", "Failed to leave group");
                            }
                        } catch (e: any) {
                            Alert.alert("Error", e?.message || "Failed to leave group");
                        }
                    },
                },
            ]
        );
    }, [groupId, handleBack, toast]);

    const handleLeaveGroupFromSheet = useCallback(() => {
        setShowOptionsSheet(false);
        handleLeaveGroupConfirm();
    }, [handleLeaveGroupConfirm]);

    const handleAddTeeTime = useCallback(() => {
        navigation?.navigate("CreateTeeTime", { groupId });
    }, [navigation, groupId]);

    const handleMemberPress = useCallback((member: RosterContact) => {
        if (member.contact?.userId) {
            const c = member.contact;
            const name = c.name || "";
            const parts = name.trim().split(/\s+/);
            navigation?.navigate("FriendProfile", {
                userId: c.userId,
                user: {
                    id: c.userId,
                    firstName: parts[0] || "",
                    lastName: parts.slice(1).join(" ") || "",
                    avatar: c.avatar || undefined,
                    friendshipStatus: "friend" as const,
                },
            });
        }
    }, [navigation]);

    const handleRemoveMember = useCallback((member: RosterContact) => {
        const name = member.contact?.name || "this member";
        Alert.alert(
            "Remove from Group",
            `Remove ${name} from this group? They will still be in your roster.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Remove from group by setting group to null
                            await rosterApi.updateMemberGroup(member.id, null);
                            Alert.alert("Removed", `${name} has been removed from the group.`);
                            onRefresh();
                        } catch (error) {
                            Alert.alert("Error", "Failed to remove member from group");
                        }
                    },
                },
            ]
        );
    }, [onRefresh]);

    const handleBlockMember = useCallback((member: RosterContact) => {
        const name = member.contact?.name || "this user";
        const userId = member.contact?.userId;

        if (!userId) {
            Alert.alert(
                "Cannot Block",
                "This contact is not a registered user and cannot be blocked. You can remove them from the group instead."
            );
            return;
        }

        Alert.alert(
            "Block User",
            `Block ${name}? They will be removed from your roster and won't be able to:\n\n• Send you friend requests\n• Invite you to tee times\n• See your availability`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Block",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Remove from roster first
                            await rosterApi.removeFromRoster(member.id);
                            // Then block the user
                            await friendApi.blockUser(userId);
                            Alert.alert("Blocked", `${name} has been blocked.`);
                            onRefresh();
                        } catch (error) {
                            Alert.alert("Error", "Failed to block user");
                        }
                    },
                },
            ]
        );
    }, [onRefresh]);

    // Loading state
    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Error state
    if (!group) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <Text className="text-base text-gray-600 mb-4">Group not found</Text>
                <TouchableOpacity className="py-2 px-4" onPress={handleBack}>
                    <Text className="text-base font-medium" style={{ color: COLORS.primary }}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const groupInitials = getGroupInitials(group.name);
    const avgHandicap = calculateAvgHandicap(members);

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="light" />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <GroupBanner
                    initials={groupInitials}
                    name={group.name}
                    color={group.color}
                    avatarUri={group.avatar ?? group.icon}
                    topInset={insets.top}
                    isOwner={group.isOwner}
                    onBack={handleBack}
                    onSettings={handleOpenOptions}
                    onEditAvatar={handleEditAvatar}
                    onEditName={handleEditName}
                />

                <GroupActions
                    onChat={handleGroupChat}
                    onInvitePeople={openAddPeopleModal}
                />

                <GroupInfo
                    name={group.name}
                    description={group.description}
                    memberCount={members.length}
                />

                <GroupStats
                    memberCount={members.length}
                    avgHandicap={avgHandicap}
                    upcomingCount={upcomingTeeTimes.length}
                />

                <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 20 }}>
                    <TeeTimesList
                        teeTimes={upcomingTeeTimes}
                        onAddTeeTime={handleAddTeeTime}
                    />
                </View>

                <View style={{ height: 6, backgroundColor: "#F3F3F3", marginBottom: 20 }} />

                <MembersList
                    members={members}
                    currentUserId={currentUserId}
                    isOwner={group.isOwner}
                    onAddPress={openAddPeopleModal}
                    onMemberPress={handleMemberPress}
                    onRemoveMember={handleRemoveMember}
                    onBlockMember={handleBlockMember}
                />

                {/* Leave group option (Figma 1075-927: removing yourself) */}
                {!group.isOwner && (
                    <View className="px-5 mb-6">
                        <TouchableOpacity
                            className="py-3.5 px-4 rounded-md items-center"
                            style={{ backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FEE2E2" }}
                            onPress={handleLeaveGroupConfirm}
                        >
                            <Text className="text-[15px] font-semibold" style={{ color: "#DC2626" }}>
                                Leave Group
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View className="h-10" />
            </ScrollView>

            <GroupOptionsSheet
                visible={showOptionsSheet}
                onClose={() => setShowOptionsSheet(false)}
                onLeaveGroup={handleLeaveGroupFromSheet}
                onEditName={handleEditName}
                members={members}
                currentUserId={currentUserId}
                isOwner={group.isOwner}
            />

            <Modal visible={editNameModalVisible} transparent animationType="fade">
                <TouchableOpacity activeOpacity={1} onPress={() => setEditNameModalVisible(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20 }}>
                        <Text style={{ fontFamily: "Inter", fontWeight: "600", fontSize: 18, color: "#111827", marginBottom: 12 }}>Edit group name</Text>
                        <TextInput
                            value={editNameValue}
                            onChangeText={setEditNameValue}
                            placeholder="Group name"
                            placeholderTextColor="#9CA3AF"
                            style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: "#111827", marginBottom: 16 }}
                            autoFocus
                        />
                        <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
                            <TouchableOpacity onPress={() => setEditNameModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
                                <Text style={{ fontFamily: "Inter", fontWeight: "500", fontSize: 16, color: "#6B7280" }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveEditName} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
                                <Text style={{ fontFamily: "Inter", fontWeight: "600", fontSize: 16, color: COLORS.primary }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <AddMembersModal
                visible={showAddModal}
                friends={friends}
                selectedFriends={selectedFriends}
                loading={addingMembers}
                topInset={insets.top}
                memberUserIds={members.map(m => m.contact?.userId).filter(Boolean)}
                onClose={closeAddModal}
                onToggleFriend={toggleFriend}
                onAdd={handleAddMembers}
            />
        </View>
    );
}
