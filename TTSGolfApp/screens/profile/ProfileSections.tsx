import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
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
        <View style={styles.photoSection}>
            <Text style={styles.sectionLabel}>Profile Photo</Text>
            <View style={styles.avatarWrapper}>
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
                        <Text style={styles.changePhotoText}>Change Photo</Text>
                    </TouchableOpacity>
                    <Text style={styles.photoHint}>JPG, PNG or GIF. Max size 5MB</Text>
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
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

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
                onChangeText={(text) => setEditedProfile({ ...editedProfile, phone: text })}
                keyboardType="phone-pad"
                isEditMode={isEditMode}
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
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Equipment</Text>

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
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Playing Preferences</Text>

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
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            {settingsItems.map((item, index) => (
                <TouchableOpacity key={index} style={styles.settingsItem}>
                    <View style={styles.settingsItemLeft}>
                        <item.icon size={20} color={COLORS.textSub} />
                        <Text style={styles.settingsItemText}>{item.label}</Text>
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
        <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
            <LogOut size={20} color={COLORS.red} />
            <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    photoSection: {
        backgroundColor: COLORS.white,
        paddingVertical: 32,
        paddingHorizontal: 20,
        alignItems: "center",
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textMain,
        alignSelf: "flex-start",
        marginBottom: 20,
    },
    avatarWrapper: {
        marginBottom: 16,
    },
    changePhotoText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
        marginBottom: 8,
    },
    photoHint: {
        fontSize: 13,
        color: COLORS.textSub,
    },
    section: {
        backgroundColor: COLORS.white,
        paddingVertical: 24,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 20,
    },
    settingsItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    settingsItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    settingsItemText: {
        fontSize: 16,
        color: COLORS.textMain,
    },
    signOutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor: COLORS.white,
        paddingVertical: 16,
        marginHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.red,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.red,
    },
});
