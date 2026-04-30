import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { formatDateMMDDYYYY, parseCalendarDateLocal } from "../../../utils/formatting";

export interface RoundEntry {
  id?: string;
  courseName: string;
  date: string;
}

interface Props {
  rounds: RoundEntry[];
  onPressRound?: (teeTimeId: string) => void;
}

const RecentRounds = memo(({ rounds, onPressRound }: Props) => {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 24 }}>
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}>
        <Text style={{
          fontFamily: 'Inter_700Bold',
          fontSize: 18,
          color: '#111827',
          marginBottom: 4,
        }}>
          Recent rounds
        </Text>
        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 13,
          color: '#6B7280',
          marginBottom: 16,
        }}>
          Completed tee times
        </Text>
        {!rounds.length ? (
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
              padding: 24,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 15,
                color: "#6B7280",
                textAlign: "center",
              }}
            >
              No completed rounds yet
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: "#9CA3AF",
                textAlign: "center",
                marginTop: 6,
              }}
            >
              Completed tee times will show up here
            </Text>
          </View>
        ) : null}
        {rounds.map((round, idx) => {
          const Row = round.id && onPressRound ? TouchableOpacity : View;
          const rowProps =
            round.id && onPressRound
              ? { activeOpacity: 0.7 as const, onPress: () => onPressRound(round.id!) }
              : {};
          return (
            <Row
              key={round.id ? `${round.id}` : `${round.courseName}-${round.date}-${idx}`}
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                padding: 16,
                marginBottom: idx < rounds.length - 1 ? 12 : 0,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
              {...rowProps}
            >
              <Text style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 15,
                color: '#111827',
                marginBottom: 4,
              }}>
                {round.courseName}
              </Text>
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 13,
                color: '#6B7280',
              }}>
                {round.date ? formatDateMMDDYYYY(parseCalendarDateLocal(round.date)) : round.date}
              </Text>
            </Row>
          );
        })}
      </View>
    </View>
  );
});

export default RecentRounds;
