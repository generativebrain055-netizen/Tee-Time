import React from "react";
import { View, Image, TouchableOpacity } from "react-native";
import { User, Camera } from "lucide-react-native";

const COLORS = {
    primary: "#5EBC68",
    divider: "#E5E7EB",
    white: "#FFFFFF",
    textSub: "#6B7280",
};

interface AvatarProps {
    uri?: string | null;
    size?: number;
    showCameraButton?: boolean;
    onCameraPress?: () => void;
}

export default function Avatar({
    uri,
    size = 120,
    showCameraButton = false,
    onCameraPress,
}: AvatarProps) {
    const hasImage = uri && uri.length > 0;
    const cameraSize = Math.max(32, size * 0.33);

    return (
        <View className="relative" style={{ width: size, height: size }}>
            {hasImage ? (
                <Image
                    source={{ uri }}
                    className="bg-gray-200"
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    }}
                />
            ) : (
                <View
                    className="bg-gray-200 justify-center items-center"
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    }}
                >
                    <User size={size * 0.5} color={COLORS.textSub} />
                </View>
            )}
            {showCameraButton && (
                <TouchableOpacity
                    className="absolute bottom-0 right-0 bg-primary justify-center items-center border-[3px] border-white"
                    style={{
                        width: cameraSize,
                        height: cameraSize,
                        borderRadius: cameraSize / 2,
                    }}
                    onPress={onCameraPress}
                >
                    <Camera size={cameraSize * 0.5} color={COLORS.white} />
                </TouchableOpacity>
            )}
        </View>
    );
}
