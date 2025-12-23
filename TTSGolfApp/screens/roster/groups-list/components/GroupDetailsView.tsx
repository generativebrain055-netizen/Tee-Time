import React, { memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { Friend, RosterGroup } from "../../../../services/api";
import { GROUP_COLORS } from "../types";
import { getInitials } from "../utils";

interface GroupDetailsViewProps {
    editingGroup: RosterGroup | null;
    newGroupName: string;
    newGroupColor: string;
    selectedMembers: string[];
    friends: Friend[];
    creating: boolean;
    onBack: () => void;
    onNameChange: (name: string) => void;
    onColorChange: (color: string) => void;
    onSubmit: () => void;
}

export const GroupDetailsView = memo(({
    editingGroup,
    newGroupName,
    newGroupColor,
    selectedMembers,
    friends,
    creating,
    onBack,
    onNameChange,
    onColorChange,
    onSubmit,
}: GroupDetailsViewProps) => (
    <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
    >
        <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onBack} style={styles.modalHeaderBtn}>
                <ArrowLeft size={24} color={COLORS.textMain} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingGroup ? "Edit Group" : "Group Details"}</Text>
            <View style={styles.modalHeaderBtn} />
        </View>

        <View style={styles.detailsContent}>
            <Text style={styles.inputLabel}>Group Name</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter group name"
                placeholderTextColor={COLORS.textSub}
                value={newGroupName}
                onChangeText={onNameChange}
                autoFocus
                blurOnSubmit={false}
                returnKeyType="done"
            />

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorPicker}>
                {GROUP_COLORS.map((color) => (
                    <TouchableOpacity
                        key={color}
                        style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            newGroupColor === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => onColorChange(color)}
                    />
                ))}
            </View>

            {!editingGroup && (
                <View style={styles.membersPreview}>
                    <Text style={styles.inputLabel}>Members ({selectedMembers.length})</Text>
                    <View style={styles.membersAvatars}>
                        {selectedMembers.slice(0, 5).map((id) => {
                            const friend = friends.find((f) => f.id === id);
                            if (!friend) return null;
                            return (
                                <View key={id} style={styles.previewAvatar}>
                                    {friend.avatar ? (
                                        <Image source={{ uri: friend.avatar }} style={styles.previewAvatarImage} />
                                    ) : (
                                        <View style={styles.previewAvatarPlaceholder}>
                                            <Text style={styles.previewAvatarText}>
                                                {getInitials(friend.firstName, friend.lastName)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                        {selectedMembers.length > 5 && (
                            <View style={styles.previewAvatarMore}>
                                <Text style={styles.previewAvatarMoreText}>+{selectedMembers.length - 5}</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            <TouchableOpacity
                style={[styles.createButton, creating && styles.createButtonDisabled]}
                onPress={onSubmit}
                disabled={creating}
            >
                {creating ? (
                    <ActivityIndicator color={COLORS.white} />
                ) : (
                    <Text style={styles.createButtonText}>
                        {editingGroup ? "Save Changes" : "Create Group"}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
));

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingTop: 50,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    modalHeaderBtn: {
        width: 60,
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    detailsContent: {
        flex: 1,
        padding: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textMain,
    },
    colorPicker: {
        flexDirection: "row",
        gap: 12,
    },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: COLORS.textMain,
    },
    membersPreview: {
        marginTop: 24,
    },
    membersAvatars: {
        flexDirection: "row",
        marginTop: 8,
    },
    previewAvatar: {
        marginRight: -8,
    },
    previewAvatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    previewAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    previewAvatarText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    previewAvatarMore: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    previewAvatarMoreText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.white,
    },
    createButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 32,
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.white,
    },
});
