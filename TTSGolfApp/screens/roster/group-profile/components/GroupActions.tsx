import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MessageCircle, UserPlus } from "lucide-react-native";

interface Props {
    onChat: () => void;
    onInvitePeople: () => void;
}

const GroupActions = memo(({ onChat, onInvitePeople }: Props) => (
    <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 20 }}>
        <TouchableOpacity
            onPress={onChat}
            style={{
                flex: 1,
                minWidth: 0,
                minHeight: 76,
                paddingVertical: 14,
                paddingHorizontal: 10,
                backgroundColor: "#F3F3F3",
                borderRadius: 13,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
            }}
        >
            <MessageCircle size={18} color="#000000" strokeWidth={2} />
            <Text
                style={{
                    fontFamily: "Inter",
                    fontWeight: "500",
                    fontSize: 14,
                    lineHeight: 18,
                    color: "#000000",
                    textAlign: "center",
                    flexShrink: 1,
                }}
                numberOfLines={2}
            >
                Group chat
            </Text>
        </TouchableOpacity>
        <TouchableOpacity
            onPress={onInvitePeople}
            style={{
                flex: 1,
                minWidth: 0,
                minHeight: 76,
                paddingVertical: 14,
                paddingHorizontal: 10,
                backgroundColor: "#F3F3F3",
                borderRadius: 13,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
            }}
        >
            <UserPlus size={18} color="#000000" strokeWidth={2} />
            <Text
                style={{
                    fontFamily: "Inter",
                    fontWeight: "500",
                    fontSize: 14,
                    lineHeight: 18,
                    color: "#000000",
                    textAlign: "center",
                    flexShrink: 1,
                }}
                numberOfLines={2}
            >
                Invite people
            </Text>
        </TouchableOpacity>
    </View>
));

export default GroupActions;
