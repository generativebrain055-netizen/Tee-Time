import React, { useState } from "react";
import {
    View,
    Text,
    Switch,
} from "react-native";
import { ScreenShell, ContentArea, AppHeader } from "../ui";

interface NotificationSetting {
    id: string;
    title: string;
    description: string;
    enabled: boolean;
}

export default function NotificationSettingsScreen({ navigation }: any) {
    const [settings, setSettings] = useState<NotificationSetting[]>([
        {
            id: 'friends',
            title: 'Friends',
            description: 'Friend requests and acceptances',
            enabled: true,
        },
        {
            id: 'tee_time_invites',
            title: 'Tee time invites',
            description: 'New tee time invites',
            enabled: true,
        },
        {
            id: 'hosting_tee_times',
            title: 'Hosting tee times',
            description: "Updates for tee times you're hosting",
            enabled: true,
        },
        {
            id: 'messages',
            title: 'Messages',
            description: 'New messages',
            enabled: true,
        },
        {
            id: 'availability_reminder',
            title: 'Weekly Availability Reminder',
            description: 'Reminder to update your availability',
            enabled: true,
        },
    ]);

    const toggleSetting = (id: string) => {
        setSettings(prev =>
            prev.map(setting =>
                setting.id === id
                    ? { ...setting, enabled: !setting.enabled }
                    : setting
            )
        );
    };

    return (
        <ScreenShell>
            <AppHeader
                title="Notification Settings"
                onBack={() => navigation?.goBack()}
            />

            <ContentArea
                style={{ backgroundColor: '#F3F4F6' }}
                contentContainerStyle={{ padding: 16 }}
            >
                <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                }}>
                    {settings.map((setting, index) => (
                        <View
                            key={setting.id}
                            style={{
                                paddingVertical: 16,
                                borderBottomWidth: index < settings.length - 1 ? 1 : 0,
                                borderBottomColor: '#F3F4F6',
                            }}
                        >
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <View style={{ flex: 1, paddingRight: 16 }}>
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 16,
                                        color: '#111827',
                                        marginBottom: 4,
                                    }}>
                                        {setting.title}
                                    </Text>
                                    <Text style={{
                                        fontFamily: 'Inter_400Regular',
                                        fontSize: 14,
                                        color: '#6B7280',
                                    }}>
                                        {setting.description}
                                    </Text>
                                </View>
                                <Switch
                                    value={setting.enabled}
                                    onValueChange={() => toggleSetting(setting.id)}
                                    trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                                    thumbColor={setting.enabled ? '#5EBC68' : '#F3F4F6'}
                                    ios_backgroundColor="#E5E7EB"
                                />
                            </View>
                        </View>
                    ))}
                </View>
            </ContentArea>
        </ScreenShell>
    );
}
