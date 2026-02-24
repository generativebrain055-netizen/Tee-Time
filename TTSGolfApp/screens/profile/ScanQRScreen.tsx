import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    Image,
    Dimensions,
    Animated,
    StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { X, UserPlus, Camera, AlertCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../ui/theme";
import { draftApi, ScannedUser } from "../../services/api";
import { logger } from "../../utils/logger";

interface Props {
    navigation: any;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SCAN_AREA_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);

export default function ScanQRScreen({ navigation }: Props) {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraMounted, setCameraMounted] = useState(false);
    const [lastDetection, setLastDetection] = useState<string>("");
    const lastScannedData = useRef<string>("");
    const scanCooldown = useRef(false);

    // Animated scan line
    const scanLineAnim = useRef(new Animated.Value(0)).current;

    // Request camera permission when screen opens if not already granted
    useEffect(() => {
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission?.granted, permission?.canAskAgain, requestPermission]);

    // Delay mounting CameraView until after layout (fixes black screen on many devices)
    useEffect(() => {
        if (!permission?.granted) return;
        const t = setTimeout(() => setCameraMounted(true), 200);
        return () => clearTimeout(t);
    }, [permission?.granted]);

    useEffect(() => {
        // Animate scan line
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const handleBarCodeScanned = useCallback(({ type, data }: { type: string; data: string }) => {
        // Update last detection for debugging
        setLastDetection(`${type}: ${data.substring(0, 30)}...`);

        logger.debug("[ScanQRScreen] Barcode scanned", { type, dataLength: data.length, scanned, processing, cooldown: scanCooldown.current });

        // Prevent rapid duplicate scans
        if (scanned || processing || scanCooldown.current) {
            logger.debug("[ScanQRScreen] Scan blocked - already processing or in cooldown");
            return;
        }

        if (lastScannedData.current === data) {
            logger.debug("[ScanQRScreen] Scan blocked - duplicate data");
            return;
        }

        logger.debug("[ScanQRScreen] Processing QR code");

        scanCooldown.current = true;
        lastScannedData.current = data;
        setScanned(true);
        setProcessing(true);

        // Process the scan
        (async () => {
            try {
                logger.debug("[ScanQRScreen] Calling draftApi.scanQRCode", { dataPreview: data.substring(0, 50) });
                const result = await draftApi.scanQRCode(data);
                logger.debug("[ScanQRScreen] Scan result", result);

                if (result.success && result.user) {
                    logger.info("[ScanQRScreen] User found", { userId: result.user.id });
                    setScannedUser(result.user);
                    setShowConfirmModal(true);
                } else {
                    logger.warn("[ScanQRScreen] Scan failed", { message: result.message });
                    Alert.alert(
                        "Invalid QR Code",
                        result.message || "This QR code is not valid or has expired.",
                        [{ text: "Try Again", onPress: resetScanner }]
                    );
                }
            } catch (error: any) {
                logger.error("[ScanQRScreen] Scan error", error);
                Alert.alert(
                    "Scan Failed",
                    error.message || "Failed to process QR code. Make sure you're scanning a valid TeeTime QR code.",
                    [{ text: "Try Again", onPress: resetScanner }]
                );
            } finally {
                setProcessing(false);
            }
        })();
    }, [scanned, processing]);

    const resetScanner = useCallback(() => {
        setScanned(false);
        lastScannedData.current = "";
        // Add cooldown to prevent immediate re-scan
        setTimeout(() => {
            scanCooldown.current = false;
        }, 2000);
    }, []);

    const handleConfirmDraft = useCallback(async () => {
        if (!scannedUser) return;

        setConfirming(true);
        try {
            const result = await draftApi.confirmDraft(scannedUser.id);

            if (result.success) {
                Alert.alert(
                    "Success! 🎉",
                    `${scannedUser.name} has been added to your On-Deck list!`,
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to add player");
            setShowConfirmModal(false);
            resetScanner();
        } finally {
            setConfirming(false);
        }
    }, [scannedUser, navigation, resetScanner]);

    const handleClose = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleCancelConfirm = useCallback(() => {
        setShowConfirmModal(false);
        setScannedUser(null);
        resetScanner();
    }, [resetScanner]);

    const GRAY_BG = "#374151";

    // Permission handling
    if (!permission) {
        return (
            <View style={{ flex: 1, backgroundColor: GRAY_BG, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="text-white mt-4 text-sm">Checking camera permission...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={{ flex: 1, backgroundColor: GRAY_BG, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
                <Camera size={64} color={colors.textSecondary} style={{ marginBottom: 24 }} />
                <Text className="text-xl font-bold text-white mb-2">Camera Access Required</Text>
                <Text className="text-[15px] text-white/80 text-center mb-8 leading-[22px]">
                    To scan QR codes, we need access to your camera.
                </Text>
                <TouchableOpacity className="bg-blue-600 px-8 py-3.5 rounded-md mb-4" onPress={requestPermission}>
                    <Text className="text-base font-semibold text-white">Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity className="py-3" onPress={handleClose}>
                    <Text className="text-base text-gray-400">Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const scanLineTranslate = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SCAN_AREA_SIZE - 4],
    });

    return (
        <View className="flex-1 bg-black">
            <StatusBar style="light" />

            {/* Camera - Full screen */}
            <CameraView
                className="flex-1"
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
                onCameraReady={() => {
                    logger.debug("[ScanQRScreen] Camera is ready");
                    setCameraReady(true);
                    logger.debug("[ScanQRScreen] Camera is ready");
                }}
                enableTorch={false}
            />

            {/* Overlay */}
            <View className="absolute inset-0" pointerEvents="box-none">
                {/* Top dark area */}
                <View className="bg-black/70 items-center px-5" style={{ paddingTop: insets.top }}>
                    <View className="flex-row items-center justify-between w-full pt-4 pb-2">
                        <TouchableOpacity className="p-2" onPress={handleClose}>
                            <X size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-white">Scan to Draft</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <Text className="text-sm text-white/80 pb-6">
                        Position the QR code within the frame
                    </Text>
                </View>

                {/* Middle row with scan area */}
                <View className="flex-row" style={{ height: SCAN_AREA_SIZE }}>
                    <View className="flex-1 bg-black/70" />
                    <View className="relative overflow-hidden" style={{ width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE }}>
                        {/* Corner markers */}
                        <View className="absolute top-0 left-0 w-[35px] h-[35px] border-t-4 border-l-4 border-blue-600 rounded-tl-2xl" />
                        <View className="absolute top-0 right-0 w-[35px] h-[35px] border-t-4 border-r-4 border-blue-600 rounded-tr-2xl" />
                        <View className="absolute bottom-0 left-0 w-[35px] h-[35px] border-b-4 border-l-4 border-blue-600 rounded-bl-2xl" />
                        <View className="absolute bottom-0 right-0 w-[35px] h-[35px] border-b-4 border-r-4 border-blue-600 rounded-br-2xl" />

                        {/* Animated scan line */}
                        {cameraReady && !scanned && (
                            <Animated.View
                                className="absolute left-2.5 right-2.5 h-[3px] bg-blue-600 rounded-sm"
                                style={{
                                    transform: [{ translateY: scanLineTranslate }],
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.8,
                                    shadowRadius: 8,
                                }}
                            />
                        )}

                        {/* Processing indicator */}
                        {processing && (
                            <View className="absolute inset-0 bg-black/60 justify-center items-center rounded-md">
                                <ActivityIndicator size="large" color="#fff" />
                                <Text className="text-white mt-3 text-sm font-medium">Processing...</Text>
                            </View>
                        )}

                        {/* Camera starting */}
                        {!cameraReady && (
                            <View className="absolute inset-0 bg-black/60 justify-center items-center rounded-md">
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text className="text-white mt-3 text-sm font-medium">Starting camera...</Text>
                            </View>
                        )}

                        {/* Debug: Show last detection */}
                        {__DEV__ && lastDetection && (
                            <View className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/70 p-2 rounded-md">
                                <Text className="text-white text-[10px] font-mono">{lastDetection}</Text>
                            </View>
                        )}
                    </View>
                    <View className="flex-1 bg-black/70" />
                </View>

                {/* Bottom dark area */}
                <View className="flex-1 bg-black/70 items-center justify-center" style={{ paddingBottom: insets.bottom + 20 }}>
                    <Text className="text-sm text-white/70 text-center leading-5">
                        Ask the player to show their QR code from their profile
                    </Text>
                    {scanned && !processing && !showConfirmModal && (
                        <TouchableOpacity className="mt-6 px-8 py-3.5 bg-blue-600 rounded-[25px]" onPress={resetScanner}>
                            <Text className="text-base font-semibold text-white">Tap to Scan Again</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Confirm Modal */}
            <Modal visible={showConfirmModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: "rgba(55, 65, 81, 0.9)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
                    <View className="bg-white rounded-md p-7 w-full max-w-[360px] items-center">
                        <View className="items-center mb-6">
                            {scannedUser?.avatar ? (
                                <Image source={{ uri: scannedUser.avatar }} className="w-[90px] h-[90px] rounded-full mb-4" />
                            ) : (
                                <View className="w-[90px] h-[90px] rounded-full bg-blue-600 justify-center items-center mb-4">
                                    <Text className="text-4xl font-bold text-white">
                                        {scannedUser?.name?.charAt(0)?.toUpperCase() || "?"}
                                    </Text>
                                </View>
                            )}
                            <Text className="text-[22px] font-bold text-gray-900 mb-3">{scannedUser?.name || "Unknown"}</Text>

                            <View className="flex-row gap-3 mb-3">
                                {scannedUser?.handicap !== undefined && scannedUser?.handicap !== null && (
                                    <View className="bg-gray-50 px-4 py-2 rounded-md items-center">
                                        <Text className="text-[11px] text-gray-500 mb-0.5">Handicap</Text>
                                        <Text className="text-base font-bold text-blue-600">{scannedUser.handicap}</Text>
                                    </View>
                                )}
                                {scannedUser?.socialRate !== undefined && (
                                    <View className="bg-gray-50 px-4 py-2 rounded-md items-center">
                                        <Text className="text-[11px] text-gray-500 mb-0.5">Social Rate</Text>
                                        <Text className="text-base font-bold text-blue-600">{scannedUser.socialRate}</Text>
                                    </View>
                                )}
                            </View>

                            {scannedUser?.homeCourse && (
                                <Text className="text-sm text-gray-500 mt-1">🏌️ {scannedUser.homeCourse}</Text>
                            )}
                            {scannedUser?.location && (
                                <Text className="text-[13px] text-gray-500 mt-0.5">📍 {scannedUser.location}</Text>
                            )}
                        </View>

                        <Text className="text-base text-gray-500 text-center mb-6">
                            Add this player to your On-Deck list?
                        </Text>

                        <View className="flex-row gap-3 w-full">
                            <TouchableOpacity
                                className="flex-1 py-4 rounded-[14px] bg-gray-50 items-center"
                                onPress={handleCancelConfirm}
                                disabled={confirming}
                            >
                                <Text className="text-base font-semibold text-gray-500">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-[1.2] flex-row py-4 rounded-[14px] bg-blue-600 items-center justify-center gap-2"
                                onPress={handleConfirmDraft}
                                disabled={confirming}
                            >
                                {confirming ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <UserPlus size={20} color="#fff" />
                                        <Text className="text-base font-semibold text-white">Add Player</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    cameraPlaceholder: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
    },
    cameraPlaceholderText: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 14,
        marginTop: 12,
    },
    camera: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
});
