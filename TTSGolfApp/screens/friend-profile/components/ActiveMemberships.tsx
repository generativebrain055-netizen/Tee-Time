import React, { memo } from "react";
import { View, Text } from "react-native";

interface Props {
  clubName?: string;
  location?: string;
}

const ActiveMemberships = memo(({ clubName, location }: Props) => {
  const name = clubName ?? "No clubs added";
  const loc = location ?? "";
  return (
    <>
      <Text style={{
        fontFamily: 'Inter_700Bold',
        fontSize: 18,
        color: '#111827',
        marginBottom: 12,
      }}>
        Active memberships
      </Text>
      <View>
        <Text style={{
          fontFamily: 'Inter_500Medium',
          fontSize: 15,
          color: '#111827',
        }}>
          {name}
        </Text>
        {loc ? (
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 13,
            color: '#6B7280',
            marginTop: 2,
          }}>
            {loc}
          </Text>
        ) : null}
      </View>
    </>
  );
});

export default ActiveMemberships;
