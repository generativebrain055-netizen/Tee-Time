import React, { useMemo, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
} from "react-native";
import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GripVertical, Minus, Phone } from "lucide-react-native";
import { Friend } from "../../services/api";

export interface PhoneInviteEntry {
    phone: string;
    name: string;
}

interface ReviewInviteOrderStepProps {
    friends: Friend[];
    orderedPlayers: string[];
    onReorderPlayers: (orderedIds: string[]) => void;
    teeDate: string;
    teeTime: string;
    courseName: string;
    groupSize: number; // maxPlayers - used to determine initial vs backup invites
    /** Phone-only invitees (e.g. from "Invite via phone number") */
    phoneInvites?: PhoneInviteEntry[];
    onRemovePhoneInvite?: (phone: string) => void;
    /** Opens "Add more" modal (Select from players / Invite via phone number) */
    onAddMore?: () => void;
}

interface OrderedPlayer extends Friend {
    order: number;
}

export default function ReviewInviteOrderStep({
    friends,
    orderedPlayers,
    onReorderPlayers,
    teeDate,
    teeTime,
    courseName,
    groupSize,
    phoneInvites = [],
    onRemovePhoneInvite,
    onAddMore,
}: ReviewInviteOrderStepProps) {
    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    // Get ordered friends list with order numbers - memoized to prevent re-renders
    const orderedFriends = useMemo((): OrderedPlayer[] => {
        const result = orderedPlayers
            .map((id, index) => {
                const friend = friends.find((f) => f.id === id);
                if (!friend) return null;
                return { ...friend, order: index + 1 };
            })
            .filter(Boolean) as OrderedPlayer[];
        
        return result;
    }, [orderedPlayers, friends]);

    // Memoize drag end handler
    const handleDragEnd = useCallback(({ data }: { data: OrderedPlayer[] }) => {
        const newOrder = data.map(item => item.id);
        onReorderPlayers(newOrder);
    }, [onReorderPlayers]);

    // Memoize remove handler
    const handleRemove = useCallback((itemId: string) => {
        const newOrder = orderedPlayers.filter(id => id !== itemId);
        onReorderPlayers(newOrder);
    }, [orderedPlayers, onReorderPlayers]);

    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<OrderedPlayer>) => {
        // Initial invites: first (groupSize - 1) players (since creator is already counted)
        // Backup invites: remaining players
        const initialInviteCount = Math.max(0, groupSize - 1);
        const isInitialInvite = item.order <= initialInviteCount;
        return (
            <ScaleDecorator>
                <View
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        marginBottom: 12,
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        shadowColor: isActive ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isActive ? 0.15 : 0,
                        shadowRadius: 8,
                        elevation: isActive ? 5 : 0,
                        opacity: isActive ? 0.9 : 1,
                    }}
                >
                    {/* Drag Handle */}
                    <TouchableOpacity
                        onPressIn={drag}
                        style={{
                            padding: 4,
                            marginRight: 8,
                        }}
                        activeOpacity={0.7}
                    >
                        <GripVertical size={20} color="#9CA3AF" strokeWidth={2} />
                    </TouchableOpacity>

                    {/* Order Number – Initial invites (green), Backup invites (grey) */}
                    <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isInitialInvite ? '#22C55E' : '#D1D5DB',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginLeft: 4,
                    }}>
                        <Text style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 14,
                            color: isInitialInvite ? '#FFFFFF' : '#374151',
                        }}>
                            {item.order}
                        </Text>
                    </View>

                    {/* Avatar */}
                    {item.avatar ? (
                        <Image 
                            source={{ uri: item.avatar }} 
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                marginLeft: 12,
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
                            marginLeft: 12,
                        }}>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#FFFFFF',
                            }}>
                                {getInitials(item.firstName, item.lastName)}
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
                            {item.firstName} {item.lastName}
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
                        onPress={() => handleRemove(item.id)}
                        activeOpacity={0.7}
                    >
                        <Minus size={18} color="#6B7280" strokeWidth={2} />
                    </TouchableOpacity>
                </View>
            </ScaleDecorator>
        );
    }, [handleRemove, groupSize]);

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

            {/* Instructions */}
            <View style={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 12,
            }}>
                <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: '#6B7280',
                    textAlign: 'center',
                }}>
                    Review and customize your invite order
                </Text>
            </View>

            {/* Draggable List + Phone Invites + Add more */}
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
                <DraggableFlatList
                    data={orderedFriends}
                    onDragEnd={handleDragEnd}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 12 }}
                    showsVerticalScrollIndicator={false}
                    activationDistance={10}
                    animationConfig={{
                        damping: 20,
                        stiffness: 100,
                    }}
                />
                {/* Phone invite rows */}
                {phoneInvites.map((entry, index) => {
                    const orderNum = orderedFriends.length + index + 1;
                    const isInitialInvite = orderNum <= Math.max(0, groupSize - 1);
                    return (
                        <View
                            key={`phone-${entry.phone}-${index}`}
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: 8,
                                marginBottom: 12,
                                paddingVertical: 16,
                                paddingHorizontal: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: '#E5E7EB',
                            }}
                        >
                            <View style={{ padding: 4, marginRight: 8 }} />
                            <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: isInitialInvite ? '#22C55E' : '#D1D5DB',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginLeft: 4,
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 14,
                                    color: isInitialInvite ? '#FFFFFF' : '#374151',
                                }}>
                                    {orderNum}
                                </Text>
                            </View>
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: '#E5E7EB',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginLeft: 12,
                            }}>
                                <Phone size={24} color="#6B7280" strokeWidth={2} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#111827',
                                }}>
                                    {entry.phone}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: '#F3F4F6',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                                onPress={() => onRemovePhoneInvite?.(entry.phone)}
                                activeOpacity={0.7}
                            >
                                <Minus size={18} color="#6B7280" strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                    );
                })}
                {onAddMore != null && (
                    <TouchableOpacity
                        onPress={onAddMore}
                        style={{ paddingVertical: 16, alignItems: 'center' }}
                        activeOpacity={0.7}
                    >
                        <Text style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 15,
                            color: '#3B82F6',
                        }}>
                            + Add more
                        </Text>
                    </TouchableOpacity>
                )}
                <View style={{ height: 100 }} />
            </View>
        </View>
    );
}
