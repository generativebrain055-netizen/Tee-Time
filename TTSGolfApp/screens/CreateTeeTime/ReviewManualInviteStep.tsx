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
import { GripVertical, Minus } from "lucide-react-native";
import { Friend } from "../../services/api";

interface ReviewManualInviteStepProps {
    friends: Friend[];
    orderedPlayers: string[];
    onReorderPlayers: (orderedIds: string[]) => void;
    onRemovePlayer: (playerId: string) => void;
    teeDate: string;
    teeTime: string;
    courseName: string;
}

interface OrderedPlayer extends Friend {
    order: number;
}

export default function ReviewManualInviteStep({
    friends,
    orderedPlayers,
    onReorderPlayers,
    onRemovePlayer,
    teeDate,
    teeTime,
    courseName,
}: ReviewManualInviteStepProps) {
    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    // Get ordered friends list with order numbers - memoized to prevent re-renders
    const orderedFriends = useMemo((): OrderedPlayer[] => {
        return orderedPlayers
            .map((id, index) => {
                const friend = friends.find((f) => f.id === id);
                if (!friend) return null;
                return { ...friend, order: index + 1 };
            })
            .filter(Boolean) as OrderedPlayer[];
    }, [orderedPlayers, friends]);

    // Memoize drag end handler
    const handleDragEnd = useCallback(({ data }: { data: OrderedPlayer[] }) => {
        const newOrder = data.map(item => item.id);
        onReorderPlayers(newOrder);
    }, [onReorderPlayers]);

    // Memoize remove handler
    const handleRemove = useCallback((itemId: string) => {
        onRemovePlayer(itemId);
    }, [onRemovePlayer]);

    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<OrderedPlayer>) => {
        return (
            <ScaleDecorator>
                <View
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        marginBottom: 12,
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
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

                    {/* Order Number */}
                    <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#D1D5DB',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginLeft: 4,
                    }}>
                        <Text style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 14,
                            color: '#FFFFFF',
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
    }, [handleRemove]);

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

            {/* Draggable List */}
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
                <DraggableFlatList
                    data={orderedFriends}
                    onDragEnd={handleDragEnd}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    activationDistance={10}
                    animationConfig={{
                        damping: 20,
                        stiffness: 100,
                    }}
                />
            </View>
        </View>
    );
}
