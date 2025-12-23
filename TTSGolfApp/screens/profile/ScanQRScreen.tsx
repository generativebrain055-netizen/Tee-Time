import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { X, Check, UserPlus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { draftApi, ScannedUser } from "../../services/api";

interface Props {
    navigation: any;
}

function ScanQRScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
        if (scanned || processing) return;

        setScanned(true);
        setProcessing(true);

        try {
            const result = await draftApi.scanQRCode(data);

            if (result.success && result.user) {
                setScannedUser(result.user);
                setShowConfirmModal(true);
            } else {
                Alert.alert(
                    "Invalid QR Code",
                    result.message || "This QR code is not valid or has expired.",
                    [{ text: "Try Again", onPress: () => setScanned(false) }]
                );
            }
        } catch (error: any) {
            Alert.alert(
                "Scan Failed",
                error.message || "Failed to process QR code",
                [{ text: "Try Again", onPress: () => setScanned(false) }]
            );
        } finally {
            setProcessing(false);
        }
    }, [scanned, processing]);

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
        setScanned(false);
    }, []);

    // Permission handling
    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
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

            <CameraView
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
                {/* Top section */}
                <View style={[styles.overlaySection, { paddingTop: insets.top + 16 }]}>
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <X size={28} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Scan QR Code</Text>
                    <Text style={styles.subtitle}>
                        Point your camera at a player's QR code to add them to your On-Deck list
                    </Text>
                </View>

                {/* Scanner frame */}
                <View style={styles.scannerFrame}>
                    <View style={styles.cornerTL} />
                    <View style={styles.cornerTR} />
                    <View style={styles.cornerBL} />
                    <View style={styles.cornerBR} />
                    {processing && (
                        <View style={styles.processingOverlay}>
                            <ActivityIndicator size="large" color={COLORS.white} />
                            <Text style={styles.processingText}>Processing...</Text>
                        </View>
                    )}
                </View>

                {/* Bottom section */}
                <View style={[styles.overlaySection, { paddingBottom: insets.bottom + 32 }]}>
                    <Text style={styles.hint}>
                        Ask the player to show their QR code from their profile
                    </Text>
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
                                style={styles.cancelModalButton}
                                onPress={handleCancelConfirm}
                                disabled={confirming}
                            >
                                <Text style={styles.cancelModalText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleConfirmDraft}
                                disabled={confirming}
                            >
                                {confirming ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <>
                                        <UserPlus size={20} color={COLORS.white} />
                                        <Text style={styles.confirmButtonText}>Add Player</Text>
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
    permissionText: {
        fontSize: 16,
        color: COLORS.white,
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
        color: COLORS.white,
    },
    cancelButton: {
        paddingVertical: 12,
    },
    cancelButtonText: {
        fontSize: 16,
        color: COLORS.textSub,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "space-between",
    },
    overlaySection: {
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: 24,
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: 60,
        left: 20,
        padding: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.white,
        marginTop: 40,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.8)",
        textAlign: "center",
        lineHeight: 20,
    },
    scannerFrame: {
        width: 280,
        height: 280,
        alignSelf: "center",
        position: "relative",
    },
    cornerTL: {
        position: "absolute",
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: COLORS.primary,
        borderTopLeftRadius: 12,
    },
    cornerTR: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderColor: COLORS.primary,
        borderTopRightRadius: 12,
    },
    cornerBL: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderColor: COLORS.primary,
        borderBottomLeftRadius: 12,
    },
    cornerBR: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderColor: COLORS.primary,
        borderBottomRightRadius: 12,
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
    },
    processingText: {
        color: COLORS.white,
        marginTop: 12,
        fontSize: 14,
    },
    hint: {
        fontSize: 13,
        color: "rgba(255,255,255,0.7)",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        backgroundColor: COLORS.white,
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
        color: COLORS.white,
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
    cancelModalButton: {
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
    confirmButton: {
        flex: 1,
        flexDirection: "row",
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.white,
    },
});
