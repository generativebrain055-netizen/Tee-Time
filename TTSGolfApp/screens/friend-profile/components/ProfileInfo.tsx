import React, { memo } from "react";
import { View, Text } from "react-native";
import { cn } from "../../../utils/cn";

interface Props {
  fullName: string;
  location?: string;
  handicap?: number | string | null;
}

const ProfileInfo = memo(({ fullName, location, handicap }: Props) => (
  <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
    <Text style={{
      fontFamily: 'Inter_700Bold',
      fontSize: 20,
      color: '#000000',
      textAlign: 'center',
      marginBottom: 4,
    }} numberOfLines={1}>
      {fullName}
    </Text>
    <Text style={{
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: 16,
    }}>
      {location || "San Francisco, CA"} | Handicap: {handicap || "24"}
    </Text>
  </View>
));

export default ProfileInfo;
