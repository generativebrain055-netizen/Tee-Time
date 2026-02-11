import React, { memo } from "react";
import { View, Text } from "react-native";
import { COLORS } from "../../../constants/colors";

interface PreferenceRowProps {
    label: string;
    value: string;
}

const PreferenceRow = memo(({ label, value }: PreferenceRowProps) => (
    <View className="py-2">
        <Text className="text-[11px] font-semibold mb-1" style={{ color: COLORS.textSub, letterSpacing: 0.5 }}>{label}</Text>
        <Text className="text-[15px] font-medium" style={{ color: COLORS.textMain }}>{value}</Text>
    </View>
));

interface Props {
    teeTimePreference: string;
    walkOrRide: string;
}

const PreferencesCard = memo(({ teeTimePreference, walkOrRide }: Props) => (
    <View className="px-5 mb-6">
        <Text className="text-base font-bold mb-3" style={{ color: COLORS.textMain }}>Playing preferences</Text>
        <View className="rounded-md p-4" style={{ backgroundColor: COLORS.white }}>
            <PreferenceRow label="TEE TIME PREFERENCE" value={teeTimePreference} />
            <View className="h-[1px] my-2" style={{ backgroundColor: COLORS.divider }} />
            <PreferenceRow label="RIDE OR WALK" value={walkOrRide} />
        </View>
    </View>
));

export default PreferencesCard;
