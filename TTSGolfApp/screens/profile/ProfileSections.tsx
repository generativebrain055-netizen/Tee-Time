import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import {
    Settings,
    Bell,
    Lock,
    HelpCircle,
    LogOut,
    ChevronRight,
} from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { Avatar } from "../../components/common";
import InputField from "./InputField";
import { UserProfile } from "./types";

interface SectionProps {
    profile: UserProfile;
    editedProfile: UserProfile;
    isEditMode: boolean;
    setEditedProfile: (profile: UserProfile) => void;
}

// --- PROFILE PHOTO SECTION ---
export function ProfilePhotoSection({
    profile,
    isEditMode,
    onChangePhoto,
}: {
    profile: UserProfile;
    isEditMode: boolean;
    onChangePhoto: () => void;
}) {
    return (
        <View className="bg-white py-8 px-5 items-center mb-4">
            <Text className="text-base font-semibold text-gray-900 self-start mb-5">Profile Photo</Text>
            <View className="mb-4">
                <Avatar
                    uri={profile.avatar}
                    size={120}
                    showCameraButton={true}
                    onCameraPress={onChangePhoto}
                />
            </View>
            {isEditMode && (
                <>
                    <TouchableOpacity onPress={onChangePhoto}>
                        <Text className="text-base font-semibold text-blue-600 mb-2">Change Photo</Text>
                    </TouchableOpacity>
                    <Text className="text-[13px] text-gray-500">JPG, PNG or GIF. Max size 5MB</Text>
                </>
            )}
        </View>
    );
}

// --- BASIC INFO SECTION ---
export function BasicInfoSection({
    profile,
    editedProfile,
    isEditMode,
    setEditedProfile,
}: SectionProps) {
    const currentProfile = isEditMode ? editedProfile : profile;

    return (
        <View className="bg-white py-6 px-5 mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-5">Basic Information</Text>

            <InputField
                label="Full Name"
                value={`${currentProfile.firstName} ${currentProfile.lastName}`}
                onChangeText={(text) => {
                    const names = text.split(" ");
                    setEditedProfile({
                        ...editedProfile,
                        firstName: names[0] || "",
                        lastName: names.slice(1).join(" ") || "",
                    });
                }}
                isEditMode={isEditMode}
            />

            <InputField
                label="Email"
                value={currentProfile.email}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, email: text })}
                keyboardType="email-address"
                isEditMode={isEditMode}
            />

            <InputField
                label="Phone"
                value={currentProfile.phone}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, phone: text.replace(/\D/g, "") })}
                keyboardType="phone-pad"
                isEditMode={isEditMode}
                maxLength={15}
            />

            <InputField
                label="Location"
                value={currentProfile.location}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, location: text })}
                isEditMode={isEditMode}
            />

            <InputField
                label="Handicap"
                value={currentProfile.handicap}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, handicap: text })}
                keyboardType="numeric"
                isEditMode={isEditMode}
            />
        </View>
    );
}

// --- EQUIPMENT SECTION ---
export function EquipmentSection({
    profile,
    editedProfile,
    isEditMode,
    setEditedProfile,
}: SectionProps) {
    const currentProfile = isEditMode ? editedProfile : profile;

    return (
        <View className="bg-white py-6 px-5 mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-5">My Equipment</Text>

            <InputField
                label="Driver"
                value={currentProfile.equipment.driver}
                onChangeText={(text) =>
                    setEditedProfile({
                        ...editedProfile,
                        equipment: { ...editedProfile.equipment, driver: text },
                    })
                }
                isEditMode={isEditMode}
            />

            <InputField
                label="Irons"
                value={currentProfile.equipment.irons}
                onChangeText={(text) =>
                    setEditedProfile({
                        ...editedProfile,
                        equipment: { ...editedProfile.equipment, irons: text },
                    })
                }
                isEditMode={isEditMode}
            />

            <InputField
                label="Putters"
                value={currentProfile.equipment.putters}
                onChangeText={(text) =>
                    setEditedProfile({
                        ...editedProfile,
                        equipment: { ...editedProfile.equipment, putters: text },
                    })
                }
                isEditMode={isEditMode}
            />

            <InputField
                label="Balls"
                value={currentProfile.equipment.balls}
                onChangeText={(text) =>
                    setEditedProfile({
                        ...editedProfile,
                        equipment: { ...editedProfile.equipment, balls: text },
                    })
                }
                isEditMode={isEditMode}
            />
        </View>
    );
}

// --- PREFERENCES SECTION ---
export function PreferencesSection({
    profile,
    editedProfile,
    isEditMode,
    setEditedProfile,
}: SectionProps) {
    const currentProfile = isEditMode ? editedProfile : profile;

    return (
        <View className="bg-white py-6 px-5 mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-5">Playing Preferences</Text>

            <InputField
                label="Preferred Tee Time"
                value={currentProfile.preferences.preferredTeeTime}
                onChangeText={(text) =>
                    setEditedProfile({
                        ...editedProfile,
                        preferences: { ...editedProfile.preferences, preferredTeeTime: text },
                    })
                }
                isEditMode={isEditMode}
            />

            <InputField
                label="Walk or Ride"
                value={currentProfile.preferences.walkOrRide}
                onChangeText={(text) =>
                    setEditedProfile({
                        ...editedProfile,
                        preferences: { ...editedProfile.preferences, walkOrRide: text },
                    })
                }
                isEditMode={isEditMode}
            />

            <InputField
                label="Playing Partner Preference"
                value={currentProfile.preferences.playingPartner}
                onChangeText={(text) =>
                    setEditedProfile({
                        ...editedProfile,
                        preferences: { ...editedProfile.preferences, playingPartner: text },
                    })
                }
                isEditMode={isEditMode}
            />
        </View>
    );
}

// --- SETTINGS SECTION ---
export function SettingsSection() {
    const settingsItems = [
        { icon: Settings, label: "Account Settings" },
        { icon: Bell, label: "Notifications" },
        { icon: Lock, label: "Privacy & Security" },
        { icon: HelpCircle, label: "Help & Support" },
    ];

    return (
        <View className="bg-white py-6 px-5 mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-5">Settings</Text>
            {settingsItems.map((item, index) => (
                <TouchableOpacity key={index} className="flex-row justify-between items-center py-4 border-b border-gray-200">
                    <View className="flex-row items-center gap-3">
                        <item.icon size={20} color={COLORS.textSub} />
                        <Text className="text-base text-gray-900">{item.label}</Text>
                    </View>
                    <ChevronRight size={20} color={COLORS.textSub} />
                </TouchableOpacity>
            ))}
        </View>
    );
}

// --- SIGN OUT BUTTON ---
export function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
    return (
        <TouchableOpacity className="flex-row items-center justify-center gap-3 bg-white py-4 mx-5 rounded-md border border-red-500" onPress={onSignOut}>
            <LogOut size={20} color={COLORS.red} />
            <Text className="text-base font-semibold text-red-500">Sign Out</Text>
        </TouchableOpacity>
    );
}
