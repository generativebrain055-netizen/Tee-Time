import React, { memo } from "react";
import { View, Text, TouchableOpacity, Modal, Image } from "react-native";
import { X, LogOut } from "lucide-react-native";
import { RosterContact } from "../../../../services/api";

interface GroupOptionsSheetProps {
    visible: boolean;
    onClose: () => void;
    onLeaveGroup: () => void;
    members: RosterContact[];
    currentUserId?: string | null;
    isOwner?: boolean;
}

export const GroupOptionsSheet = memo(({
    visible,
    onClose,
    onLeaveGroup,
    members,
    currentUserId,
    isOwner,
}: GroupOptionsSheetProps) => {
    const pendingMembers = members.filter((m) => m.contact?.userId !== currentUserId);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
            >
                <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12, paddingBottom: 32, paddingHorizontal: 20 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <View style={{ width: 32, height: 32 }} />
                        <TouchableOpacity onPress={onClose} hitSlop={12} style={{ position: "absolute", right: 0, width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                            <X size={24} color="#374151" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => {
                            onClose();
                            onLeaveGroup();
                        }}
                        style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4 }}
                    >
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                            <LogOut size={20} color="#DC2626" strokeWidth={2} />
                        </View>
                        <Text style={{ fontFamily: "Inter", fontWeight: "500", fontSize: 16, color: "#111827" }}>Leave group</Text>
                    </TouchableOpacity>

                    {pendingMembers.length > 0 && (
                        <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12 }}>
                            {pendingMembers.slice(0, 5).map((member) => (
                                <View key={member.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
                                    {member.contact?.avatar ? (
                                        <Image source={{ uri: member.contact.avatar }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                                    ) : (
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB", marginRight: 12, alignItems: "center", justifyContent: "center" }}>
                                            <Text style={{ fontFamily: "Inter", fontWeight: "600", fontSize: 14, color: "#6B7280" }}>
                                                {(member.contact?.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    <Text style={{ fontFamily: "Inter", fontWeight: "500", fontSize: 15, color: "#374151" }} numberOfLines={1}>
                                        {member.contact?.name || "Unknown"} (pending)
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
});

GroupOptionsSheet.displayName = "GroupOptionsSheet";
