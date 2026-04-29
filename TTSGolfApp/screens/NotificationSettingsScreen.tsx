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
import { syncSystemPushPreferenceFromOs } from "../utils/syncNotificationPermission";
import { spacing, fontSize, fontFamily, radii } from "../ui/theme/tokens";

interface NotificationSetting {
    id: string;
    title: string;
    description: string;
    key: 'email' | 'sms' | 'push';
    enabled: boolean;
}

interface NotificationTypeSetting {
    id: string;
    type: string;
    label: string;
    description: string;
    pushEnabled: boolean;
    inAppEnabled: boolean;
}

const NOTIFICATION_TYPES: Array<{ type: string; label: string; description: string }> = [
    { type: 'tee_time_invite', label: 'Tee Time Invites', description: 'When someone invites you to a tee time' },
    { type: 'tee_time_booked', label: 'Tee Time Booked', description: 'When your tee time is full and the group chat is ready' },
    { type: 'tee_time_response', label: 'Tee Time Responses', description: 'When someone responds to your invite' },
    { type: 'player_cancelled', label: 'Player Cancelled', description: 'When a player cancels their spot in your tee time' },
    { type: 'spot_opened', label: 'Spot Opened', description: 'When a spot opens in a tee time' },
    { type: 'friend_request', label: 'Friend Requests', description: 'When someone sends you a friend request' },
    { type: 'friend_accepted', label: 'Friend Request Accepted', description: 'When someone accepts your friend request' },
    { type: 'group_invite', label: 'Group Invites', description: 'When someone invites you to a roster group' },
    { type: 'group_invite_accepted', label: 'Group Invite Accepted', description: 'When someone accepts your group invitation' },
    { type: 'group_updated', label: 'Group Updated', description: 'When someone updates a roster group you are in' },
    { type: 'group_deleted', label: 'Group Deleted', description: 'When someone deletes a roster group you were in' },
    { type: 'waiver_wire', label: 'Availability (Matching Availability)', description: 'When roster members with matching availability post their availability' },
    { type: 'check_in_reminder', label: 'Check-in Reminders', description: 'Reminders for upcoming tee times' },
    { type: 'message', label: 'Messages', description: 'When someone sends you a chat message' },
];

