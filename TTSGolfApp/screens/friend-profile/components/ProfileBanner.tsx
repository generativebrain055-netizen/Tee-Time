import React, { memo } from "react";
import { View, Text, Image, ImageBackground, TouchableOpacity, StyleSheet } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";

const DEFAULT_BANNER = "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80";

interface Props {
    avatar?: string;
    initials: string;
    topInset: number;
    onBack: () => void;
}

const ProfileBanner = memo(({ avatar, initials, topInset, onBack }: Props) => (
    <View style={styles.container}>
        <ImageBackground
            source={{ uri: DEFAULT_BANNER }}
            style={styles.banner}
            imageStyle={styles.bannerImage}
        >
            <View style={[styles.overlay, { paddingTop: topInset }]}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
                        <ArrowLeft size={22} color={COLORS.white} />
                    </TouchableOpacity>
                    <View style={styles.spacer} />
                </View>
            </View>
        </ImageBackground>

        <View style={styles.avatarContainer}>
            {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
            )}
        </View>
    </View>
));

const styles = StyleSheet.create({
    container: {
        position: "relative",
        marginBottom: 50,
    },
    banner: {
        height: 180,
        width: "100%",
    },
    bannerImage: {
        resizeMode: "cover",
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.2)",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    spacer: {
        width: 40,
    },
    avatarContainer: {
        position: "absolute",
        bottom: -45,
        alignSelf: "center",
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: COLORS.white,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: COLORS.white,
    },
    avatarInitials: {
        fontSize: 36,
        fontWeight: "bold",
        color: COLORS.white,
    },
});

export default ProfileBanner;
