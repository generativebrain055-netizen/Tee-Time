import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
} from "react-native";
import { MapPin, ChevronDown, Check } from "lucide-react-native";
import { COLORS } from "./constants";

interface OpenInviteStepProps {
    distance: number;
    onDistanceChange: (miles: number) => void;
    creatorName?: string;
    creatorAvatarUrl?: string;
}

const DISTANCE_OPTIONS = [
    { value: 5, label: "5 miles" },
    { value: 10, label: "10 miles" },
    { value: 15, label: "15 miles" },
    { value: 20, label: "20 miles" },
    { value: 25, label: "25 miles" },
    { value: 30, label: "30 miles" },
    { value: 50, label: "50 miles" },
    { value: 100, label: "100 miles" },
];

export default function OpenInviteStep({
    distance,
    onDistanceChange,
    creatorName,
    creatorAvatarUrl,
}: OpenInviteStepProps) {
    const [showPicker, setShowPicker] = useState(false);

    const getSelectedLabel = () => {
        const option = DISTANCE_OPTIONS.find(opt => opt.value === distance);
        return option ? option.label : `${distance} miles`;
    };

    return (
        <ScrollView
            className="flex-1 px-5 pt-2"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 200 }}
        >
            {/* Creator Header */}
            {creatorName && (
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 24,
                    marginTop: 16,
                }}>
                    {creatorAvatarUrl ? (
                        <Image 
                            source={{ uri: creatorAvatarUrl }}
                            style={{ width: 40, height: 40, borderRadius: 20 }}
                        />
                    ) : (
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: '#22C55E',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 14,
                                color: '#FFFFFF',
                            }}>
                                {creatorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </Text>
                        </View>
                    )}
                    <Text style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 16,
                        color: '#374151',
                        marginLeft: 12,
                    }}>
                        {creatorName ?? "Roster host"}
                    </Text>
                </View>
            )}

            {/* Distance Filter Section */}
            <Text style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 14,
                color: '#374151',
                marginBottom: 8,
            }}>
                Distance radius
            </Text>
            <View style={{ marginBottom: 24, zIndex: 1000 }}>
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                    }}
                    onPress={() => setShowPicker(!showPicker)}
                    activeOpacity={0.7}
                >
                    <MapPin size={20} color="#9CA3AF" strokeWidth={2} />
                    <Text style={{
                        flex: 1,
                        fontFamily: 'Inter_400Regular',
                        fontSize: 16,
                        color: '#6B7280',
                        marginLeft: 12,
                    }}>
                        {getSelectedLabel()}
                    </Text>
                    <ChevronDown size={20} color="#9CA3AF" strokeWidth={2} />
                </TouchableOpacity>

                {/* Dropdown */}
                {showPicker && (
                    <View style={{
                        position: 'absolute',
                        top: 56,
                        left: 0,
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5,
                        zIndex: 1001,
                    }}>
                        {DISTANCE_OPTIONS.map((option, index) => (
                            <TouchableOpacity
                                key={option.value}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingVertical: 14,
                                    paddingHorizontal: 16,
                                    borderBottomWidth: index < DISTANCE_OPTIONS.length - 1 ? 1 : 0,
                                    borderBottomColor: '#F3F4F6',
                                }}
                                onPress={() => {
                                    onDistanceChange(option.value);
                                    setShowPicker(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_500Medium',
                                    fontSize: 16,
                                    color: '#111827',
                                }}>
                                    {option.label}
                                </Text>
                                {distance === option.value && (
                                    <Check size={20} color="#22C55E" strokeWidth={2.5} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Info Section */}
            <View style={{
                backgroundColor: '#F0FDF4',
                borderRadius: 8,
                padding: 16,
                marginTop: 8,
            }}>
                <Text style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 14,
                    color: '#166534',
                    marginBottom: 8,
                }}>
                    About Open Invites
                </Text>
                <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: '#166534',
                    lineHeight: 20,
                }}>
                    Your tee time will be visible on the community board to all users within {distance} miles. Anyone can join until all spots are filled.
                </Text>
            </View>

            <View style={{ height: 120 }} />
        </ScrollView>
    );
}
