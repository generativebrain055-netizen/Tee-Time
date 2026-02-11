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
        className="flex-1 bg-white pt-[50px]"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
    >
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={onBack} className="w-15 items-center">
                <ArrowLeft size={24} color={COLORS.textMain} />
            </TouchableOpacity>
            <Text className="text-[17px] font-semibold text-gray-900">{editingGroup ? "Edit Group" : "Group Details"}</Text>
            <View className="w-15" />
        </View>

        <View className="flex-1 p-5">
            <Text className="text-sm font-semibold text-gray-500 mb-2 mt-4">Group Name</Text>
            <TextInput
                className="bg-gray-100 rounded-md px-4 py-3.5 text-base text-gray-900"
                placeholder="Enter group name"
                placeholderTextColor={COLORS.textSub}
                value={newGroupName}
                onChangeText={onNameChange}
                autoFocus
                blurOnSubmit={false}
                returnKeyType="done"
            />

            <Text className="text-sm font-semibold text-gray-500 mb-2 mt-4">Color</Text>
            <View className="flex-row gap-3">
                {GROUP_COLORS.map((color) => (
                    <TouchableOpacity
                        key={color}
                        className={`w-9 h-9 rounded-full ${newGroupColor === color ? 'border-[3px]' : ''}`}
                        style={{ backgroundColor: color, borderColor: newGroupColor === color ? COLORS.textMain : undefined }}
                        onPress={() => onColorChange(color)}
                    />
                ))}
            </View>

            {!editingGroup && (
                <View className="mt-6">
                    <Text className="text-sm font-semibold text-gray-500 mb-2 mt-4">Members ({selectedMembers.length})</Text>
                    <View className="flex-row mt-2">
                        {selectedMembers.slice(0, 5).map((id) => {
                            const friend = friends.find((f) => f.id === id);
                            if (!friend) return null;
                            return (
                                <View key={id} className="-mr-2">
                                    {friend.avatar ? (
                                        <Image source={{ uri: friend.avatar }} className="w-9 h-9 rounded-full border-2 border-white" />
                                    ) : (
                                        <View className="w-9 h-9 rounded-full bg-gray-200 justify-center items-center border-2 border-white">
                                            <Text className="text-xs font-semibold text-gray-500">
                                                {getInitials(friend.firstName, friend.lastName)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                        {selectedMembers.length > 5 && (
                            <View className="w-9 h-9 rounded-full justify-center items-center border-2 border-white" style={{ backgroundColor: COLORS.primary }}>
                                <Text className="text-xs font-semibold text-white">+{selectedMembers.length - 5}</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            <TouchableOpacity
                className={`rounded-md py-4 items-center mt-8 ${creating ? 'opacity-60' : ''}`}
                style={{ backgroundColor: COLORS.primary }}
                onPress={onSubmit}
                disabled={creating}
            >
                {creating ? (
                    <ActivityIndicator color={COLORS.white} />
                ) : (
                    <Text className="text-base font-semibold text-white">
                        {editingGroup ? "Save Changes" : "Create Group"}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
));
