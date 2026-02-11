import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { ArrowLeft, MoreVertical, Users } from "lucide-react-native";
import { COLORS } from "../styles";
import { ChatInfo } from "../types";

interface ChatHeaderProps {
    chatInfo: ChatInfo;
    onBack: () => void;
    onMenuPress: () => void;
}

export const ChatHeader = memo(({ chatInfo, onBack, onMenuPress }: ChatHeaderProps) => {
    const handleHeaderPress = () => {
        if (chatInfo.isGroup && chatInfo.groupId) {
            // Navigate to group profile when header is pressed
            // This will be handled by the parent component
        }
    };

    return (
        <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 48,
            paddingBottom: 12,
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
        }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <TouchableOpacity 
                    style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center", marginLeft: -8 }} 
                    onPress={onBack}
                >
                    <ArrowLeft size={24} color={COLORS.textMain} />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                    onPress={chatInfo.onHeaderPress}
                    activeOpacity={chatInfo.isGroup ? 0.7 : 1}
                    disabled={!chatInfo.isGroup}
                >
                    <View style={{ marginLeft: 8 }}>
                        {chatInfo.isGroup ? (
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: "#6B7280",
                                justifyContent: "center",
                                alignItems: "center",
                            }}>
                                <Users size={20} color={COLORS.white} />
                            </View>
                        ) : (
                            <Image 
                                source={{ uri: chatInfo.img }} 
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: "#E5E5E5",
                                }}
                            />
                        )}
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }} numberOfLines={1}>
                            {chatInfo.name}
                        </Text>
                        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                            {chatInfo.subtitle}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
            <TouchableOpacity 
                style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }} 
                onPress={onMenuPress}
            >
                <MoreVertical size={24} color={COLORS.textMain} />
            </TouchableOpacity>
        </View>
    );
});
