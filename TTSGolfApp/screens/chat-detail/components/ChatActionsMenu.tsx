import React, { memo } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { X } from "lucide-react-native";
import { COLORS } from "../styles";

interface ChatActionsMenuProps {
    visible: boolean;
    onClose: () => void;
}

export const ChatActionsMenu = memo(({ visible, onClose }: ChatActionsMenuProps) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
            <View style={styles.menuContainer}>
                <View style={styles.menuHeader}>
                    <Text style={styles.menuTitle}>Chat actions</Text>
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color={COLORS.textMain} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.menuItem}>
                    <Text style={styles.menuItemText}>Mute</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem}>
                    <Text style={[styles.menuItemText, styles.menuItemDanger]}>Delete chat</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
));

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    menuContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    menuHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    menuTitle: { fontSize: 18, fontWeight: "600", color: COLORS.textMain },
    menuItem: { paddingHorizontal: 20, paddingVertical: 16 },
    menuItemText: { fontSize: 16, color: COLORS.textMain },
    menuItemDanger: { color: "#EF4444" },
    menuDivider: {
        height: 1,
        backgroundColor: COLORS.divider,
        marginHorizontal: 20,
    },
});
