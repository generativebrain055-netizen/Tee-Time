import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Clock, Zap, List } from "lucide-react-native";
import { COLORS } from "./constants";

export type InviteType = "roster" | "fcfs" | "manual";

interface InviteTypeStepProps {
    inviteType: InviteType;
    onSelectType: (type: InviteType) => void;
}

const OPTIONS = [
    {
        type: "roster" as const,
        title: "Roster Invite",
        desc: "Players are invited one by one in roster order until all spots are filled.",
        icon: Clock,
        iconBg: "#E0F2FE",
        iconColor: "#0284C7",
    },
    {
        type: "fcfs" as const,
        title: "First Come First Serve",
        desc: "Broadcast the invite to your roster or a group; the first to accept get the spots.",
        icon: Zap,
        iconBg: "#FEF3C7",
        iconColor: "#F59E0B",
    },
    {
        type: "manual" as const,
        title: "Manual Invite",
        desc: "Manually select invitees from your roster, on-deck list, or groups.",
        icon: List,
        iconBg: "#F3E8FF",
        iconColor: "#9333EA",
    },
];

export default function InviteTypeStep({ inviteType, onSelectType }: InviteTypeStepProps) {
    return (
        <View style={{ flex: 1, backgroundColor: '#F3F4F6', paddingHorizontal: 20, paddingTop: 24 }}>
            {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = inviteType === opt.type;
                return (
                    <TouchableOpacity
                        key={opt.type}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 24,
                            borderRadius: 8,
                            marginBottom: 16,
                            backgroundColor: '#FFFFFF',
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? '#22C55E' : '#E5E7EB',
                        }}
                        onPress={() => onSelectType(opt.type)}
                        activeOpacity={0.6}
                    >
                        <View style={{
                            width: 52,
                            height: 52,
                            borderRadius: 8,
                            backgroundColor: opt.iconBg,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 16,
                        }}>
                            <Icon size={24} color={opt.iconColor} strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontFamily: 'Inter_700Bold',
                                fontSize: 18,
                                color: '#111827',
                                marginBottom: 6,
                            }}>
                                {opt.title}
                            </Text>
                            <Text style={{
                                fontFamily: 'Inter_400Regular',
                                fontSize: 14,
                                color: '#6B7280',
                                lineHeight: 20,
                            }}>
                                {opt.desc}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
