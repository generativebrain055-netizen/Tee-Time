import React, { useState, useCallback, memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronDown } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { Avatar, Header } from "../../components/common";
import { profileApi } from "../../services/api";

interface Props {
    navigation: any;
    route: { params: { profile?: any } };
}

const TEE_TIME_OPTIONS = [
    { label: "Morning (6-9 AM)", value: "morning" },
    { label: "Midday (9 AM-12 PM)", value: "midday" },
    { label: "Afternoon (12-4 PM)", value: "afternoon" },
    { label: "Evening (4-7 PM)", value: "evening" },
    { label: "Any time", value: "any" },
];

const WALK_RIDE_OPTIONS = [
    { label: "Walk", value: "walk" },
    { label: "Ride", value: "ride" },
    { label: "Either", value: "either" },
];

const GROUP_SIZE_OPTIONS = [
    { label: "Solo (1 player)", value: "solo" },
    { label: "Twosome (2 players)", value: "twosome" },
    { label: "Threesome (3 players)", value: "threesome" },
    { label: "Foursome (4 players)", value: "foursome" },
    { label: "Any group size", value: "any" },
];

// Memoized input field
const InputField = memo(({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    multiline = false,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
    multiline?: boolean;
}) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.placeholder}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
        />
    </View>
));

// Memoized dropdown field
const DropdownField = memo(({
    label,
    value,
    options,
    onSelect,
}: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onSelect: (value: string) => void;
}) => {
    const [showOptions, setShowOptions] = useState(false);
    const selectedOption = options.find(o => o.value === value);

    return (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowOptions(!showOptions)}
            >
                <Text style={styles.dropdownText}>
                    {selectedOption?.label || "Select..."}
                </Text>
                <ChevronDown size={20} color={COLORS.textSub} />
            </TouchableOpacity>
            {showOptions && (
                <View style={styles.optionsList}>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.optionItem,
                                value === option.value && styles.optionItemSelected,
                            ]}
                            onPress={() => {
                                onSelect(option.value);
                                setShowOptions(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    value === option.value && styles.optionTextSelected,
                                ]}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
});

export default function EditProfileScreen({ navigation, route }: Props) {
    const initialProfile = route.params?.profile || {};

    const [saving, setSaving] = useState(false);
    const [firstName, setFirstName] = useState(initialProfile.firstName || "");
    const [lastName, setLastName] = useState(initialProfile.lastName || "");
    const [email, setEmail] = useState(initialProfile.email || "");
    const [location, setLocation] = useState(initialProfile.location || "");
    const [handicap, setHandicap] = useState(initialProfile.handicap?.toString() || "");
    const [homeCourse, setHomeCourse] = useState(initialProfile.homeCourse || "");
    const [bio, setBio] = useState(initialProfile.bio || "");
    const [preferredTeeTime, setPreferredTeeTime] = useState(
        initialProfile.preferences?.preferredTeeTime || "any"
    );
    const [walkOrRide, setWalkOrRide] = useState(
        initialProfile.preferences?.walkOrRide || "either"
    );
    const [groupSize, setGroupSize] = useState(
        initialProfile.preferences?.playingPartnerPreference || "any"
    );

    const handleSave = useCallback(async () => {
        if (!firstName.trim()) {
            Alert.alert("Error", "First name is required");
            return;
        }

        setSaving(true);
        try {
            const response = await profileApi.updateProfile({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                location: location.trim(),
                handicap: handicap ? parseInt(handicap) : undefined,
                homeCourse: homeCourse.trim(),
                bio: bio.trim(),
                preferences: {
                    preferredTeeTime,
                    walkOrRide: walkOrRide as "walk" | "ride" | "either",
                    playingPartnerPreference: groupSize,
                },
            });

            if (response.success) {
                // Update stored user
                const storedUser = await AsyncStorage.getItem("user");
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    await AsyncStorage.setItem("user", JSON.stringify({
                        ...user,
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                    }));
                }
                Alert.alert("Success", "Profile updated successfully!", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to save profile");
        } finally {
            setSaving(false);
        }
    }, [firstName, lastName, email, location, handicap, homeCourse, bio, preferredTeeTime, walkOrRide, groupSize, navigation]);

    const handleChangePhoto = useCallback(() => {
        Alert.alert("Change Photo", "Choose an option", [
            { text: "Take Photo", onPress: () => console.log("Camera") },
            { text: "Choose from Library", onPress: () => console.log("Library") },
            { text: "Cancel", style: "cancel" },
        ]);
    }, []);

    const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <Header
                title="Edit Profile"
                onBack={() => navigation.goBack()}
                rightComponent={
                    <TouchableOpacity onPress={handleSave} disabled={saving}>
                        {saving ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <Text style={styles.saveText}>Save</Text>
                        )}
                    </TouchableOpacity>
                }
            />

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <Avatar
                            uri={initialProfile.avatar}
                            size={100}
                            showCameraButton
                            onCameraPress={handleChangePhoto}
                        />
                        <TouchableOpacity onPress={handleChangePhoto}>
                            <Text style={styles.changePhotoText}>Change Photo</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                        <InputField
                            label="First Name"
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Enter first name"
                        />
                        <InputField
                            label="Last Name"
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Enter last name"
                        />
                        <InputField
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter email"
                            keyboardType="email-address"
                        />
                        <InputField
                            label="Location"
                            value={location}
                            onChangeText={setLocation}
                            placeholder="City, State"
                        />
                        <InputField
                            label="Handicap"
                            value={handicap}
                            onChangeText={setHandicap}
                            placeholder="Enter handicap"
                            keyboardType="numeric"
                        />
                    </View>

                    {/* Golf Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Golf Information</Text>
                        <InputField
                            label="Home Course"
                            value={homeCourse}
                            onChangeText={setHomeCourse}
                            placeholder="Enter home course"
                        />
                        <InputField
                            label="Bio"
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell us about yourself..."
                            multiline
                        />
                    </View>

                    {/* Preferences */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Playing Preferences</Text>
                        <DropdownField
                            label="Preferred Tee Time"
                            value={preferredTeeTime}
                            options={TEE_TIME_OPTIONS}
                            onSelect={setPreferredTeeTime}
                        />
                        <DropdownField
                            label="Walk or Ride"
                            value={walkOrRide}
                            options={WALK_RIDE_OPTIONS}
                            onSelect={setWalkOrRide}
                        />
                        <DropdownField
                            label="Preferred Group Size"
                            value={groupSize}
                            options={GROUP_SIZE_OPTIONS}
                            onSelect={setGroupSize}
                        />
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    saveText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
    },
    content: {
        flex: 1,
    },
    avatarSection: {
        alignItems: "center",
        paddingVertical: 24,
        backgroundColor: COLORS.white,
    },
    changePhotoText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.primary,
        marginTop: 12,
    },
    section: {
        backgroundColor: COLORS.white,
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSub,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.bg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textMain,
    },
    inputMultiline: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    dropdown: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.bg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dropdownText: {
        fontSize: 16,
        color: COLORS.textMain,
    },
    optionsList: {
        marginTop: 8,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.divider,
        overflow: "hidden",
    },
    optionItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    optionItemSelected: {
        backgroundColor: COLORS.primaryLight,
    },
    optionText: {
        fontSize: 15,
        color: COLORS.textMain,
    },
    optionTextSelected: {
        color: COLORS.primary,
        fontWeight: "600",
    },
});
