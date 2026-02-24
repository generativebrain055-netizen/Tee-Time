import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MessageCircle, UserPlus } from "lucide-react-native";

interface Props {
    onChat: () => void;
    onInvitePeople: () => void;
}

const GroupActions = memo(({ onChat, onInvitePeople }: Props) => (
    <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 24 }}>
        <TouchableOpacity
            onPress={onChat}
            style={{ flex: 1, height: 70, backgroundColor: "#F3F3F3", borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
            <MessageCircle size={18} color="#000000" strokeWidth={2} />
            <Text style={{ fontFamily: "Inter", fontWeight: "500", fontSize: 14, lineHeight: 20, color: "#000000" }}>Group chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
            onPress={onInvitePeople}
            style={{ flex: 1, height: 70, backgroundColor: "#F3F3F3", borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
            <UserPlus size={18} color="#000000" strokeWidth={2} />
            <Text style={{ fontFamily: "Inter", fontWeight: "500", fontSize: 14, lineHeight: 20, color: "#000000" }}>Invite people</Text>
        </TouchableOpacity>
    </View>
));

export default GroupActions;
