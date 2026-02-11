import React, { memo } from "react";
import { View, Text, Image } from "react-native";
import { Calendar, MapPin, CheckCircle2 } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { TeeTime } from "../../../../services/api";
import { formatDate } from "../utils";

interface TeeTimeCardProps {
    teeTime: TeeTime;
}

export const TeeTimeCard = memo(({ teeTime }: TeeTimeCardProps) => (
    <View className="border border-gray-100 rounded-md p-4 mb-3 shadow-sm" style={{ backgroundColor: COLORS.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
        <View className="flex-row gap-3 mb-4">
            <Calendar size={18} color={COLORS.textSub} />
            <View className="flex-1">
                <Text className="text-sm font-bold" style={{ color: COLORS.textMain }}>{formatDate(teeTime.teeDate)}</Text>
                <Text className="text-xs mt-0.5" style={{ color: COLORS.textSub }}>{teeTime.teeTime}</Text>
            </View>
        </View>
        <View className="flex-row gap-3 mb-4">
            <MapPin size={18} color={COLORS.textSub} />
            <View className="flex-1">
                <Text className="text-sm font-bold" style={{ color: COLORS.textMain }}>{teeTime.courseName}</Text>
                {teeTime.courseLocation && (
                    <Text className="text-xs mt-0.5" style={{ color: COLORS.textSub }}>{teeTime.courseLocation}</Text>
                )}
            </View>
        </View>
        <View className="flex-row items-center gap-2 pt-2 border-t border-gray-50">
            <View className="flex-row">
                {(teeTime.participants || []).slice(0, 4).map((p, idx) => (
                    <View key={p.id} className="relative" style={{ marginLeft: idx > 0 ? -8 : 0 }}>
                        {p.avatar ? (
                            <Image source={{ uri: p.avatar }} className="w-8 h-8 rounded-full border-2" style={{ borderColor: COLORS.white, backgroundColor: COLORS.divider }} />
                        ) : (
                            <View className="w-8 h-8 rounded-full border-2 justify-center items-center bg-gray-200" style={{ borderColor: COLORS.white }}>
                                <Text className="text-[10px] font-semibold" style={{ color: COLORS.textSub }}>
                                    {p.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </Text>
                            </View>
                        )}
                        <View className="absolute bottom-0 right-0 bg-green-500 rounded-md border w-3 h-3 justify-center items-center" style={{ borderColor: COLORS.white }}>
                            <CheckCircle2 size={8} color="white" />
                        </View>
                    </View>
                ))}
            </View>
            {teeTime.participantCount > 4 && (
                <Text className="text-xs ml-2" style={{ color: COLORS.textSub }}>+{teeTime.participantCount - 4} others</Text>
            )}
        </View>
    </View>
));
