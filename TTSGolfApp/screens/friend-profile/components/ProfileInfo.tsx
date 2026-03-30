import React, { memo, useMemo } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";

interface Props {
  fullName: string;
  location?: string | null;
  handicap?: number | string | null;
  phone?: string | null;
}

const dial = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return;
  Linking.openURL(`tel:${digits}`).catch(() => {});
};

const ProfileInfo = memo(({ fullName, location, handicap, phone }: Props) => {
  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (location && String(location).trim()) parts.push(String(location).trim());
    if (handicap != null && handicap !== "" && !Number.isNaN(Number(handicap))) {
      parts.push(`Handicap: ${handicap}`);
    }
    return parts.length ? parts.join(" | ") : null;
  }, [location, handicap]);

  return (
    <View style={{ alignItems: "center", paddingHorizontal: 16 }}>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 24,
          color: "#111827",
          textAlign: "center",
          marginBottom: 6,
        }}
        numberOfLines={2}
      >
        {fullName}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: "#6B7280",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {subtitle}
        </Text>
      ) : (
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: "#9CA3AF",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Location and handicap not shared
        </Text>
      )}
      {phone ? (
        <TouchableOpacity onPress={() => dial(phone)} activeOpacity={0.7}>
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              color: "#5EBC68",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {phone}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={{ marginBottom: 4 }} />
      )}
    </View>
  );
});

export default ProfileInfo;
