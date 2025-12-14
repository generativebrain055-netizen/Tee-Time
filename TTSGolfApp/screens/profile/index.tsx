import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Edit2 } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { BottomNav } from "../../components/common";
import { UserProfile, DEFAULT_USER } from "./types";
import {
    ProfilePhotoSection,
    BasicInfoSection,
    EquipmentSection,
    PreferencesSection,
    SignOutButton,
} from "./ProfileSections";

export default function ProfileScreen({ navigation, route }: any) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER);
    const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const userData = route?.params?.user;
            if (userData) {
                setProfile({
                    ...DEFAULT_USER,
                    firstName: userData.firstName || DEFAULT_USER.firstName,
                    lastName: userData.lastName || DEFAULT_USER.lastName,
                    phone: userData.phoneNumber || DEFAULT_USER.phone,
                    handicap: userData.handicap?.toString() || DEFAULT_USER.handicap,
                });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    const handleSave = async () => {
        try {
            setProfile(editedProfile);
            setIsEditMode(false);
            Alert.alert("Success", "Profile updated successfully!");
        } catch (error) {
            console.error("Error saving profile:", error);
            Alert.alert("Error", "Failed to save profile. Please try again.");
        }
    };

    const handleCancel = () => {
        setEditedProfile(profile);
        setIsEditMode(false);
    };

    const handleSignOut = () => {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Sign Out",
                style: "destructive",
                onPress: async () => {
                    try {
                        await AsyncStorage.removeItem("accessToken");
                        await AsyncStorage.removeItem("refreshToken");
                        await AsyncStorage.removeItem("user");
                        navigation?.navigate("Login");
                    } catch (error) {
                        console.error("Error signing out:", error);
                    }
                },
            },
        ]);
    };

    const handleChangePhoto = () => {
        Alert.alert("Change Photo", "Choose an option", [
            { text: "Take Photo", onPress: () => console.log("Camera") },
            { text: "Choose from Library", onPress: () => console.log("Library") },
            { text: "Cancel", style: "cancel" },
        ]);
    };

    const Header = () => (
        <View style={styles.header}>
            {isEditMode ? (
                <>
                    <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
                        <ArrowLeft size={24} color={COLORS.textMain} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
                        <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <View style={{ width: 40 }} />
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => {
                            setEditedProfile(profile);
                            setIsEditMode(true);
                        }}
                    >
                        <Edit2 size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <Header />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <ProfilePhotoSection
                    profile={isEditMode ? editedProfile : profile}
                    isEditMode={isEditMode}
                    onChangePhoto={handleChangePhoto}
                />
                <BasicInfoSection
                    profile={profile}
                    editedProfile={editedProfile}
                    isEditMode={isEditMode}
                    setEditedProfile={setEditedProfile}
                />
                <EquipmentSection
                    profile={profile}
                    editedProfile={editedProfile}
                    isEditMode={isEditMode}
                    setEditedProfile={setEditedProfile}
                />
                <PreferencesSection
                    profile={profile}
                    editedProfile={editedProfile}
                    isEditMode={isEditMode}
                    setEditedProfile={setEditedProfile}
                />
                {!isEditMode && (
                    <SignOutButton onSignOut={handleSignOut} />
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
            {!isEditMode && <BottomNav activeTab="Profile" navigation={navigation} />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
        backgroundColor: COLORS.white,
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    saveText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
});
