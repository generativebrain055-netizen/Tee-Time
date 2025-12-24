import React, { useState, useCallback, memo, useRef, useEffect } from "react";
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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { X, UserPlus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { draftApi, ScannedUser } from "../../services/api";

interface Props {
    navigation: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

function ScanQRScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const lastScannedData = useRef<string>("");
    const scanCooldown = useRef(false);

    const handleBarCodeScanned = useCallback(({ type, data }: { type: string; data: string }) => {
        // Prevent rapid duplicate scans
        if (scanned || processing || scanCooldown.current) return;
        if (lastScannedData.current === data) return;

        console.log("=== QR CODE DETECTED ===");
        console.log("Type:", type);
        console.log("Data:", data);

        scanCooldown.current = true;
        lastScannedData.current = data;
        setScanned(true);
        setProcessing(true);

        // Process the scan
        (async () => {
            try {
                const result = await draftApi.scanQRCode(data);

                if (result.success && result.user) {
                    setScannedUser(result.user);
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
                    error.message || "Failed to process QR code",
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
        }, 1000);
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
        } finally {
            setConfirming(false);
            setShowConfirmModal(false);
        }
    }, [scannedUser, navigation]);

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
                <Text style={styles.permissionText}>
                    Camera permission is required to scan QR codes
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

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Camera - Full screen */}
            <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "aztec", "ean13", "ean8", "code128", "code39", "code93", "datamatrix", "pdf417", "upc_e"],
                }}
                onCameraReady={() => {
                    console.log("Camera is ready");
                    setCameraReady(true);
                }}
            />

            {/* Overlay */}
            <View style={styles.overlay} pointerEvents="box-none">
                {/* Top dark area */}
                <View style={[styles.darkArea, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                            <X size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Scan QR Code</Text>
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

                        {/* Processing indicator */}
                        {processing && (
                            <View style={styles.processingBox}>
                                <ActivityIndicator size="large" color="#fff" />
                                <Text style={styles.processingText}>Processing...</Text>
                            </View>
                        )}

                        {/* Camera status */}
                        {!cameraReady && (
                            <View style={styles.processingBox}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={styles.processingText}>Starting camera...</Text>
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
                    {scanned && !processing && (
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
                                        {scannedUser?.name?.charAt(0) || "?"}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.userName}>{scannedUser?.name}</Text>
                            {scannedUser?.handicap !== undefined && (
                                <Text style={styles.userHandicap}>Handicap: {scannedUser.handicap}</Text>
                            )}
                            {scannedUser?.homeCourse && (
                                <Text style={styles.userCourse}>{scannedUser.homeCourse}</Text>
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

export default memo(ScanQRScreen);

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
    permissionText: {
        fontSize: 16,
        color: "#fff",
        textAlign: "center",
        marginBottom: 24,
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
        backgroundColor: "rgba(0,0,0,0.6)",
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
        paddingBottom: 20,
    },
    middleRow: {
        flexDirection: "row",
        height: SCAN_AREA_SIZE,
    },
    darkSide: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    scanArea: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        position: "relative",
    },
    corner: {
        position: "absolute",
        width: 30,
        height: 30,
        borderColor: COLORS.primary,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 12,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 12,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 12,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 12,
    },
    processingBox: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    processingText: {
        color: "#fff",
        marginTop: 10,
        fontSize: 14,
    },
    bottomArea: {
        flex: 1,
        justifyContent: "center",
    },
    hint: {
        fontSize: 14,
        color: "rgba(255,255,255,0.7)",
        textAlign: "center",
    },
    rescanBtn: {
        marginTop: 20,
        paddingHorizontal: 28,
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
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        width: "100%",
        maxWidth: 340,
        alignItems: "center",
    },
    userInfo: {
        alignItems: "center",
        marginBottom: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    avatarInitial: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#fff",
    },
    userName: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 4,
    },
    userHandicap: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: "600",
    },
    userCourse: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    confirmText: {
        fontSize: 15,
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
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.bg,
        alignItems: "center",
    },
    cancelModalText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    confirmBtn: {
        flex: 1,
        flexDirection: "row",
        paddingVertical: 14,
        borderRadius: 12,
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
});
