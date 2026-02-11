import React, { useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
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
    ChevronRight
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../contexts";
import { ScreenShell, ContentArea, AppHeader } from "../ui";

export default function SettingsScreen({ navigation }: any) {
    const { profile, fetchProfile, clearProfile } = useUser();

    // Fetch profile on mount if not cached
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);



    const handleEditProfile = useCallback(() => {
        navigation?.navigate("EditProfile");
    }, [navigation]);

    const handleNotifications = useCallback(() => {
        navigation?.navigate("NotificationSettings");
    }, [navigation]);

    const handlePrivacy = useCallback(() => {
        Alert.alert("Privacy & Security", "Privacy settings coming soon");
    }, []);

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
                            await clearProfile();
                            await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
                            navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
                        } catch (error) {
                            console.error("Error logging out:", error);
                        }
                    },
                },
            ]
        );
    }, [navigation, clearProfile]);

    return (
        <ScreenShell>
            <AppHeader
                title="Settings"
                onBack={() => navigation?.goBack()}
            />

            <ContentArea
                contentContainerStyle={{ padding: 16 }}
                style={{ backgroundColor: '#F9FAFB' }}
            >
                {/* Account Information Section */}
                <View style={{ marginBottom: 24 }}>
                    <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: 16,
                        paddingHorizontal: 4,
                    }}>
                        <Text style={{
                            fontFamily: 'Inter_700Bold',
                            fontSize: 20,
                            color: '#111827',
                        }}>
                            Account Information
                        </Text>
                        <TouchableOpacity 
                            onPress={handleEditProfile}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: '#F3F4F6',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Edit3 size={20} color="#6B7280" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    {/* Full Name */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16,
                        backgroundColor: '#F3F4F6',
                        borderRadius: 12,
                        marginBottom: 12,
                    }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            backgroundColor: '#DBEAFE',
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                        }}>
                            <User size={24} color="#3B82F6" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontFamily: 'Inter_400Regular',
                                fontSize: 13,
                                color: '#9CA3AF',
                                marginBottom: 4,
                            }}>
                                Full Name
                            </Text>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#111827',
                            }}>
                                {profile?.firstName && profile?.lastName 
                                    ? `${profile.firstName} ${profile.lastName}`
                                    : "Not set"}
                            </Text>
                        </View>
                    </View>

                    {/* Email */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16,
                        backgroundColor: '#F3F4F6',
                        borderRadius: 12,
                        marginBottom: 12,
                    }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            backgroundColor: '#D1FAE5',
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                        }}>
                            <Mail size={24} color="#10B981" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontFamily: 'Inter_400Regular',
                                fontSize: 13,
                                color: '#9CA3AF',
                                marginBottom: 4,
                            }}>
                                Email
                            </Text>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#111827',
                            }}>
                                {profile?.email || "Not set"}
                            </Text>
                        </View>
                    </View>

                    {/* Phone */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16,
                        backgroundColor: '#F3F4F6',
                        borderRadius: 12,
                        marginBottom: 12,
                    }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            backgroundColor: '#E9D5FF',
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                        }}>
                            <Phone size={24} color="#9333EA" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontFamily: 'Inter_400Regular',
                                fontSize: 13,
                                color: '#9CA3AF',
                                marginBottom: 4,
                            }}>
                                Phone
                            </Text>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#111827',
                            }}>
                                {profile?.phoneNumber || "Not set"}
                            </Text>
                        </View>
                    </View>

                    {/* Location */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16,
                        backgroundColor: '#F3F4F6',
                        borderRadius: 12,
                    }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            backgroundColor: '#FEF3C7',
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                        }}>
                            <MapPin size={24} color="#F59E0B" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontFamily: 'Inter_400Regular',
                                fontSize: 13,
                                color: '#9CA3AF',
                                marginBottom: 4,
                            }}>
                                Location
                            </Text>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#111827',
                            }}>
                                {profile?.location || "Not set"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Settings Options */}
                <View className="bg-white rounded-xl mb-4 border border-gray-100 overflow-hidden">
                    <TouchableOpacity 
                        className="flex-row items-center p-4 border-b border-gray-100"
                        onPress={handleNotifications}
                        activeOpacity={0.7}
                    >
                        <View className="w-10 h-10 bg-blue-50 rounded-lg items-center justify-center mr-3">
                            <Bell size={20} color="#3B82F6" strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-gray-900 mb-0.5">Notifications</Text>
                            <Text className="text-xs text-gray-500">Manage notification preferences</Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="flex-row items-center p-4 border-b border-gray-100"
                        onPress={handlePrivacy}
                        activeOpacity={0.7}
                    >
                        <View className="w-10 h-10 bg-purple-50 rounded-lg items-center justify-center mr-3">
                            <Shield size={20} color="#9333EA" strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-gray-900 mb-0.5">Privacy & Security</Text>
                            <Text className="text-xs text-gray-500">Privacy settings and policies</Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="flex-row items-center p-4"
                        onPress={handleHelp}
                        activeOpacity={0.7}
                    >
                        <View className="w-10 h-10 bg-green-50 rounded-lg items-center justify-center mr-3">
                            <HelpCircle size={20} color="#5EBC68" strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-gray-900 mb-0.5">Help & Support</Text>
                            <Text className="text-xs text-gray-500">Support center and FAQs</Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity 
                    className="bg-white rounded-xl p-4 border border-gray-100 flex-row items-center"
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <View className="w-10 h-10 bg-red-50 rounded-lg items-center justify-center mr-3">
                        <LogOut size={20} color="#EF4444" strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-bold text-red-600 mb-0.5">Log Out</Text>
                        <Text className="text-xs text-gray-500">Sign out of your account</Text>
                    </View>
                    <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
                </TouchableOpacity>

                {/* App Version */}
                <Text className="text-center text-sm text-gray-400 mt-8">
                    Tee Time Social v1.0.0
                </Text>
            </ContentArea>
        </ScreenShell>
    );
}
