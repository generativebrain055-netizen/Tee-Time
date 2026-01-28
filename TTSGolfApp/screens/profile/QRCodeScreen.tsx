import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Share,
    Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { RefreshCw, Share2 } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { COLORS } from "../../constants/colors";
import { Header } from "../../components/common";
import { draftApi } from "../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QR_SIZE = Math.min(SCREEN_WIDTH * 0.65, 260);

interface Props {
    navigation: any;
}

export default function QRCodeScreen({ navigation }: Props) {
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
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <Header title="Get Drafted" onBack={() => navigation.goBack()} />

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title}>Your Personal QR Code</Text>
                <Text style={styles.subtitle}>
                    Let others scan this code to quickly add you to their On-Deck list
                </Text>

                {/* QR Code */}
                <View style={styles.qrWrapper}>
                    {loading ? (
                        <View style={[styles.qrPlaceholder, { width: QR_SIZE + 40, height: QR_SIZE + 40 }]}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingText}>Generating QR Code...</Text>
                        </View>
                    ) : qrData ? (
                        <View style={styles.qrContainer}>
                            <QRCode
                                value={qrData}
                                size={QR_SIZE}
                                color={COLORS.textMain}
                                backgroundColor={COLORS.white}
                                logo={undefined}
                                logoSize={50}
                                logoBackgroundColor={COLORS.white}
                                quietZone={10}
                                ecl="M"
                            />
                        </View>
                    ) : (
                        <View style={[styles.qrPlaceholder, { width: QR_SIZE + 40, height: QR_SIZE + 40 }]}>
                            <Text style={styles.errorText}>Failed to load QR code</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={fetchQRCode}>
                                <Text style={styles.retryText}>Tap to retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <Text style={styles.versionText}>Version {version}</Text>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={handleShare}
                        disabled={!qrData}
                    >
                        <Share2 size={20} color={COLORS.primary} />
                        <Text style={styles.actionText}>Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.regenerateBtn]}
                        onPress={handleRegenerate}
                        disabled={regenerating}
                    >
                        {regenerating ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <RefreshCw size={20} color={COLORS.white} />
                        )}
                        <Text style={[styles.actionText, styles.regenerateText]}>
                            {regenerating ? "Regenerating..." : "Regenerate"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>How it works</Text>
                    <Text style={styles.infoText}>
                        • Share your QR code with other golfers{"\n"}
                        • They scan it using the "Scan to Draft" feature{"\n"}
                        • You'll be added to their On-Deck list{"\n"}
                        • You'll receive a notification when someone adds you
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.textSub,
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 22,
    },
    qrWrapper: {
        marginBottom: 12,
    },
    qrContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    qrPlaceholder: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textSub,
    },
    errorText: {
        fontSize: 14,
        color: COLORS.textSub,
        marginBottom: 12,
    },
    retryBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    retryText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
    },
    versionText: {
        fontSize: 12,
        color: COLORS.textSub,
        marginBottom: 20,
    },
    actions: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 24,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 14,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        gap: 8,
    },
    regenerateBtn: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    actionText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.primary,
    },
    regenerateText: {
        color: COLORS.white,
    },
    infoBox: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        width: "100%",
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.textSub,
        lineHeight: 22,
    },
});
