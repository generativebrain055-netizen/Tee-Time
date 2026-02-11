import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { QrCode, Edit2 } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";

interface ActionButtonsProps {
    onDraftViaQR: () => void;
    onEditProfile: () => void;
}

const ActionButtons = memo(({ onDraftViaQR, onEditProfile }: ActionButtonsProps) => (
    <View className="flex-row px-5 gap-3 mb-6">
        <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-blue-600 py-3.5 rounded-md gap-2" onPress={onDraftViaQR}>
            <QrCode size={18} color={COLORS.white} />
            <Text className="text-[15px] font-semibold text-white">Draft via QR</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-white py-3.5 rounded-md border-[1.5px] border-blue-600 gap-2" onPress={onEditProfile}>
            <Edit2 size={18} color={COLORS.primary} />
            <Text className="text-[15px] font-semibold text-blue-600">Edit Profile</Text>
        </TouchableOpacity>
    </View>
));

export default ActionButtons;
