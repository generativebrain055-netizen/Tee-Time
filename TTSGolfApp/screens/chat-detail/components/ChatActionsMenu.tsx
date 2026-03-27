import React, { memo } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { X, Users } from "lucide-react-native";
import { COLORS } from "../styles";

/** Figma 1269-2365 Tee Time Chat Menu: sheet with Create group + Chat actions */
const FIGMA_SHEET_RADIUS = 16;

interface ChatActionsMenuProps {
    visible: boolean;
    onClose: () => void;
    onCreateGroup?: () => void;
    isMuted?: boolean;
    onMuteToggle?: () => void;
    onDeleteChat?: () => void;
}

export const ChatActionsMenu = memo(
    ({ visible, onClose, onCreateGroup, isMuted, onMuteToggle, onDeleteChat }: ChatActionsMenuProps) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
            {/* Prevent overlay onPress when tapping inside the sheet (Figma 1269-2434) */}
            <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
                <View style={styles.sheetContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Chat actions</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={8}>
                            <X size={24} color={COLORS.textMain} />
                        </TouchableOpacity>
                    </View>
                    {onCreateGroup ? (
                        <TouchableOpacity
                            style={styles.option}
                            onPress={() => {
                                onClose();
                                onCreateGroup();
                            }}
                        >
                            <Users size={20} color={COLORS.textMain} strokeWidth={2} />
                            <Text style={styles.optionText}>Create group</Text>
                        </TouchableOpacity>
                    ) : null}
                    {onCreateGroup ? <View style={styles.separator} /> : null}
                    {onMuteToggle ? (
                        <TouchableOpacity
                            style={styles.option}
                            onPress={() => {
                                onClose();
                                onMuteToggle();
                            }}
                        >
                            <Text style={styles.optionText}>{isMuted ? "Unmute" : "Mute"}</Text>
                        </TouchableOpacity>
                    ) : null}
                    {onMuteToggle ? <View style={styles.separator} /> : null}
                    {onDeleteChat ? (
                        <TouchableOpacity
                            style={styles.option}
                            onPress={() => {
                                onClose();
                                onDeleteChat();
                            }}
                        >
                            <Text style={styles.optionDanger}>Delete chat</Text>
                        </TouchableOpacity>
                    ) : null}
                    <View style={styles.bottomSafe} />
                </View>
            </TouchableOpacity>
        </TouchableOpacity>
    </Modal>
    )
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: FIGMA_SHEET_RADIUS,
    borderTopRightRadius: FIGMA_SHEET_RADIUS,
  },
  sheetContent: {
    width: "100%",
  },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    optionText: {
        fontSize: 16,
        color: "#111827",
    },
    optionDanger: {
        fontSize: 16,
        color: "#EF4444",
    },
    separator: {
        height: 1,
        backgroundColor: "#E5E5E5",
        marginLeft: 20,
    },
    bottomSafe: {
        height: 40,
    },
});