export default function NotificationSettingsScreen({ navigation }: any) {
    const colors = useColors();
    const theme = useTheme();
    const { profile, updateProfile } = useUser();
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
    const [typeSettings, setTypeSettings] = useState<NotificationTypeSetting[]>([]);

    useEffect(() => {
        const pref = profile?.notificationPreferences;
        if (pref) {
            setSettings(prev => prev.map(setting => ({
                ...setting,
                // Keep current UI value if backend omits a key to avoid flip-back.
                enabled: pref?.[setting.key] ?? setting.enabled,
            })));
            setTypeSettings(prev => {
                const types = pref.types || {};
                return NOTIFICATION_TYPES.map(nt => {
                    const existing = prev.find(p => p.type === nt.type);
                    return {
                        id: nt.type,
                        type: nt.type,
                        label: nt.label,
                        description: nt.description,
                        pushEnabled: types[nt.type]?.push ?? existing?.pushEnabled ?? true,
                        inAppEnabled: types[nt.type]?.inApp ?? existing?.inAppEnabled ?? true,
                    };
                });
            });
            return;
        }
        // Initialize with defaults when no preferences exist.
        setTypeSettings(prev => NOTIFICATION_TYPES.map(nt => {
            const existing = prev.find(p => p.type === nt.type);
            return {
                id: nt.type,
                type: nt.type,
                label: nt.label,
                description: nt.description,
                pushEnabled: existing?.pushEnabled ?? true,
                inAppEnabled: existing?.inAppEnabled ?? true,
            };
        }));
    }, [profile?.notificationPreferences]);

    useEffect(() => {
        syncSystemPushPreferenceFromOs();
    }, []);

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
                types: profile?.notificationPreferences?.types || {},
            };
            
            await profileApi.updateNotificationPreferences(preferences);
            // Keep local user context in sync immediately to prevent UI toggles jumping back.
            updateProfile({ notificationPreferences: preferences });
        } catch (error: any) {
            // Revert on error
            setSettings(settings);
            Alert.alert("Error", error?.message || "Failed to update notification preferences");
        } finally {
            setLoading(false);
        }
    }, [settings, profile, updateProfile]);

    const handleTypeToggle = useCallback(async (type: string, toggleType: 'push' | 'inApp') => {
        const typeSetting = typeSettings.find(ts => ts.type === type);
        if (!typeSetting) return;

        const newValue = toggleType === 'push' 
            ? !typeSetting.pushEnabled 
            : !typeSetting.inAppEnabled;
        
        const newTypeSettings = typeSettings.map(ts => 
            ts.type === type 
                ? { 
                    ...ts, 
                    pushEnabled: toggleType === 'push' ? newValue : ts.pushEnabled,
                    inAppEnabled: toggleType === 'inApp' ? newValue : ts.inAppEnabled,
                }
                : ts
        );
        
        setTypeSettings(newTypeSettings);
        setLoading(true);

        try {
            const currentTypes = profile?.notificationPreferences?.types || {};
            const updatedTypes = {
                ...currentTypes,
                [type]: {
                    ...currentTypes[type],
                    push: toggleType === 'push' ? newValue : (currentTypes[type]?.push ?? true),
                    inApp: toggleType === 'inApp' ? newValue : (currentTypes[type]?.inApp ?? true),
                },
            };

            const preferences = {
                email: settings.find(s => s.key === 'email')?.enabled ?? true,
                sms: settings.find(s => s.key === 'sms')?.enabled ?? true,
                push: settings.find(s => s.key === 'push')?.enabled ?? true,
                types: updatedTypes,
            };
            
            await profileApi.updateNotificationPreferences(preferences);
            // Keep local user context in sync immediately to prevent UI toggles jumping back.
            updateProfile({ notificationPreferences: preferences });
        } catch (error: any) {
            // Revert on error
            setTypeSettings(typeSettings);
            Alert.alert("Error", error?.message || "Failed to update notification preferences");
        } finally {
            setLoading(false);
        }
    }, [typeSettings, settings, profile, updateProfile]);

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
                        Control how you're contacted — customize push and in-app by type
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

                {/* Per-Type Notification Settings */}
                {typeSettings.length > 0 && (
                    <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                                Notification Types
                            </Text>
                            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                                Turn push and in-app on or off for each notification type
                            </Text>
                        </View>
                        {typeSettings.map((typeSetting, index) => (
                            <View
                                key={typeSetting.id}
                                style={[
                                    styles.typeSettingBlock,
                                    index < typeSettings.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                                ]}
                            >
                                <View style={styles.typeSettingLabelBlock}>
                                    <Text style={[styles.typeSettingLabel, { color: colors.textPrimary }]}>
                                        {typeSetting.label}
                                    </Text>
                                    <Text style={[styles.typeSettingDescription, { color: colors.textSecondary }]}>
                                        {typeSetting.description}
                                    </Text>
                                </View>
                                <View style={styles.typeSettingToggles}>
                                    <View style={styles.toggleRow}>
                                        <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                                            Push
                                        </Text>
                                        <Switch
                                            value={typeSetting.pushEnabled}
                                            onValueChange={() => handleTypeToggle(typeSetting.type, 'push')}
                                            disabled={loading}
                                            trackColor={{ false: colors.border, true: colors.primary }}
                                            thumbColor={colors.surface}
                                            ios_backgroundColor={colors.border}
                                        />
                                    </View>
                                    <View style={styles.toggleRow}>
                                        <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                                            In-App
                                        </Text>
                                        <Switch
                                            value={typeSetting.inAppEnabled}
                                            onValueChange={() => handleTypeToggle(typeSetting.type, 'inApp')}
                                            disabled={loading}
                                            trackColor={{ false: colors.border, true: colors.primary }}
                                            thumbColor={colors.surface}
                                            ios_backgroundColor={colors.border}
                                        />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Info Text */}
                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                    Remote push requires both: Push enabled here and notifications allowed for this app in
                    system Settings. In-app notifications always use the toggles below regardless of system
                    permission. Changes take effect immediately.
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
    sectionHeader: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    sectionTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize.lg,
        marginBottom: spacing.xs,
    },
    sectionSubtitle: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
    },
    typeSettingBlock: {
        paddingHorizontal: spacing.lg,
    },
    typeSettingLabelBlock: {
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        minWidth: 0,
    },
    typeSettingLabel: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
        marginBottom: spacing['2xs'],
    },
    typeSettingDescription: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    typeSettingToggles: {
        paddingBottom: spacing.md,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    toggleLabel: {
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
    },
});
