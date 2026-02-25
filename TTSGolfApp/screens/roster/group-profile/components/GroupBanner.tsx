import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { ArrowLeft, MoreVertical, Pencil } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";

interface Props {
    initials: string;
    name: string;
    color?: string;
    /** Avatar/icon URL - when set, shown instead of initials */
    avatarUri?: string | null;
    topInset: number;
    isOwner?: boolean;
    onBack: () => void;
    onSettings: () => void;
    onEditAvatar?: () => void;
    onEditName?: () => void;
}

const GroupBanner = memo(({ initials, name, color, avatarUri, topInset, isOwner, onBack, onSettings, onEditAvatar, onEditName }: Props) => (
    <View style={{ paddingTop: topInset, paddingBottom: 24, paddingHorizontal: 20, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E5E5", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <TouchableOpacity onPress={onBack} style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
                <ArrowLeft size={20} color="#4B5563" strokeWidth={2} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <View style={{ position: "relative" }}>
                    <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: color || "#2563EB", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={{ width: 92, height: 92, borderRadius: 46 }} resizeMode="cover" />
                        ) : (
                            <Text style={{ fontFamily: "Inter", fontWeight: "500", fontSize: 32, lineHeight: 28, color: "#FFFFFF", letterSpacing: 0.03 }}>
                                {initials}
                            </Text>
                        )}
                    </View>
                    {isOwner !== false && (onEditAvatar || onEditName) && (
                        <TouchableOpacity
                            onPress={onEditAvatar}
                            style={{ position: "absolute", right: -4, bottom: -4, width: 21.6, height: 21.6, borderRadius: 10.8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4.8 }, shadowOpacity: 0.1, shadowRadius: 6.3, elevation: 4 }}
                        >
                            <Pencil size={12} color="#6A6A6A" strokeWidth={1.4} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {isOwner !== false ? (
                <TouchableOpacity onPress={onSettings} style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
                    <MoreVertical size={20} color="#474747" strokeWidth={2} />
                </TouchableOpacity>
            ) : (
                <View style={{ width: 36, height: 36 }} />
            )}
        </View>
        <TouchableOpacity onPress={isOwner !== false ? onEditName : undefined} style={{ alignSelf: "center" }} disabled={!onEditName}>
            <Text style={{ fontFamily: "Inter", fontWeight: "600", fontSize: 22, lineHeight: 20, color: "#000000", textAlign: "center" }} numberOfLines={1}>
                {name}
            </Text>
        </TouchableOpacity>
    </View>
));

export default GroupBanner;
