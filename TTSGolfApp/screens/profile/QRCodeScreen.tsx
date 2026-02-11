import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Share,
    Dimensions,
} from "react-native";
import { RefreshCw, Share2 } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { ScreenShell, AppHeader } from "../../ui";
import { useColors } from "../../ui/theme/ThemeContext";
import { draftApi } from "../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QR_SIZE = Math.min(SCREEN_WIDTH * 0.65, 260);

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
            console.error("Share error:", error);
        }
    }, [qrData]);

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
                            <QRCode
                                value={qrData}
                                size={QR_SIZE}
                                color={colors.textPrimary}
                                backgroundColor={colors.surface}
                                logo={undefined}
                                logoSize={50}
                                logoBackgroundColor={colors.surface}
                                quietZone={10}
                                ecl="M"
                            />
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

                {/* Info */}
                <View className="bg-white rounded-md p-5 w-full">
                    <Text className="text-base font-bold text-gray-900 mb-3">How it works</Text>
                    <Text className="text-sm text-gray-500 leading-[22px]">
                        • Share your QR code with other golfers{"\n"}
                        • They scan it using the "Scan to Draft" feature{"\n"}
                        • You'll be added to their On-Deck list{"\n"}
                        • You'll receive a notification when someone adds you
                    </Text>
                </View>
            </View>
        </ScreenShell>
    );
}
