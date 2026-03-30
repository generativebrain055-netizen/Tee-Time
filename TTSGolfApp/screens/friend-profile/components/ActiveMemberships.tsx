import React, { memo } from "react";
import { View, Text } from "react-native";

export interface ClubMembershipRow {
  id?: string;
  name?: string;
  location?: string;
}

interface Props {
  clubs?: (ClubMembershipRow & { club_name?: string; title?: string })[] | null;
}

const clubDisplayName = (c: NonNullable<Props["clubs"]>[number]) =>
  (c?.name || c?.club_name || c?.title || "").trim();

const ActiveMemberships = memo(({ clubs }: Props) => {
  const list = (clubs || []).filter((c) => clubDisplayName(c));
  return (
    <>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 18,
          color: "#111827",
          marginBottom: 12,
        }}
      >
        Active memberships
      </Text>
      {list.length === 0 ? (
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 15,
            color: "#6B7280",
          }}
        >
          No clubs added
        </Text>
      ) : (
        list.map((c, index) => (
          <View
            key={c.id || `${clubDisplayName(c)}-${index}`}
            style={{
              marginBottom: index < list.length - 1 ? 16 : 0,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: "#111827",
              }}
            >
              {clubDisplayName(c)}
            </Text>
            {c.location ? (
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: "#6B7280",
                  marginTop: 4,
                }}
              >
                {c.location}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </>
  );
});

export default ActiveMemberships;
