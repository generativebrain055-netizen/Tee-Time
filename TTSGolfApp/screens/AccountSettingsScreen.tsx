/**
 * Account Settings Screen
 * Editable form for Full name, Email, Phone, Location (text input).
 * Location is manual text entry only; no location detection.
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Dimensions,
} from "react-native";
import * as Application from "expo-application";
import { useUser } from "../contexts";
import { ScreenShell, AppHeader } from "../ui";
import { profileApi } from "../services/api";
import { spacing, fontSize, fontFamily, radii } from "../ui/theme/tokens";
import { logger } from "../utils/logger";

const BORDER = "#E5E7EB";
const GRAY_BG = "#F9FAFB";
const GRAY_900 = "#111827";
const GRAY_500 = "#6B7280";
const GRAY_400 = "#9CA3AF";
const PRIMARY = "#5EBC68";

const { height: WINDOW_HEIGHT } = Dimensions.get("window");
// Ensure scroll content is at least full height so the screen is always scrollable (keyboard, small devices).
const SCROLL_CONTENT_MIN_HEIGHT = WINDOW_HEIGHT;

function formatPhoneDisplay(value: string | undefined): string {
    if (!value) return "";
    const digits = String(value).replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function AccountSettingsScreen({ navigation }: any) {
    const { profile, fetchProfile, updateProfile } = useUser();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [location, setLocation] = useState("");
    const [saving, setSaving] = useState(false);
    const hasInitializedFromProfile = useRef(false);

    // Fetch profile when screen mounts
    useEffect(() => {
        fetchProfile(true);
    }, [fetchProfile]);

    // Initialize form from profile only once when profile first becomes available.
    // This prevents the effect from overwriting user input when profile reference changes.
    useEffect(() => {
        if (profile && !hasInitializedFromProfile.current) {
            hasInitializedFromProfile.current = true;
            const first = profile.firstName ?? "";
            const last = profile.lastName ?? "";
            setFullName([first, last].filter(Boolean).join(" ").trim() || "");
            setEmail(profile.email ?? "");
            const rawPhone = profile.phoneNumber ?? profile.phone ?? "";
            setPhone(formatPhoneDisplay(rawPhone));
            setLocation(profile.location ?? "");
        }
    }, [profile]);

    const handleCancel = useCallback(() => {
        navigation?.goBack();
    }, [navigation]);

    const handlePhoneChange = useCallback((text: string) => {
        const digits = text.replace(/\D/g, "").slice(0, 10);
        setPhone(formatPhoneDisplay(digits));
    }, []);

    const handleSave = useCallback(async () => {
        const parts = fullName.trim().split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ") ?? "";
        const phoneDigits = phone.replace(/\D/g, "");
        setSaving(true);
        try {
            const response = await profileApi.updateProfile({
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                email: email.trim() || undefined,
                phoneNumber: phoneDigits || undefined,
                location: location.trim() || undefined,
            });
            if (response?.success && response?.user) {
                updateProfile(response.user);
                navigation?.goBack();
            } else {
                Alert.alert("Error", "Profile could not be saved. Please try again.");
            }
        } catch (error: any) {
            logger.error("[AccountSettingsScreen] Save error", error);
            Alert.alert("Error", error?.message ?? "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    }, [fullName, email, phone, location, navigation, updateProfile]);

    const appVersion = Application.nativeApplicationVersion ?? "1.0.0";

    return (
        <ScreenShell>
            <AppHeader
                title="Account Settings"
                onBack={() => navigation?.goBack()}
            />
            <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                    alwaysBounceVertical={false}
                >
                    <View style={styles.card}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Full name</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="John Smith"
                                placeholderTextColor={GRAY_400}
                                autoCapitalize="words"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="john.smith@example.com"
                                placeholderTextColor={GRAY_400}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Phone</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={handlePhoneChange}
                                placeholder="(555) 123-4567"
                                placeholderTextColor={GRAY_400}
                                keyboardType="phone-pad"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Location - Your zip code stays private</Text>
                            <TextInput
                                style={styles.input}
                                value={location}
                                onChangeText={setLocation}
                                placeholder="94110 - San Francisco"
                                placeholderTextColor={GRAY_400}
                            />
                        </View>

                        <View style={styles.buttons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCancel}
                                disabled={saving}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                <Text style={styles.saveText}>
                                    {saving ? "Saving…" : "Save changes"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.versionText}>Tee Time Social v{appVersion}</Text>
                </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        minHeight: SCROLL_CONTENT_MIN_HEIGHT,
        backgroundColor: GRAY_BG,
        padding: spacing.lg,
        paddingBottom: spacing["3xl"] ?? 48,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: radii.lg,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: BORDER,
    },
    field: {
        marginBottom: spacing.lg,
    },
    label: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        color: GRAY_500,
        marginBottom: spacing.xs,
    },
    input: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.base,
        color: GRAY_900,
        backgroundColor: GRAY_BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
    },
    buttons: {
        flexDirection: "row",
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },
    cancelText: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
        color: GRAY_500,
    },
    saveButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        backgroundColor: PRIMARY,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveText: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
        color: "#FFFFFF",
    },
    versionText: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        color: GRAY_500,
        textAlign: "center",
        marginTop: spacing["2xl"],
    },
});
