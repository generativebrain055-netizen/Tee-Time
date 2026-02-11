/**
 * Notifications Screen - Pixel Perfect iOS Design
 * Activity & Invites tabs with categorized notifications
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Image,
} from "react-native";
import { Bell, Check, X, UserPlus } from "lucide-react-native";
import { notificationApi, friendApi, inviteApi, AppNotification } from "../../services/api";
import { ScreenShell, AppHeader } from "../../ui";

type TabType = 'activity' | 'invites';

interface CategorySection {
    title: string;
    count: number;
    items: AppNotification[];
}

export default function NotificationsScreen({ navigation }: any) {
    const [activeTab, setActiveTab] = useState<TabType>('activity');
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await notificationApi.getNotifications({ limit: 100 });
            if (response.success) {
                setNotifications(response.notifications);
            }
        } catch (error) {
            console.error('[NOTIFICATIONS] Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, [fetchNotifications]);

    const handleAccept = async (notificationId: string, type: string, data?: any) => {
        try {
            if (type.includes('friend')) {
                const requestId = data?.requestId || notificationId;
                await friendApi.respondToRequest(requestId, "accepted");
            } else if (type.includes('tee_time')) {
                await inviteApi.respondToInvite(notificationId, "accepted");
            }
            // Update local state immediately to reflect change
            setNotifications(prev => prev.map(n => 
                n.id === notificationId 
                    ? { ...n, status: 'accepted', data: { ...n.data, responded: true } }
                    : n
            ));
        } catch (error) {
            console.error('[NOTIFICATIONS] Accept error:', error);
        }
    };

    const handleDecline = async (notificationId: string, type: string, data?: any) => {
        try {
            if (type.includes('friend')) {
                const requestId = data?.requestId || notificationId;
                await friendApi.respondToRequest(requestId, "declined");
            } else if (type.includes('tee_time')) {
                await inviteApi.respondToInvite(notificationId, "declined");
            }
            // Update local state immediately to reflect change
            setNotifications(prev => prev.map(n => 
                n.id === notificationId 
                    ? { ...n, status: 'declined', data: { ...n.data, responded: true } }
                    : n
            ));
        } catch (error) {
            console.error('[NOTIFICATIONS] Decline error:', error);
        }
    };

    const categorizeNotifications = (notifs: AppNotification[], tab: TabType): CategorySection[] => {
        if (tab === 'activity') {
            return [
                {
                    title: 'Recent activity',
                    count: notifs.filter(n => 
                        n.type.includes('confirmed') || 
                        n.type.includes('cancelled') ||
                        n.type.includes('completed')
                    ).length,
                    items: notifs.filter(n => 
                        n.type.includes('confirmed') || 
                        n.type.includes('cancelled') ||
                        n.type.includes('completed')
                    ),
                },
            ].filter(section => section.count > 0);
        } else {
            return [
                {
                    title: 'Tee time invites',
                    count: notifs.filter(n => n.type.includes('tee_time_invite')).length,
                    items: notifs.filter(n => n.type.includes('tee_time_invite')),
                },
                {
                    title: 'Group requests',
                    count: notifs.filter(n => n.type.includes('group_request')).length,
                    items: notifs.filter(n => n.type.includes('group_request')),
                },
                {
                    title: 'Friend requests',
                    count: notifs.filter(n => n.type.includes('friend_request')).length,
                    items: notifs.filter(n => n.type.includes('friend_request')),
                },
            ].filter(section => section.count > 0);
        }
    };

    const sections = categorizeNotifications(notifications, activeTab);

    const renderNotificationItem = (item: AppNotification) => {
        const isFriendRequest = item.type.includes('friend_request');
        const isInvite = item.type.includes('invite') || item.type.includes('request');
        const isAccepted = item.type.includes('accepted') || item.status === 'accepted' || item.data?.responded;
        const isDeclined = item.status === 'declined';
        const timeAgo = getTimeAgo(item.createdAt);

        // Extract user info from different possible data structures
        const senderName = item.data?.senderName || 
                          item.data?.sender?.name || 
                          item.data?.name ||
                          (item.data?.firstName && item.data?.lastName ? `${item.data.firstName} ${item.data.lastName}`.trim() : null) ||
                          'Someone';
        
        const senderAvatar = item.data?.senderAvatar || 
                            item.data?.sender?.avatar || 
                            item.data?.avatar;

        const location = item.data?.location || item.data?.sender?.location || '';

        console.log('[NOTIFICATION_ITEM] Debug:', {
            notificationId: item.id,
            type: item.type,
            senderName,
            senderAvatar,
            location,
            firstName: item.data?.firstName,
            lastName: item.data?.lastName,
            rawData: JSON.stringify(item.data),
        });

        return (
            <TouchableOpacity
                key={item.id}
                style={{
                    flexDirection: 'row',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: item.isRead ? '#FFFFFF' : '#F0FDF4',
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}
                activeOpacity={0.7}
                onPress={() => {
                    if (item.data?.teeTimeId) {
                        navigation?.navigate('TeeTimeDetail', { teeTimeId: item.data.teeTimeId });
                    }
                }}
            >
                {/* Avatar */}
                <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#E5E7EB',
                    marginRight: 12,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {senderAvatar ? (
                        <Image source={{ uri: senderAvatar }} style={{ width: 48, height: 48 }} />
                    ) : (
                        <View style={{
                            width: 48,
                            height: 48,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#6B7280',
                            }}>
                                {senderName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                    {isFriendRequest ? (
                        <>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 15,
                                color: '#111827',
                            }}>
                                {senderName}
                            </Text>
                            {location && (
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 13,
                                    color: '#6B7280',
                                    marginTop: 2,
                                }}>
                                    {location}
                                </Text>
                            )}
                        </>
                    ) : (
                        <Text style={{
                            fontFamily: 'Inter_400Regular',
                            fontSize: 14,
                            color: '#111827',
                            lineHeight: 20,
                        }}>
                            <Text style={{ fontFamily: 'Inter_600SemiBold' }}>
                                {senderName}
                            </Text>
                            {' '}
                            {item.body}
                        </Text>
                    )}
                    
                    <Text style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 12,
                        color: '#6B7280',
                        marginTop: 4,
                    }}>
                        {timeAgo}
                    </Text>

                    {/* Action Buttons or Status */}
                    {isInvite && !isAccepted && !isDeclined && (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#22C55E',
                                    paddingVertical: 9,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                }}
                                onPress={() => handleAccept(item.id, item.type, item.data)}
                                activeOpacity={0.8}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 14,
                                    color: '#FFFFFF',
                                }}>
                                    Accept
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 0.6,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#F3F4F6',
                                    paddingVertical: 9,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                }}
                                onPress={() => handleDecline(item.id, item.type, item.data)}
                                activeOpacity={0.8}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 14,
                                    color: '#6B7280',
                                }}>
                                    Decline
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    
                    {isAccepted && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 8,
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            backgroundColor: '#DCFCE7',
                            borderRadius: 8,
                            alignSelf: 'flex-start',
                        }}>
                            <Check size={14} color="#059669" strokeWidth={2.5} style={{ marginRight: 6 }} />
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 13,
                                color: '#059669',
                            }}>
                                Accepted
                            </Text>
                        </View>
                    )}

                    {isDeclined && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 8,
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            backgroundColor: '#FEE2E2',
                            borderRadius: 8,
                            alignSelf: 'flex-start',
                        }}>
                            <X size={14} color="#DC2626" strokeWidth={2.5} style={{ marginRight: 6 }} />
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 13,
                                color: '#DC2626',
                            }}>
                                Declined
                            </Text>
                        </View>
                    )}
                </View>

                {/* Unread Indicator */}
                {!item.isRead && (
                    <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#22C55E',
                        marginLeft: 8,
                        marginTop: 6,
                    }} />
                )}
            </TouchableOpacity>
        );
    };

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <ScreenShell>
                <AppHeader title="Notifications" onBack={() => navigation?.goBack()} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                    <ActivityIndicator size="large" color="#5EBC68" />
                </View>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell>
            <AppHeader title="Notifications" onBack={() => navigation?.goBack()} />

            {/* Tabs */}
            <View style={{
                flexDirection: 'row',
                backgroundColor: '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
            }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 14,
                        alignItems: 'center',
                        borderBottomWidth: 2,
                        borderBottomColor: activeTab === 'activity' ? '#22C55E' : 'transparent',
                    }}
                    onPress={() => setActiveTab('activity')}
                    activeOpacity={0.7}
                >
                    <Text style={{
                        fontFamily: activeTab === 'activity' ? 'Inter_600SemiBold' : 'Inter_500Medium',
                        fontSize: 15,
                        color: activeTab === 'activity' ? '#111827' : '#6B7280',
                    }}>
                        Activity
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 14,
                        alignItems: 'center',
                        borderBottomWidth: 2,
                        borderBottomColor: activeTab === 'invites' ? '#22C55E' : 'transparent',
                    }}
                    onPress={() => setActiveTab('invites')}
                    activeOpacity={0.7}
                >
                    <Text style={{
                        fontFamily: activeTab === 'invites' ? 'Inter_600SemiBold' : 'Inter_500Medium',
                        fontSize: 15,
                        color: activeTab === 'invites' ? '#111827' : '#6B7280',
                    }}>
                        Invites
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
                style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5EBC68" />
                }
            >
                {sections.length === 0 ? (
                    <View style={{ paddingTop: 80, alignItems: 'center', paddingHorizontal: 32 }}>
                        <View style={{
                            width: 72,
                            height: 72,
                            borderRadius: 36,
                            backgroundColor: '#F3F4F6',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}>
                            <Bell size={32} color="#9CA3AF" strokeWidth={1.5} />
                        </View>
                        <Text style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 18,
                            color: '#111827',
                            marginBottom: 8,
                        }}>
                            All caught up
                        </Text>
                        <Text style={{
                            fontFamily: 'Inter_400Regular',
                            fontSize: 14,
                            color: '#6B7280',
                            textAlign: 'center',
                        }}>
                            You have no new {activeTab === 'activity' ? 'activity' : 'invites'}. We'll let you know when something happens!
                        </Text>
                    </View>
                ) : (
                    sections.map((section, idx) => (
                        <View key={idx}>
                            {/* Section Header */}
                            <View style={{
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                backgroundColor: '#F9FAFB',
                                borderBottomWidth: 1,
                                borderBottomColor: '#E5E7EB',
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 13,
                                    color: '#6B7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                }}>
                                    {section.title} ({section.count})
                                </Text>
                            </View>
                            {/* Section Items */}
                            {section.items.map(item => renderNotificationItem(item))}
                        </View>
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenShell>
    );
}
