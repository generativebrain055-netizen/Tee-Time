import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Share,
    Dimensions,
    Image,
} from "react-native";
import { RefreshCw, Share2, ScanLine } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { ScreenShell, AppHeader } from "../../ui";
import { useColors } from "../../ui/theme/ThemeContext";
import { draftApi } from "../../services/api";
import { logger } from "../../utils/logger";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QR_SIZE = Math.min(SCREEN_WIDTH * 0.65, 260);
/** TeeTime icon in center of QR code (Figma 266-3025) - overlay so it always shows */
const QR_LOGO_SIZE = Math.round(QR_SIZE * 0.22);
const TeeTimeLogo = require("../../assets/compact-logo.png");

interface Props {
    navigation: any;
}

export default function QRCodeScreen({ navigation }: Props) {
    const colors = useColors();
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [qrData, setQrData] = useState<string | null>(null);
    const [version, setVersion] = useState<number>(1);

    const fetchQRCode = useCallback(async () => {
        try {
            setLoading(true);
            const response = await draftApi.getQRCode();
            if (response.success && response.qrCode) {
                setQrData(response.qrCode.data);
                setVersion(response.qrCode.version);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to load QR code");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQRCode();
    }, [fetchQRCode]);

    const handleRegenerate = useCallback(async () => {
        Alert.alert(
            "Regenerate QR Code",
            "This will invalidate your current QR code. Anyone who scanned your old code won't be able to use it. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Regenerate",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setRegenerating(true);
                            const response = await draftApi.regenerateQRCode();
                            if (response.success && response.qrCode) {
                                setQrData(response.qrCode.data);
                                setVersion(response.qrCode.version);
                                Alert.alert("Success", "QR code regenerated successfully!");
                            }
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to regenerate QR code");
                        } finally {
                            setRegenerating(false);
                        }
                    },
                },
            ]
        );
    }, []);

    const handleShare = useCallback(async () => {
        if (!qrData) return;

        try {
            await Share.share({
                message: `Scan my TeeTime QR code to add me to your roster!\n\nCode: ${qrData}`,
                title: "My TeeTime QR Code",
            });
        } catch (error) {
            logger.error("[QRCodeScreen] Share error", error);
        }
    }, [qrData]);

    const handleScan = useCallback(() => {
        navigation?.navigate("ScanQR");
    }, [navigation]);

    return (
        <ScreenShell>
            {/* Header */}
            <AppHeader title="Get Drafted" onBack={() => navigation.goBack()} />

            {/* Content */}
            <View className="flex-1 items-center px-6 pt-6">
                <Text className="text-2xl font-bold text-gray-900 mb-2">Your Personal QR Code</Text>
                <Text className="text-[15px] text-gray-500 text-center mb-6 leading-[22px]">
                    Let others scan this code to quickly add you to their On-Deck list
                </Text>

                {/* QR Code */}
                <View className="mb-3">
                    {loading ? (
                        <View className="bg-white rounded-[20px] items-center justify-center shadow-lg" style={{ width: QR_SIZE + 40, height: QR_SIZE + 40 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text className="mt-3 text-sm text-gray-500">Generating QR Code...</Text>
                        </View>
                    ) : qrData ? (
                        <View className="bg-white rounded-[20px] p-5 items-center justify-center shadow-lg">
                            <View style={{ position: "relative", width: QR_SIZE, height: QR_SIZE }}>
                                <QRCode
                                    value={qrData}
                                    size={QR_SIZE}
                                    color={colors.textPrimary}
                                    backgroundColor={colors.surface}
                                    quietZone={10}
                                    ecl="M"
                                />
                                {/* TeeTime icon centered on QR (Figma 266-3025) - overlay so it always displays */}
                                <View
                                    style={{
                                        position: "absolute",
                                        left: (QR_SIZE - QR_LOGO_SIZE) / 2,
                                        top: (QR_SIZE - QR_LOGO_SIZE) / 2,
                                        width: QR_LOGO_SIZE,
                                        height: QR_LOGO_SIZE,
                                        borderRadius: QR_LOGO_SIZE / 2,
                                        backgroundColor: colors.surface,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "hidden",
                                    }}
                                >
                                    <Image
                                        source={TeeTimeLogo}
                                        style={{ width: QR_LOGO_SIZE * 0.7, height: QR_LOGO_SIZE * 0.7 }}
                                        resizeMode="contain"
                                    />
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View className="bg-white rounded-[20px] items-center justify-center shadow-lg" style={{ width: QR_SIZE + 40, height: QR_SIZE + 40 }}>
                            <Text className="text-sm text-gray-500 mb-3">Failed to load QR code</Text>
                            <TouchableOpacity className="px-4 py-2 bg-blue-600 rounded-md" onPress={fetchQRCode}>
                                <Text className="text-sm font-semibold text-white">Tap to retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <Text className="text-xs text-gray-500 mb-5">Version {version}</Text>

                {/* Scan button - Figma 266-3053: navigate to Scan screen */}
                <TouchableOpacity
                    className="flex-row items-center justify-center w-full py-4 rounded-xl mb-6 gap-2"
                    style={{ backgroundColor: colors.primary }}
                    onPress={handleScan}
                    activeOpacity={0.8}
                >
                    <ScanLine size={22} color="#FFFFFF" strokeWidth={2.5} />
                    <Text className="text-[16px] font-semibold text-white">Scan</Text>
                </TouchableOpacity>

                {/* Actions */}
                <View className="flex-row gap-4 mb-6">
                    <TouchableOpacity
                        className="flex-row items-center px-6 py-3.5 bg-white rounded-md border-[1.5px] border-blue-600 gap-2"
                        onPress={handleShare}
                        disabled={!qrData}
                    >
                        <Share2 size={20} color={colors.primary} />
                        <Text className="text-[15px] font-semibold text-blue-600">Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center px-6 py-3.5 bg-blue-600 rounded-md border-[1.5px] border-blue-600 gap-2"
                        onPress={handleRegenerate}
                        disabled={regenerating}
                    >
                        {regenerating ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <RefreshCw size={20} color="#FFFFFF" />
                        )}
                        <Text className="text-[15px] font-semibold text-white">
                            {regenerating ? "Regenerating..." : "Regenerate"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenShell>
    );
}
