import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
    StyleSheet,
    AppState,
    type AppStateStatus,
} from "react-native";
import * as Device from "expo-device";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { X, UserPlus, Camera } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../ui/theme";
import { draftApi, ScannedUser } from "../../services/api";
import { logger } from "../../utils/logger";
import { getMemberSinceText } from "../../utils/formatting";

interface Props {
    navigation: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SCAN_AREA_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);

function normalizeScannedQrData(data: string): string {
    let s = String(data).trim();
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    return s.replace(/\s+/g, "");
}

/** iOS uses `data`; Android may leave `data` empty and set `raw` for some symbologies. */
function payloadFromBarcodeResult(result: BarcodeScanningResult): string {
    const data = result.data != null ? String(result.data).trim() : "";
    if (data.length > 0) return normalizeScannedQrData(data);
    const raw = (result as BarcodeScanningResult & { raw?: string }).raw;
    if (raw != null && String(raw).trim().length > 0) return normalizeScannedQrData(String(raw));
    return "";
}

export default function ScanQRScreen({ navigation }: Props) {
    const colors = useColors();
    const insets = useSafeAreaInsets();

    // ─── Permission ──────────────────────────────────────────────────────────
    const [permission, requestPermission] = useCameraPermissions();

    // Request permission as soon as the hook has loaded its status.
    useEffect(() => {
        if (!permission) return;                          // still loading
        if (permission.granted) return;                   // already granted
        if (!permission.canAskAgain) return;              // permanently denied
        requestPermission();
    }, [permission, requestPermission]);

    // Camera is active only when permission is definitively granted.
    // This avoids mounting CameraView while permission is still being requested,
    // which is what caused the camera to only work after a tap.
    const cameraActive = permission?.granted === true;

    // ─── Scanner state ────────────────────────────────────────────────────────
    const [scanned, setScanned] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
    const [canAddToOnDeck, setCanAddToOnDeck] = useState(true);
    const [statusDetailLines, setStatusDetailLines] = useState<string[]>([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [lastDetection, setLastDetection] = useState<string>("");
    const [cameraPreviewLikelyUnavailable, setCameraPreviewLikelyUnavailable] = useState(false);
    const [manualEntryOpen, setManualEntryOpen] = useState(false);
    const [manualPayload, setManualPayload] = useState("");
    const [appIsActive, setAppIsActive] = useState(() => AppState.currentState === "active");

    const lastScannedData = useRef<string>("");
    const scanCooldown = useRef(false);
    const scannedRef = useRef(false);
    const processingRef = useRef(false);
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => { scannedRef.current = scanned; }, [scanned]);
    useEffect(() => { processingRef.current = processing; }, [processing]);

    // iOS: stop camera session when app backgrounds; resume when foreground (Expo recommends one active preview).
    useEffect(() => {
        const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
            const active = next === "active";
            setAppIsActive(active);
            if (active) {
                requestAnimationFrame(() => {
                    try {
                        cameraRef.current?.resumePreview?.();
                    } catch {
                        /* ignore */
                    }
                });
            }
        });
        return () => sub.remove();
    }, []);

    // Auto-start scanning as soon as the camera is ready — no tap needed.
    useEffect(() => {
        if (!cameraReady) return;
        cameraRef.current?.resumePreview();
    }, [cameraReady]);

    // Android: session/preview sometimes needs a frame after mount; avoids "tap to wake" camera.
    useEffect(() => {
        if (!cameraActive) return;
        const id = requestAnimationFrame(() => {
            try {
                cameraRef.current?.resumePreview?.();
            } catch {
                /* ignore */
            }
        });
        return () => cancelAnimationFrame(id);
    }, [cameraActive]);

    // ─── Simulator fallback ───────────────────────────────────────────────────
    useEffect(() => {
        if (!cameraActive) { setCameraPreviewLikelyUnavailable(false); return; }
        if (Device.isDevice) return;
        const t = setTimeout(() => {
            setCameraPreviewLikelyUnavailable((prev) => prev || !cameraReady);
        }, 4000);
        return () => clearTimeout(t);
    }, [cameraActive, cameraReady]);

    useEffect(() => {
        if (cameraPreviewLikelyUnavailable && !Device.isDevice) setManualEntryOpen(true);
    }, [cameraPreviewLikelyUnavailable]);

    // ─── Scan line animation ──────────────────────────────────────────────────
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [scanLineAnim]);

    const scanLineTranslate = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SCAN_AREA_SIZE - 4],
    });

    // ─── Barcode settings (stable ref – avoids native pipeline reset on render) ─
    const qrBarcodeSettings = useMemo(() => ({ barcodeTypes: ["qr" as const] }), []);

    // ─── QR processing ────────────────────────────────────────────────────────
    const resetScanner = useCallback(() => {
        setScanned(false);
        lastScannedData.current = "";
        setManualPayload("");
        setTimeout(() => { scanCooldown.current = false; }, 2000);
    }, []);

    const processParsedQrPayload = useCallback(
        (payload: string, typeLabel: string, _source: "camera" | "manual") => {
            if (!payload) return;
            if (scannedRef.current || processingRef.current || scanCooldown.current) return;
            if (lastScannedData.current === payload) return;

            setLastDetection(`${typeLabel}: ${payload.substring(0, 30)}...`);
            logger.debug("[ScanQRScreen] Processing QR", { source: _source, len: payload.length });

            scanCooldown.current = true;
            lastScannedData.current = payload;
            setScanned(true);
            setProcessing(true);

            (async () => {
                try {
                    const result = await draftApi.scanQRCode(payload);
                    if (result.success && result.user) {
                        setScannedUser(result.user);
                        setCanAddToOnDeck(result.canAddToOnDeck !== false);
                        setStatusDetailLines(Array.isArray(result.statusDetailLines) ? result.statusDetailLines : []);
                        setShowConfirmModal(true);
                    } else {
                        Alert.alert(
                            "Invalid QR Code",
                            result.message || "This QR code is not valid or has expired.",
                            [{ text: "Try Again", onPress: resetScanner }]
                        );
                    }
                } catch (error: any) {
                    Alert.alert(
                        "Scan Failed",
                        error.message || "Failed to process QR code.",
                        [{ text: "Try Again", onPress: resetScanner }]
                    );
                } finally {
                    setProcessing(false);
                }
            })();
        },
        [resetScanner]
    );

    const onBarCodeFromCamera = useCallback(
        (event: BarcodeScanningResult) => {
            const payload = payloadFromBarcodeResult(event);
            logger.debug("[ScanQRScreen] Barcode scanned", { type: event.type, payloadLen: payload.length, platform: Platform.OS });
            processParsedQrPayload(payload, event.type, "camera");
        },
        [processParsedQrPayload]
    );

    const handleConfirmDraft = useCallback(async () => {
        if (!scannedUser || !canAddToOnDeck) return;
        setConfirming(true);
        try {
            const result = await draftApi.confirmDraft(scannedUser.id);
            if (result.success) {
                Alert.alert("Success! 🎉", `${scannedUser.name} has been added to your On-Deck list!`, [
                    { text: "OK", onPress: () => navigation.goBack() },
                ]);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to add player");
            setShowConfirmModal(false);
            resetScanner();
        } finally {
            setConfirming(false);
        }
    }, [scannedUser, canAddToOnDeck, navigation, resetScanner]);

    const handleClose = useCallback(() => navigation.goBack(), [navigation]);

    const handleCancelConfirm = useCallback(() => {
        setShowConfirmModal(false);
        setScannedUser(null);
        setCanAddToOnDeck(true);
        setStatusDetailLines([]);
        resetScanner();
    }, [resetScanner]);

    const scanAreaBlocked = cameraActive && !processing && !cameraReady && !cameraPreviewLikelyUnavailable;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: "#000" }}>
            <StatusBar style="light" />

            {/*
             * CameraView mounts only when permission.granted is definitively true.
             * No key-based remounting, no osCameraGranted race — clean single mount.
             */}
            {cameraActive && (
                <View style={StyleSheet.absoluteFillObject} collapsable={false} pointerEvents="auto">
                    <CameraView
                        ref={cameraRef}
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        // Expo FocusMode: "on" = AF once then lock; "off" = continuous AF — better for QR at varying distances.
                        autofocus="off"
                        active={Platform.OS === "ios" ? appIsActive : true}
                        onBarcodeScanned={
                            !scanned && !processing && !showConfirmModal ? onBarCodeFromCamera : undefined
                        }
                        barcodeScannerSettings={qrBarcodeSettings}
                        onCameraReady={() => {
                            logger.debug("[ScanQRScreen] Camera ready", { platform: Platform.OS });
                            setCameraReady(true);
                            setCameraPreviewLikelyUnavailable(false);
                        }}
                        onMountError={(e) => {
                            logger.error("[ScanQRScreen] Camera mount error", { message: e.message, platform: Platform.OS });
                        }}
                        enableTorch={false}
                    />
                </View>
            )}

            {/* ── Overlay (StyleSheet fill — reliable on iOS/Android vs NativeWind inset-0) ─ */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
                {/* Top bar */}
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

                {/* Scan area */}
                <View className="flex-row" style={{ height: SCAN_AREA_SIZE }}>
                    <View className="flex-1 bg-black/70" pointerEvents="none" />
                    <View
                        className="relative overflow-hidden"
                        style={{ width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE }}
                        pointerEvents="none"
                    >
                        {/* Corner markers */}
                        <View className="absolute top-0 left-0 w-[35px] h-[35px] border-t-4 border-l-4 border-blue-600 rounded-tl-2xl" />
                        <View className="absolute top-0 right-0 w-[35px] h-[35px] border-t-4 border-r-4 border-blue-600 rounded-tr-2xl" />
                        <View className="absolute bottom-0 left-0 w-[35px] h-[35px] border-b-4 border-l-4 border-blue-600 rounded-bl-2xl" />
                        <View className="absolute bottom-0 right-0 w-[35px] h-[35px] border-b-4 border-r-4 border-blue-600 rounded-br-2xl" />

                        {/* Scan line */}
                        {(cameraReady || cameraPreviewLikelyUnavailable) && !scanned && (
                            <Animated.View
                                pointerEvents="none"
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

                        {/* Processing */}
                        {processing && (
                            <View className="absolute inset-0 bg-black/60 justify-center items-center rounded-md">
                                <ActivityIndicator size="large" color="#fff" />
                                <Text className="text-white mt-3 text-sm font-medium">Processing...</Text>
                            </View>
                        )}

                        {/* Starting camera indicator */}
                        {scanAreaBlocked && (
                            <View className="absolute inset-0 bg-black/60 justify-center items-center rounded-md" pointerEvents="none">
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text className="text-white mt-3 text-sm font-medium">Starting camera...</Text>
                            </View>
                        )}

                        {/* Simulator message */}
                        {cameraPreviewLikelyUnavailable && !cameraReady && !processing && (
                            <View
                                className="absolute inset-0 bg-black/70 justify-center items-center rounded-md px-3"
                                pointerEvents="none"
                            >
                                <Text className="text-white text-sm text-center leading-5">
                                    Camera preview isn't available on this simulator. Use "Enter code manually" below.
                                </Text>
                            </View>
                        )}

                        {/* Dev detection debug */}
                        {__DEV__ && lastDetection ? (
                            <View
                                className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/70 p-2 rounded-md"
                                pointerEvents="none"
                            >
                                <Text className="text-white text-[10px] font-mono">{lastDetection}</Text>
                            </View>
                        ) : null}
                    </View>
                    <View className="flex-1 bg-black/70" pointerEvents="none" />
                </View>

                {/* Fills space below scan row; touches pass through to CameraView (was flex-1 ScrollView blocking camera). */}
                <View style={{ flex: 1 }} pointerEvents="none" />

                {/* Bottom sheet only — does not cover the full screen */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={insets.top + 40}
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        maxHeight: "52%",
                    }}
                    pointerEvents="box-none"
                >
                    <View
                        style={{
                            backgroundColor: "rgba(0,0,0,0.82)",
                            borderTopLeftRadius: 16,
                            borderTopRightRadius: 16,
                            paddingBottom: insets.bottom + 12,
                            paddingTop: 12,
                        }}
                        pointerEvents="auto"
                    >
                        <ScrollView
                            keyboardShouldPersistTaps="always"
                            showsVerticalScrollIndicator={manualEntryOpen}
                            nestedScrollEnabled
                            contentContainerStyle={{
                                paddingHorizontal: 20,
                                paddingBottom: 8,
                                alignItems: "center",
                            }}
                        >
                            <Text className="text-sm text-white/70 text-center leading-5 mb-3">
                                {"Point your camera at the other player's QR code."}
                            </Text>
                            {scanned && !processing && !showConfirmModal && (
                                <TouchableOpacity className="mb-4 px-8 py-3.5 bg-blue-600 rounded-[25px]" onPress={resetScanner}>
                                    <Text className="text-base font-semibold text-white">Scan again</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => setManualEntryOpen((o) => !o)} disabled={processing} className="py-2">
                                <Text className="text-sm text-blue-300 text-center underline">
                                    {manualEntryOpen ? "Hide manual entry" : "Trouble scanning? Enter code manually"}
                                </Text>
                            </TouchableOpacity>
                            {manualEntryOpen && (
                                <View className="w-full mt-2">
                                    <TextInput
                                        value={manualPayload}
                                        onChangeText={setManualPayload}
                                        placeholder="Paste QR payload"
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
                                            if (!data) { Alert.alert("Empty", "Paste the QR payload first."); return; }
                                            processParsedQrPayload(data, "qr", "manual");
                                        }}
                                    >
                                        {processing
                                            ? <ActivityIndicator color="#fff" />
                                            : <Text className="text-base font-semibold text-white">Use this code</Text>
                                        }
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>

            {/* Permission denied */}
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

            {/* Confirm modal */}
            <Modal visible={showConfirmModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: "rgba(55,65,81,0.9)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
                    <View className="bg-white rounded-md p-7 w-full max-w-[360px] items-center">
                        <View className="items-center mb-6">
                            {scannedUser?.avatar ? (
                                <Image source={{ uri: scannedUser.avatar }} className="w-[90px] h-[90px] rounded-full mb-4" />
                            ) : (
                                <View className="w-[90px] h-[90px] rounded-full justify-center items-center mb-4" style={{ backgroundColor: "#5EBC68" }}>
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
                            {scannedUser?.homeCourse && <Text className="text-sm text-gray-500 mt-1">🏌️ {scannedUser.homeCourse}</Text>}
                            {scannedUser?.location && <Text className="text-[13px] text-gray-500 mt-0.5">📍 {scannedUser.location}</Text>}
                            {scannedUser?.createdAt ? (
                                <Text className="text-[13px] text-gray-500 mt-1.5">{getMemberSinceText(scannedUser.createdAt)}</Text>
                            ) : null}
                        </View>

                        {statusDetailLines.length > 0 && (
                            <View className="w-full mb-4 px-1">
                                {statusDetailLines.map((line, idx) => (
                                    <Text key={idx} className="text-[15px] text-gray-600 text-center leading-[22px] mb-2">{line}</Text>
                                ))}
                            </View>
                        )}

                        <Text className="text-base text-gray-500 text-center mb-6">
                            {canAddToOnDeck ? "Add this player to your On-Deck list?" : "You can't add them from this scan right now."}
                        </Text>

                        <View className="flex-row gap-3 w-full">
                            {canAddToOnDeck ? (
                                <>
                                    <TouchableOpacity className="flex-1 py-4 rounded-[14px] bg-gray-50 items-center" onPress={handleCancelConfirm} disabled={confirming}>
                                        <Text className="text-base font-semibold text-gray-500">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity className="flex-[1.2] flex-row py-4 rounded-[14px] bg-blue-600 items-center justify-center gap-2" onPress={handleConfirmDraft} disabled={confirming}>
                                        {confirming
                                            ? <ActivityIndicator size="small" color="#fff" />
                                            : <><UserPlus size={20} color="#fff" /><Text className="text-base font-semibold text-white">Add Player</Text></>
                                        }
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity className="flex-1 py-4 rounded-[14px] bg-gray-100 items-center" onPress={handleCancelConfirm} disabled={confirming}>
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
