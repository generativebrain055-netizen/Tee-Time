import React, { memo } from "react";
import { View, Text, ImageBackground, TouchableOpacity } from "react-native";
import { ArrowLeft, Settings } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";

const DEFAULT_BANNER = "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80";

interface Props {
    initials: string;
    color?: string;
    topInset: number;
    isOwner?: boolean;
    onBack: () => void;
    onSettings: () => void;
}

const GroupBanner = memo(({ initials, color, topInset, isOwner, onBack, onSettings }: Props) => (
    <View className="relative mb-[50px]">
        <ImageBackground
            source={{ uri: DEFAULT_BANNER }}
            className="h-[180px] w-full"
            imageStyle={{ resizeMode: "cover" }}
        >
            <View className="flex-1 bg-black/20" style={{ paddingTop: topInset }}>
                <View className="flex-row justify-between px-4 pt-2">
                    <TouchableOpacity className="w-10 h-10 rounded-full bg-black/30 justify-center items-center" onPress={onBack}>
                        <ArrowLeft size={22} color={COLORS.white} />
                    </TouchableOpacity>
                    {isOwner !== false && (
                        <TouchableOpacity className="w-10 h-10 rounded-full bg-black/30 justify-center items-center" onPress={onSettings}>
                            <Settings size={22} color={COLORS.white} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ImageBackground>

        <View className="absolute -bottom-[45px] self-center">
            <View className="w-[100px] h-[100px] rounded-full justify-center items-center border-4" style={{ backgroundColor: (color || COLORS.primary) + "30", borderColor: COLORS.white }}>
                <Text className="text-[32px] font-bold" style={{ color: color || COLORS.primary }}>
                    {initials}
                </Text>
            </View>
        </View>
    </View>
));

export default GroupBanner;
