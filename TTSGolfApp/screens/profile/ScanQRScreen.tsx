import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    Image,
    Dimensions,
    Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { X, UserPlus, Camera, AlertCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { draftApi, ScannedUser } from "../../services/api";

interface Props {
    navigation: any;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SCAN_AREA_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);

export default function ScanQRScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [lastDetection, setLastDetection] = useState<string>("");
    const lastScannedData = useRef<string>("");
    const scanCooldown = useRef(false);

    // Animated scan line
    const scanLineAnim = useRef(new Animated.Value(0)).current;

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

        console.log("=== BARCODE SCANNED ===");
        console.log("Type:", type);
        console.log("Data:", data);
        console.log("Data length:", data.length);
        console.log("Scanned state:", scanned);
        console.log("Processing state:", processing);
        console.log("Cooldown:", scanCooldown.current);

        // Prevent rapid duplicate scans
        if (scanned || processing || scanCooldown.current) {
            console.log("Scan blocked - already processing or in cooldown");
            return;
        }

        if (lastScannedData.current === data) {
            console.log("Scan blocked - duplicate data");
            return;
        }

        console.log("=== PROCESSING QR CODE ===");

        scanCooldown.current = true;
        lastScannedData.current = data;
        setScanned(true);
        setProcessing(true);

        // Process the scan
        (async () => {
            try {
                console.log("Calling draftApi.scanQRCode with data:", data.substring(0, 50) + "...");
                const result = await draftApi.scanQRCode(data);
                console.log("Scan result:", result);

                if (result.success && result.user) {
                    console.log("User found:", result.user);
                    setScannedUser(result.user);
                    setShowConfirmModal(true);
                } else {
                    console.log("Scan failed:", result.message);
                    Alert.alert(
                        "Invalid QR Code",
                        result.message || "This QR code is not valid or has expired.",
                        [{ text: "Try Again", onPress: resetScanner }]
                    );
                }
            } catch (error: any) {
                console.error("Scan error:", error);
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

    // Permission handling
    if (!permission) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Checking camera permission...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Camera size={64} color={COLORS.textSub} style={{ marginBottom: 24 }} />
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionText}>
                    To scan QR codes, we need access to your camera.
                </Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const scanLineTranslate = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SCAN_AREA_SIZE - 4],
    });

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Camera - Full screen */}
            <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
                onCameraReady={() => {
                    console.log("Camera is ready");
                    setCameraReady(true);
                }}
                enableTorch={false}
            />

            {/* Overlay */}
            <View style={styles.overlay} pointerEvents="box-none">
                {/* Top dark area */}
                <View style={[styles.darkArea, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                            <X size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Scan to Draft</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <Text style={styles.subtitle}>
                        Position the QR code within the frame
                    </Text>
                </View>

                {/* Middle row with scan area */}
                <View style={styles.middleRow}>
                    <View style={styles.darkSide} />
                    <View style={styles.scanArea}>
                        {/* Corner markers */}
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />

                        {/* Animated scan line */}
                        {cameraReady && !scanned && (
                            <Animated.View
                                style={[
                                    styles.scanLine,
                                    { transform: [{ translateY: scanLineTranslate }] },
                                ]}
                            />
                        )}

                        {/* Processing indicator */}
                        {processing && (
                            <View style={styles.processingBox}>
                                <ActivityIndicator size="large" color="#fff" />
                                <Text style={styles.processingText}>Processing...</Text>
                            </View>
                        )}

                        {/* Camera starting */}
                        {!cameraReady && (
                            <View style={styles.processingBox}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={styles.processingText}>Starting camera...</Text>
                            </View>
                        )}

                        {/* Debug: Show last detection */}
                        {__DEV__ && lastDetection && (
                            <View style={styles.debugBox}>
                                <Text style={styles.debugText}>{lastDetection}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.darkSide} />
                </View>

                {/* Bottom dark area */}
                <View style={[styles.darkArea, styles.bottomArea, { paddingBottom: insets.bottom + 20 }]}>
                    <Text style={styles.hint}>
                        Ask the player to show their QR code from their profile
                    </Text>
                    {scanned && !processing && !showConfirmModal && (
                        <TouchableOpacity style={styles.rescanBtn} onPress={resetScanner}>
                            <Text style={styles.rescanText}>Tap to Scan Again</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Confirm Modal */}
            <Modal visible={showConfirmModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.userInfo}>
                            {scannedUser?.avatar ? (
                                <Image source={{ uri: scannedUser.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitial}>
                                        {scannedUser?.name?.charAt(0)?.toUpperCase() || "?"}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.userName}>{scannedUser?.name || "Unknown"}</Text>

                            <View style={styles.userStats}>
                                {scannedUser?.handicap !== undefined && scannedUser?.handicap !== null && (
                                    <View style={styles.statBadge}>
                                        <Text style={styles.statLabel}>Handicap</Text>
                                        <Text style={styles.statValue}>{scannedUser.handicap}</Text>
                                    </View>
                                )}
                                {scannedUser?.socialRate !== undefined && (
                                    <View style={styles.statBadge}>
                                        <Text style={styles.statLabel}>Social Rate</Text>
                                        <Text style={styles.statValue}>{scannedUser.socialRate}</Text>
                                    </View>
                                )}
                            </View>

                            {scannedUser?.homeCourse && (
                                <Text style={styles.userCourse}>🏌️ {scannedUser.homeCourse}</Text>
                            )}
                            {scannedUser?.location && (
                                <Text style={styles.userLocation}>📍 {scannedUser.location}</Text>
                            )}
                        </View>

                        <Text style={styles.confirmText}>
                            Add this player to your On-Deck list?
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelModalBtn}
                                onPress={handleCancelConfirm}
                                disabled={confirming}
                            >
                                <Text style={styles.cancelModalText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmBtn}
                                onPress={handleConfirmDraft}
                                disabled={confirming}
                            >
                                {confirming ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <UserPlus size={20} color="#fff" />
                                        <Text style={styles.confirmBtnText}>Add Player</Text>
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
    centered: {
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    loadingText: {
        color: "#fff",
        marginTop: 16,
        fontSize: 14,
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 8,
    },
    permissionText: {
        fontSize: 15,
        color: "rgba(255,255,255,0.7)",
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 22,
    },
    permissionButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    permissionButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
    cancelButton: {
        paddingVertical: 12,
    },
    cancelButtonText: {
        fontSize: 16,
        color: COLORS.textSub,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    darkArea: {
        backgroundColor: "rgba(0,0,0,0.7)",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingTop: 16,
        paddingBottom: 8,
    },
    closeBtn: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    subtitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.8)",
        paddingBottom: 24,
    },
    middleRow: {
        flexDirection: "row",
        height: SCAN_AREA_SIZE,
    },
    darkSide: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    scanArea: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        position: "relative",
        overflow: "hidden",
    },
    corner: {
        position: "absolute",
        width: 35,
        height: 35,
        borderColor: COLORS.primary,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 16,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 16,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 16,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 16,
    },
    scanLine: {
        position: "absolute",
        left: 10,
        right: 10,
        height: 3,
        backgroundColor: COLORS.primary,
        borderRadius: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
    },
    processingBox: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    processingText: {
        color: "#fff",
        marginTop: 12,
        fontSize: 14,
        fontWeight: "500",
    },
    bottomArea: {
        flex: 1,
        justifyContent: "center",
    },
    hint: {
        fontSize: 14,
        color: "rgba(255,255,255,0.7)",
        textAlign: "center",
        lineHeight: 20,
    },
    rescanBtn: {
        marginTop: 24,
        paddingHorizontal: 32,
        paddingVertical: 14,
        backgroundColor: COLORS.primary,
        borderRadius: 25,
    },
    rescanText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 28,
        width: "100%",
        maxWidth: 360,
        alignItems: "center",
    },
    userInfo: {
        alignItems: "center",
        marginBottom: 24,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        marginBottom: 16,
    },
    avatarPlaceholder: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    avatarInitial: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#fff",
    },
    userName: {
        fontSize: 22,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 12,
    },
    userStats: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 12,
    },
    statBadge: {
        backgroundColor: COLORS.bg,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: "center",
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textSub,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.primary,
    },
    userCourse: {
        fontSize: 14,
        color: COLORS.textSub,
        marginTop: 4,
    },
    userLocation: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    confirmText: {
        fontSize: 16,
        color: COLORS.textSub,
        textAlign: "center",
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    cancelModalBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: COLORS.bg,
        alignItems: "center",
    },
    cancelModalText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    confirmBtn: {
        flex: 1.2,
        flexDirection: "row",
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    confirmBtnText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
    debugBox: {
        position: "absolute",
        bottom: 10,
        left: 10,
        right: 10,
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: 8,
        borderRadius: 8,
    },
    debugText: {
        color: "#fff",
        fontSize: 10,
        fontFamily: "monospace",
    },
});
