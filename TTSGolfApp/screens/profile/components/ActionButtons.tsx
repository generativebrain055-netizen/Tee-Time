import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { QrCode, Edit2 } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";

interface ActionButtonsProps {
    onDraftViaQR: () => void;
    onEditProfile: () => void;
}

const ActionButtons = memo(({ onDraftViaQR, onEditProfile }: ActionButtonsProps) => (
    <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.qrButton} onPress={onDraftViaQR}>
            <QrCode size={18} color={COLORS.white} />
            <Text style={styles.qrButtonText}>Draft via QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={onEditProfile}>
            <Edit2 size={18} color={COLORS.primary} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
    </View>
));

const styles = StyleSheet.create({
    actionButtons: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    qrButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    qrButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },
    editButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        gap: 8,
    },
    editButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.primary,
    },
});

export default ActionButtons;
