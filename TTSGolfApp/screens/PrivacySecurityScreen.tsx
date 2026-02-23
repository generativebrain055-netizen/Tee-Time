/**
 * Privacy & Security Screen (Figma 883-* Account + Profile Settings)
 * Allows users to manage privacy settings and security preferences
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Switch,
    ScrollView,
    Alert,
    StyleSheet,
} from "react-native";
import { Shield, Lock, Eye, EyeOff, Phone, MapPin, User } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { useColors, useTheme } from "../ui/theme";
import { profileApi } from "../services/api";
import { useUser } from "../contexts";
import { spacing, fontSize, fontFamily, radii } from "../ui/theme/tokens";
import type { PrivacySettings } from "../services/api/types";

interface PrivacySetting {
    id: string;
    label: string;
    description: string;
    key: keyof PrivacySettings;
    icon: React.ComponentType<any>;
}

export default function PrivacySecurityScreen({ navigation }: any) {
    const colors = useColors();
    const theme = useTheme();
    const { profile, fetchProfile } = useUser();
    const [loading, setLoading] = useState(false);
    const [privacySettings, setPrivacySettings] = useState({
        showHandicap: true,
        showLocation: true,
        showPhone: false,
    });

    useEffect(() => {
        // Load current privacy settings from profile
        if (profile?.privacySettings) {
            setPrivacySettings({
                showHandicap: profile.privacySettings.showHandicap ?? true,
                showLocation: profile.privacySettings.showLocation ?? true,
                showPhone: profile.privacySettings.showPhone ?? false,
            });
        }
    }, [profile]);

    const settings: PrivacySetting[] = [
        {
            id: 'handicap',
            label: 'Show Handicap',
            description: 'Allow others to see your handicap',
            key: 'showHandicap',
            icon: User,
        },
        {
            id: 'location',
            label: 'Show Location',
            description: 'Allow others to see your location',
            key: 'showLocation',
            icon: MapPin,
        },
        {
            id: 'phone',
            label: 'Show Phone Number',
            description: 'Allow others to see your phone number',
            key: 'showPhone',
            icon: Phone,
        },
    ];

    const handleToggle = useCallback(async (key: keyof typeof privacySettings) => {
        const newSettings = {
            ...privacySettings,
            [key]: !privacySettings[key],
        };
        
        setPrivacySettings(newSettings);
        setLoading(true);

        try {
            await profileApi.updatePrivacySettings(newSettings);
            await fetchProfile(true); // Force refresh so context and UI show persisted values
        } catch (error: any) {
            // Revert on error
            setPrivacySettings(privacySettings);
            Alert.alert("Error", error?.message || "Failed to update privacy settings");
        } finally {
            setLoading(false);
        }
    }, [privacySettings, fetchProfile]);

    return (
        <ScreenShell>
            <AppHeader
                title="Privacy & Security"
                onBack={() => navigation?.goBack()}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                {/* Header Section */}
                <View style={[styles.headerSection, { backgroundColor: colors.surface }]}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primaryContainer }]}>
                        <Shield size={32} color={colors.primary} strokeWidth={2} />
                    </View>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        Privacy Settings
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Control what information others can see about you
                    </Text>
                </View>

                {/* Privacy Settings */}
                <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
                    {settings.map((setting, index) => {
                        const Icon = setting.icon;
                        const value = privacySettings[setting.key];
                        
                        return (
                            <View key={setting.id}>
                                <View style={[
                                    styles.settingRow,
                                    index < settings.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                                ]}>
                                    <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceSecondary }]}>
                                        <Icon size={20} color={colors.primary} strokeWidth={2} />
                                    </View>
                                    <View style={styles.settingContent}>
                                        <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                                            {setting.label}
                                        </Text>
                                        <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                                            {setting.description}
                                        </Text>
                                    </View>
                                    <Switch
                                        value={value}
                                        onValueChange={() => handleToggle(setting.key)}
                                        disabled={loading}
                                        trackColor={{ false: colors.border, true: colors.primary }}
                                        thumbColor={colors.surface}
                                        ios_backgroundColor={colors.border}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Security Section */}
                <View style={[styles.securityCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.securityHeader}>
                        <Lock size={24} color={colors.primary} strokeWidth={2} />
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            Security
                        </Text>
                    </View>
                    <Text style={[styles.securityDescription, { color: colors.textSecondary }]}>
                        Your account security is managed through your authentication settings. 
                        To change your password or update security settings, please contact support.
                    </Text>
                </View>

                {/* Info Text */}
                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                    Privacy settings help you control your visibility on Tee Time Social. 
                    Changes take effect immediately.
                </Text>
            </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    contentContainer: {
        padding: spacing.lg,
        paddingBottom: spacing['4xl'],
    },
    headerSection: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        paddingHorizontal: spacing.lg,
        borderRadius: radii.lg,
        marginBottom: spacing.lg,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize['2xl'],
        marginBottom: spacing.xs,
    },
    headerSubtitle: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.base,
        textAlign: 'center',
    },
    settingsCard: {
        borderRadius: radii.lg,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    settingContent: {
        flex: 1,
        marginRight: spacing.md,
    },
    settingLabel: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
        marginBottom: spacing['2xs'],
    },
    settingDescription: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
    },
    securityCard: {
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    securityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    sectionTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize.lg,
    },
    securityDescription: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        lineHeight: fontSize.base * 1.5,
    },
    infoText: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.xs,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});
