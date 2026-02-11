import React, { useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
} from "react-native";
import { Minus } from "lucide-react-native";
import { Friend } from "../../services/api";

interface ReviewFCFSInviteStepProps {
    friends: Friend[];
    selectedPlayers: string[];
    onRemovePlayer: (playerId: string) => void;
    teeDate: string;
    teeTime: string;
    courseName: string;
    groupName?: string;
}

export default function ReviewFCFSInviteStep({
    friends,
    selectedPlayers,
    onRemovePlayer,
    teeDate,
    teeTime,
    courseName,
    groupName,
}: ReviewFCFSInviteStepProps) {
    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    const selectedFriends = friends.filter(f => selectedPlayers.includes(f.id));

    return (
        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
            {/* Header Info */}
            <View style={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 16,
                backgroundColor: '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
            }}>
                <Text style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 16,
                    color: '#6B7280',
                    textAlign: 'center',
                    marginBottom: 4,
                }}>
                    {teeDate} - {teeTime}
                </Text>
                <Text style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 16,
                    color: '#6B7280',
                    textAlign: 'center',
                }}>
                    {courseName}
                </Text>
            </View>

            <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Instructions */}
                <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: '#6B7280',
                    textAlign: 'center',
                    marginBottom: 20,
                }}>
                    Remove any players before sending out invite
                </Text>

                {/* Group Name (if applicable) */}
                {groupName && (
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 16,
                    }}>
                        <Text style={{
                            fontFamily: 'Inter_700Bold',
                            fontSize: 18,
                            color: '#111827',
                        }}>
                            {groupName}
                        </Text>
                        <Text style={{
                            fontFamily: 'Inter_400Regular',
                            fontSize: 14,
                            color: '#9CA3AF',
                        }}>
                            {selectedFriends.length} members
                        </Text>
                    </View>
                )}

                {/* Player List */}
                <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    overflow: 'hidden',
                }}>
                    {selectedFriends.map((friend, index) => (
                        <View 
                            key={friend.id} 
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                borderBottomWidth: index < selectedFriends.length - 1 ? 1 : 0,
                                borderBottomColor: '#F3F4F6',
                            }}
                        >
                            {/* Avatar */}
                            {friend.avatar ? (
                                <Image 
                                    source={{ uri: friend.avatar }} 
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 24,
                                    }}
                                />
                            ) : (
                                <View style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: '#22C55E',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 16,
                                        color: '#FFFFFF',
                                    }}>
                                        {getInitials(friend.firstName, friend.lastName)}
                                    </Text>
                                </View>
                            )}

                            {/* Name */}
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#111827',
                                }}>
                                    {friend.firstName} {friend.lastName}
                                </Text>
                            </View>

                            {/* Remove Button */}
                            <TouchableOpacity
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: '#F3F4F6',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                                onPress={() => onRemovePlayer(friend.id)}
                                activeOpacity={0.7}
                            >
                                <Minus size={18} color="#6B7280" strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {selectedFriends.length === 0 && (
                        <View style={{
                            alignItems: 'center',
                            paddingVertical: 40,
                            paddingHorizontal: 20,
                        }}>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#111827',
                                marginBottom: 8,
                            }}>
                                No players selected
                            </Text>
                            <Text style={{
                                fontFamily: 'Inter_400Regular',
                                fontSize: 14,
                                color: '#6B7280',
                                textAlign: 'center',
                            }}>
                                Go back to select players
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
