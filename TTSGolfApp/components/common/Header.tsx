import React, { memo, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { COLORS } from "../../constants/colors";

interface HeaderProps {
    title: string;
    onBack?: () => void;
    showBack?: boolean;
    rightComponent?: ReactNode;
    leftComponent?: ReactNode;
    transparent?: boolean;
    lightContent?: boolean;
    style?: ViewStyle;
}

const Header = memo(({
    title,
    onBack,
    showBack = true,
    rightComponent,
    leftComponent,
    transparent = false,
    lightContent = false,
    style,
}: HeaderProps) => {
    const insets = useSafeAreaInsets();
    const textColor = lightContent ? COLORS.white : COLORS.textMain;

    return (
        <View
            style={[
                styles.container,
                { paddingTop: insets.top + 8 },
                transparent && styles.transparent,
                style,
            ]}
        >
            <View style={styles.content}>
                {/* Left side */}
                <View style={styles.leftContainer}>
                    {leftComponent ? (
                        leftComponent
                    ) : showBack && onBack ? (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={onBack}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <ArrowLeft size={24} color={textColor} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.placeholder} />
                    )}
                </View>

                {/* Title */}
                <View style={styles.titleContainer}>
                    <Text
                        style={[styles.title, { color: textColor }]}
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                </View>

                {/* Right side */}
                <View style={styles.rightContainer}>
                    {rightComponent || <View style={styles.placeholder} />}
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    transparent: {
        backgroundColor: "transparent",
        borderBottomWidth: 0,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
        minHeight: 44,
    },
    leftContainer: {
        width: 60,
        alignItems: "flex-start",
    },
    titleContainer: {
        flex: 1,
        alignItems: "center",
    },
    rightContainer: {
        width: 60,
        alignItems: "flex-end",
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 17,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    placeholder: {
        width: 32,
    },
});

export default Header;
