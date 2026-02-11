import React, { memo } from "react";
import { View, Text } from "react-native";
import { COLORS } from "../../../constants/colors";

interface PreferenceRowProps {
    label: string;
    value: string;
}

export const PreferenceRow = memo(({ label, value }: PreferenceRowProps) => (
    <View className="py-2">
        <Text className="text-[11px] font-semibold text-gray-500 tracking-wide mb-1">{label}</Text>
        <Text className="text-[15px] font-medium text-gray-900">{value}</Text>
    </View>
));

interface PreferencesCardProps {
    teeTimePreference: string;
    walkOrRide: string;
    groupSize: string;
}

const PreferencesCard = memo(({ teeTimePreference, walkOrRide, groupSize }: PreferencesCardProps) => (
    <View className="px-5 mb-6">
        <Text className="text-base font-bold text-gray-900 mb-3">Playing preferences</Text>
        <View className="bg-white rounded-md p-4">
            <PreferenceRow label="TEE TIME PREFERENCE" value={teeTimePreference} />
            <View className="h-[1px] bg-gray-200 my-2" />
            <PreferenceRow label="RIDE OR WALK" value={walkOrRide} />
            <View className="h-[1px] bg-gray-200 my-2" />
            <PreferenceRow label="GROUP SIZE" value={groupSize} />
        </View>
    </View>
));

export default PreferencesCard;
