import React from "react";
import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import { User, Camera } from "lucide-react-native";

const COLORS = {
    primary: "#5DB075",
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
        <View style={[styles.container, { width: size, height: size }]}>
            {hasImage ? (
                <Image
                    source={{ uri }}
                    style={[
                        styles.image,
                        { width: size, height: size, borderRadius: size / 2 },
                    ]}
                />
            ) : (
                <View
                    style={[
                        styles.placeholder,
                        { width: size, height: size, borderRadius: size / 2 },
                    ]}
                >
                    <User size={size * 0.5} color={COLORS.textSub} />
                </View>
            )}
            {showCameraButton && (
                <TouchableOpacity
                    style={[
                        styles.cameraButton,
                        { width: cameraSize, height: cameraSize, borderRadius: cameraSize / 2 },
                    ]}
                    onPress={onCameraPress}
                >
                    <Camera size={cameraSize * 0.5} color={COLORS.white} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "relative",
    },
    image: {
        backgroundColor: COLORS.divider,
    },
    placeholder: {
        backgroundColor: COLORS.divider,
        justifyContent: "center",
        alignItems: "center",
    },
    cameraButton: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: COLORS.white,
    },
});
