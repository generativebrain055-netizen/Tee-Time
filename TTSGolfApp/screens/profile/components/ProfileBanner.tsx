import React, { memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
} from "react-native";
import { LogOut } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";
import Svg, { Rect, Defs, Pattern, Image as SvgImage } from 'react-native-svg';

const ProfileBgSvg = () => (
    <Svg width="100%" height="180" viewBox="0 0 402 130" preserveAspectRatio="xMidYMid slice">
        <Defs>
            <Pattern id="pattern0" patternContentUnits="objectBoundingBox" width="1" height="1">
                <SvgImage
                    href={require('../../../assets/Profile-Bg.svg')}
                    width="402"
                    height="130"
                    preserveAspectRatio="xMidYMid slice"
                />
            </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#pattern0)" />
        <Rect width="100%" height="100%" fill="#5EBC68" opacity="0.3" />
    </Svg>
);

interface ProfileBannerProps {
    avatar?: string;
    initials: string;
    topInset: number;
    onSignOut: () => void;
}

const ProfileBanner = memo(({
    avatar,
    initials,
    topInset,
    onSignOut,
}: ProfileBannerProps) => (
    <View className="relative mb-[50px]">
        <View className="h-[180px] w-full overflow-hidden bg-gray-200">
            <Image 
                source={require('../../../assets/Profile-Bg.svg')} 
                className="w-full h-full"
                style={{ resizeMode: 'cover' }}
            />
            <View className="absolute inset-0 bg-primary/30" />
            <View className="absolute inset-0" style={{ paddingTop: topInset }}>
                <View className="flex-row justify-between px-4 pt-2 pb-2">
                    <View style={{ width: 40 }} />
                    <TouchableOpacity className="w-10 h-10 rounded-full bg-black/30 justify-center items-center" onPress={onSignOut}>
                        <LogOut size={22} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>

        <View className="absolute -bottom-[45px] self-center">
            {avatar ? (
                <Image source={{ uri: avatar }} className="w-[100px] h-[100px] rounded-full border-4 border-white" />
            ) : (
                <View className="w-[100px] h-[100px] rounded-full justify-center items-center border-4 border-white" style={{ backgroundColor: COLORS.primary }}>
                    <Text className="text-4xl font-bold text-white">{initials}</Text>
                </View>
            )}
        </View>
    </View>
));

export default ProfileBanner;
