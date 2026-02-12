/**
 * Notification Settings Screen (Figma 883-* Account + Profile Settings)
 * Allows users to manage notification preferences
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    Switch,
    ScrollView,
    Alert,
    StyleSheet,
} from "react-native";
import { Bell } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { useColors, useTheme } from "../ui/theme";
import { profileApi } from "../services/api";
import { useUser } from "../contexts";
import { spacing, fontSize, fontFamily, radii } from "../ui/theme/tokens";

interface NotificationSetting {
    id: string;
    title: string;
    description: string;
    key: 'email' | 'sms' | 'push';
    enabled: boolean;
}

export default function NotificationSettingsScreen({ navigation }: any) {
    const colors = useColors();
    const theme = useTheme();
    const { profile, fetchProfile } = useUser();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<NotificationSetting[]>([
        {
            id: 'email',
            title: 'Email Notifications',
            description: 'Receive notifications via email',
            key: 'email',
            enabled: true,
        },
        {
            id: 'sms',
            title: 'SMS Notifications',
            description: 'Receive notifications via text message',
            key: 'sms',
            enabled: true,
        },
        {
            id: 'push',
            title: 'Push Notifications',
            description: 'Receive push notifications on your device',
            key: 'push',
            enabled: true,
        },
    ]);

    useEffect(() => {
        // Load current notification preferences from profile
        if (profile?.notificationPreferences) {
            setSettings(prev => prev.map(setting => ({
                ...setting,
                enabled: profile.notificationPreferences?.[setting.key] ?? setting.enabled,
            })));
        }
    }, [profile]);

    const handleToggle = useCallback(async (key: 'email' | 'sms' | 'push') => {
        const setting = settings.find(s => s.key === key);
        if (!setting) return;

        const newValue = !setting.enabled;
        const newSettings = settings.map(s => 
            s.key === key ? { ...s, enabled: newValue } : s
        );
        
        setSettings(newSettings);
        setLoading(true);

        try {
            const preferences = {
                email: newSettings.find(s => s.key === 'email')?.enabled ?? true,
                sms: newSettings.find(s => s.key === 'sms')?.enabled ?? true,
                push: newSettings.find(s => s.key === 'push')?.enabled ?? true,
            };
            
            await profileApi.updateNotificationPreferences(preferences);
            await fetchProfile(); // Refresh profile
        } catch (error: any) {
            // Revert on error
            setSettings(settings);
            Alert.alert("Error", error?.message || "Failed to update notification preferences");
        } finally {
            setLoading(false);
        }
    }, [settings, fetchProfile]);

    return (
        <ScreenShell>
            <AppHeader
                title="Notification Settings"
                onBack={() => navigation?.goBack()}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                {/* Header Section */}
                <View style={[styles.headerSection, { backgroundColor: colors.surface }]}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primaryContainer }]}>
                        <Bell size={32} color={colors.primary} strokeWidth={2} />
                    </View>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        Notification Preferences
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Choose how you want to receive notifications
                    </Text>
                </View>

                {/* Notification Settings */}
                <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
                    {settings.map((setting, index) => (
                        <View key={setting.id}>
                            <View style={[
                                styles.settingRow,
                                index < settings.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                            ]}>
                                <View style={styles.settingContent}>
                                    <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                                        {setting.title}
                                    </Text>
                                    <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                                        {setting.description}
                                    </Text>
                                </View>
                                <Switch
                                    value={setting.enabled}
                                    onValueChange={() => handleToggle(setting.key)}
                                    disabled={loading}
                                    trackColor={{ false: colors.border, true: colors.primary }}
                                    thumbColor={colors.surface}
                                    ios_backgroundColor={colors.border}
                                />
                            </View>
                        </View>
                    ))}
                </View>

                {/* Info Text */}
                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                    You can customize notification preferences for different types of updates. 
                    Changes take effect immediately.
                </Text>
            </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
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
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    settingContent: {
        flex: 1,
        paddingRight: spacing.md,
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
    infoText: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.xs,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});
