/**
 * Settings Screen (Figma 883-* Account + Profile Settings)
 * Main settings screen with account information and settings options
 */
import React, { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    StyleSheet,
    ScrollView,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { 
    User, 
    Mail, 
    Phone, 
    MapPin,
    Edit3,
    Bell,
    Shield,
    HelpCircle,
    LogOut,
    ChevronRight,
} from "lucide-react-native";
import { useUser } from "../contexts";
import { useAuthStore } from "../stores";
import { ScreenShell, AppHeader } from "../ui";
import { useColors, useTheme } from "../ui/theme";
import { spacing, fontSize, fontFamily, radii } from "../ui/theme/tokens";
import { logger } from "../utils/logger";

export default function SettingsScreen({ navigation }: any) {
    const { profile, loading, fetchProfile } = useUser();
    const logout = useAuthStore((s) => s.logout);
    const colors = useColors();
    const theme = useTheme();

    // Refetch every time this screen comes into focus so displayed settings always reflect the DB
    useFocusEffect(
        useCallback(() => {
            fetchProfile(true);
        }, [fetchProfile])
    );



    const handleEditProfile = useCallback(() => {
        navigation?.navigate("AccountSettings");
    }, [navigation]);

    const handleNotifications = useCallback(() => {
        navigation?.navigate("NotificationSettings");
    }, [navigation]);

    const handleLocation = useCallback(() => {
        navigation?.navigate("LocationSettings");
    }, [navigation]);

    const handlePrivacy = useCallback(() => {
        navigation?.navigate("PrivacySecurity");
    }, [navigation]);

    const handleHelp = useCallback(() => {
        navigation?.navigate("HelpSupport");
    }, [navigation]);

    const handleLogout = useCallback(() => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await logout();
                            navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
                        } catch (error) {
                            logger.error("[SettingsScreen] Error logging out", error);
                        }
                    },
                },
            ]
        );
    }, [navigation, logout]);

    return (
        <ScreenShell>
            <AppHeader
                title="Settings"
                onBack={() => navigation?.goBack()}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
            >
                {/* Account Information Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            Account Information
                        </Text>
                        <TouchableOpacity 
                            onPress={handleEditProfile}
                            style={[styles.editButton, { backgroundColor: colors.surfaceSecondary }]}
                            activeOpacity={0.7}
                        >
                            <Edit3 size={20} color={colors.textSecondary} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    {/* Account Info Items */}
                    {[
                        { icon: User, label: 'Full Name', value: profile?.firstName && profile?.lastName ? `${profile.firstName} ${profile.lastName}` : null, iconColor: '#3B82F6', iconBg: '#DBEAFE' },
                        { icon: Mail, label: 'Email', value: profile?.email || null, iconColor: '#10B981', iconBg: '#D1FAE5' },
                        { icon: Phone, label: 'Phone', value: profile?.phoneNumber || null, iconColor: '#9333EA', iconBg: '#E9D5FF' },
                        { icon: MapPin, label: 'Location', value: profile?.location || null, iconColor: '#F59E0B', iconBg: '#FEF3C7' },
                    ].map((item, index, array) => {
                        const Icon = item.icon;
                        return (
                            <View 
                                key={item.label}
                                style={[
                                    styles.infoItem,
                                    { backgroundColor: colors.surfaceSecondary },
                                    index < array.length - 1 && styles.infoItemMargin,
                                ]}
                            >
                                <View style={[styles.infoIcon, { backgroundColor: item.iconBg }]}>
                                    <Icon size={24} color={item.iconColor} strokeWidth={2} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                                        {item.label}
                                    </Text>
                                    {loading && !item.value ? (
                                        <ActivityIndicator size="small" color={colors.textMuted} style={{ alignSelf: 'flex-start', marginTop: 2 }} />
                                    ) : (
                                        <Text style={[styles.infoValue, { color: item.value ? colors.textPrimary : colors.textMuted }]}>
                                            {item.value ?? "Not set"}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Settings Options */}
                <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
                    {[
                        { icon: Bell, label: 'Notifications', subtitle: 'Push & in-app by type — control how you\'re contacted', onPress: handleNotifications, iconColor: '#3B82F6', iconBg: '#DBEAFE' },
                        { icon: MapPin, label: 'Location', subtitle: 'Update for accurate distance-based filters', onPress: handleLocation, iconColor: '#10B981', iconBg: '#D1FAE5' },
                        { icon: Shield, label: 'Privacy & Security', subtitle: 'Privacy settings and policies', onPress: handlePrivacy, iconColor: '#9333EA', iconBg: '#E9D5FF' },
                        { icon: HelpCircle, label: 'Help & Support', subtitle: 'Support center and FAQs', onPress: handleHelp, iconColor: colors.primary, iconBg: colors.primaryContainer },
                    ].map((item, index, array) => {
                        const Icon = item.icon;
                        return (
                            <TouchableOpacity
                                key={item.label}
                                style={[
                                    styles.settingsItem,
                                    index < array.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                                ]}
                                onPress={item.onPress}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.settingsIcon, { backgroundColor: item.iconBg }]}>
                                    <Icon size={20} color={item.iconColor} strokeWidth={2} />
                                </View>
                                <View style={styles.settingsText}>
                                    <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>
                                        {item.label}
                                    </Text>
                                    <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
                                        {item.subtitle}
                                    </Text>
                                </View>
                                <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Logout Button */}
                <TouchableOpacity 
                    style={[styles.logoutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <View style={[styles.logoutIcon, { backgroundColor: colors.errorContainer }]}>
                        <LogOut size={20} color={colors.error} strokeWidth={2} />
                    </View>
                    <View style={styles.logoutText}>
                        <Text style={[styles.logoutLabel, { color: colors.error }]}>
                            Log Out
                        </Text>
                        <Text style={[styles.logoutSubtitle, { color: colors.textSecondary }]}>
                            Sign out of your account
                        </Text>
                    </View>
                    <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
                </TouchableOpacity>

                {/* App Version */}
                <Text style={[styles.versionText, { color: colors.textMuted }]}>
                    Tee Time Social v1.0.0
                </Text>
            </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.lg,
        paddingBottom: spacing['3xl'] ?? 48,
        minHeight: Dimensions.get('window').height,
    },
    section: {
        marginBottom: spacing['2xl'],
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xs,
    },
    sectionTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize.xl,
    },
    editButton: {
        width: 40,
        height: 40,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: radii.md,
    },
    infoItemMargin: {
        marginBottom: spacing.sm,
    },
    infoIcon: {
        width: 48,
        height: 48,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        marginBottom: spacing['2xs'],
    },
    infoValue: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
    },
    settingsCard: {
        borderRadius: radii.lg,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
    },
    settingsIcon: {
        width: 40,
        height: 40,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    settingsText: {
        flex: 1,
    },
    settingsLabel: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize.base,
        marginBottom: spacing['2xs'],
    },
    settingsSubtitle: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.xs,
    },
    logoutCard: {
        borderRadius: radii.lg,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: spacing['2xl'],
    },
    logoutIcon: {
        width: 40,
        height: 40,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    logoutText: {
        flex: 1,
    },
    logoutLabel: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize.base,
        marginBottom: spacing['2xs'],
    },
    logoutSubtitle: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.xs,
    },
    versionText: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        textAlign: 'center',
        marginTop: spacing['2xl'],
    },
});
