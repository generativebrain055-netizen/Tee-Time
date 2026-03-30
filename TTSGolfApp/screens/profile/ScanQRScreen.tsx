import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    Image,
    Dimensions,
    Animated,
    Platform,
    ScrollView,
    KeyboardAvoidingView,
} from "react-native";
import * as Device from "expo-device";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { X, UserPlus, Camera } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../ui/theme";
import { draftApi, ScannedUser } from "../../services/api";
import { logger } from "../../utils/logger";

interface Props {
    navigation: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SCAN_AREA_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);

/** Match backend normalizeDraftQrRawInput — scanners often add whitespace/newlines. */
function normalizeScannedQrData(data: string): string {
    let s = String(data).trim();
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    return s.replace(/\s+/g, "");
}

export default function ScanQRScreen({ navigation }: Props) {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
    const [canAddToOnDeck, setCanAddToOnDeck] = useState(true);
    const [statusDetailLines, setStatusDetailLines] = useState<string[]>([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [lastDetection, setLastDetection] = useState<string>("");
    /** iOS/Android simulators often have no camera preview — allow manual entry after a short wait. */
    const [cameraPreviewLikelyUnavailable, setCameraPreviewLikelyUnavailable] = useState(false);
    const [manualEntryOpen, setManualEntryOpen] = useState(false);
    const [manualPayload, setManualPayload] = useState("");
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

    useEffect(() => {
        if (!permission?.granted) {
            setCameraPreviewLikelyUnavailable(false);
            return;
        }
        const isSim = !Device.isDevice;
        if (!isSim) return;
        const t = setTimeout(() => {
            setCameraPreviewLikelyUnavailable((prev) => prev || !cameraReady);
        }, 4000);
        return () => clearTimeout(t);
    }, [permission?.granted, cameraReady]);

    useEffect(() => {
        if (cameraPreviewLikelyUnavailable && !Device.isDevice) {
            setManualEntryOpen(true);
        }
    }, [cameraPreviewLikelyUnavailable]);

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
        const payload = normalizeScannedQrData(data);
        if (!payload) {
            return;
        }

        // Update last detection for debugging
        setLastDetection(`${type}: ${payload.substring(0, 30)}...`);

        logger.debug("[ScanQRScreen] Barcode scanned", { type, dataLength: payload.length, scanned, processing, cooldown: scanCooldown.current });

        // Prevent rapid duplicate scans
        if (scanned || processing || scanCooldown.current) {
            logger.debug("[ScanQRScreen] Scan blocked - already processing or in cooldown");
            return;
        }

        if (lastScannedData.current === payload) {
            logger.debug("[ScanQRScreen] Scan blocked - duplicate data");
            return;
        }

        logger.debug("[ScanQRScreen] Processing QR code");

        scanCooldown.current = true;
        lastScannedData.current = payload;
        setScanned(true);
        setProcessing(true);

        // Process the scan
        (async () => {
            try {
                logger.debug("[ScanQRScreen] Calling draftApi.scanQRCode", { dataPreview: payload.substring(0, 50) });
                const result = await draftApi.scanQRCode(payload);
                logger.debug("[ScanQRScreen] Scan result", result);

                if (result.success && result.user) {
                    logger.info("[ScanQRScreen] User found", { userId: result.user.id });
                    setScannedUser(result.user);
                    setCanAddToOnDeck(result.canAddToOnDeck !== false);
                    setStatusDetailLines(
                        Array.isArray(result.statusDetailLines) ? result.statusDetailLines : []
                    );
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
        setManualPayload("");
        // Add cooldown to prevent immediate re-scan
        setTimeout(() => {
            scanCooldown.current = false;
        }, 2000);
    }, []);

    const handleConfirmDraft = useCallback(async () => {
        if (!scannedUser || !canAddToOnDeck) return;

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
    }, [scannedUser, canAddToOnDeck, navigation, resetScanner]);

    const handleClose = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleCancelConfirm = useCallback(() => {
        setShowConfirmModal(false);
        setScannedUser(null);
        setCanAddToOnDeck(true);
        setStatusDetailLines([]);
        resetScanner();
    }, [resetScanner]);

    const scanLineTranslate = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SCAN_AREA_SIZE - 4],
    });

    const cameraActive = permission?.granted === true;
    const scanAreaBlocked =
        cameraActive && !processing && !cameraReady && !cameraPreviewLikelyUnavailable;

    return (
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
            <StatusBar style="light" />

            {/* Camera - only mounted when permission is granted on a real device */}
            {cameraActive && (
                <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                    onCameraReady={() => {
                        logger.debug("[ScanQRScreen] Camera is ready");
                        setCameraReady(true);
                        setCameraPreviewLikelyUnavailable(false);
                    }}
                    enableTorch={false}
                />
            )}

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

                        {/* Animated scan line – shown once camera is live */}
                        {(cameraReady || cameraPreviewLikelyUnavailable) && !scanned && (
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

                        {/* Camera initialising / permission loading */}
                        {scanAreaBlocked && !processing && (
                            <View className="absolute inset-0 bg-black/60 justify-center items-center rounded-md">
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text className="text-white mt-3 text-sm font-medium">Starting camera...</Text>
                            </View>
                        )}

                        {cameraPreviewLikelyUnavailable && !cameraReady && !processing && (
                            <View className="absolute inset-0 bg-black/70 justify-center items-center rounded-md px-3">
                                <Text className="text-white text-sm text-center leading-5">
                                    Camera preview isn’t available on this simulator. Use “Enter code manually” below, or test on a physical device.
                                </Text>
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

                {/* Bottom: hints + optional manual entry (primary flow is camera scanning) */}
                <KeyboardAvoidingView
                    className="flex-1 bg-black/70"
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={insets.top + 40}
                    style={{ paddingBottom: insets.bottom + 12 }}
                >
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{
                            paddingHorizontal: 20,
                            paddingTop: 12,
                            paddingBottom: 8,
                            alignItems: "center",
                        }}
                    >
                        <Text className="text-sm text-white/70 text-center leading-5 mb-3">
                            Point your camera at the other player’s QR code (Profile → Draft via QR).
                        </Text>
                        {scanned && !processing && !showConfirmModal && (
                            <TouchableOpacity className="mb-4 px-8 py-3.5 bg-blue-600 rounded-[25px]" onPress={resetScanner}>
                                <Text className="text-base font-semibold text-white">Scan again</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => setManualEntryOpen((o) => !o)}
                            disabled={processing}
                            className="py-2"
                        >
                            <Text className="text-sm text-blue-300 text-center underline">
                                {manualEntryOpen ? "Hide manual entry" : "Trouble scanning? Enter code manually"}
                            </Text>
                        </TouchableOpacity>
                        {manualEntryOpen && (
                            <View className="w-full mt-2">
                                <TextInput
                                    value={manualPayload}
                                    onChangeText={setManualPayload}
                                    placeholder="Paste QR payload (same data encoded in the QR)"
                                    placeholderTextColor="rgba(255,255,255,0.35)"
                                    editable={!processing}
                                    multiline
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={{
                                        backgroundColor: "rgba(255,255,255,0.08)",
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: "rgba(255,255,255,0.2)",
                                        color: "#fff",
                                        fontSize: 14,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        minHeight: 88,
                                        textAlignVertical: "top",
                                        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                                    }}
                                />
                                <TouchableOpacity
                                    className="bg-blue-600 rounded-xl py-3.5 items-center mt-3"
                                    disabled={processing}
                                    onPress={() => {
                                        const data = normalizeScannedQrData(manualPayload);
                                        if (!data) {
                                            Alert.alert("Empty", "Paste the QR payload first.");
                                            return;
                                        }
                                        handleBarCodeScanned({ type: "qr", data });
                                    }}
                                >
                                    {processing ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text className="text-base font-semibold text-white">Use this code</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            {/* Permission denied – full-screen prompt on all platforms */}
            {permission && !permission.granted && (
                <View style={{ position: "absolute", inset: 0, backgroundColor: "#111827", justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
                    <TouchableOpacity style={{ position: "absolute", top: insets.top + 16, left: 20, padding: 8 }} onPress={handleClose}>
                        <X size={28} color="#fff" />
                    </TouchableOpacity>
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
            )}

            {/* Confirm Modal */}
            <Modal visible={showConfirmModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: "rgba(55, 65, 81, 0.9)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
                    <View className="bg-white rounded-md p-7 w-full max-w-[360px] items-center">
                        <View className="items-center mb-6">
                            {scannedUser?.avatar ? (
                                <Image source={{ uri: scannedUser.avatar }} className="w-[90px] h-[90px] rounded-full mb-4" />
                            ) : (
                                <View className="w-[90px] h-[90px] rounded-full justify-center items-center mb-4" style={{ backgroundColor: '#5EBC68' }}>
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

                        {statusDetailLines.length > 0 ? (
                            <View className="w-full mb-4 px-1">
                                {statusDetailLines.map((line, idx) => (
                                    <Text
                                        key={idx}
                                        className="text-[15px] text-gray-600 text-center leading-[22px] mb-2"
                                    >
                                        {line}
                                    </Text>
                                ))}
                            </View>
                        ) : null}

                        <Text className="text-base text-gray-500 text-center mb-6">
                            {canAddToOnDeck
                                ? "Add this player to your On-Deck list?"
                                : "You can’t add them from this scan right now."}
                        </Text>

                        <View className="flex-row gap-3 w-full">
                            {canAddToOnDeck ? (
                                <>
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
                                </>
                            ) : (
                                <TouchableOpacity
                                    className="flex-1 py-4 rounded-[14px] bg-gray-100 items-center"
                                    onPress={handleCancelConfirm}
                                    disabled={confirming}
                                >
                                    <Text className="text-base font-semibold text-gray-700">Close</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

