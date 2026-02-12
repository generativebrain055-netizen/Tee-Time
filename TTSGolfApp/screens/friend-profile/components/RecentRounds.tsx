import React, { memo } from "react";
import { View, Text } from "react-native";

export interface RoundEntry {
  courseName: string;
  date: string;
}

interface Props {
  rounds: RoundEntry[];
}

const RecentRounds = memo(({ rounds }: Props) => {
  if (!rounds.length) return null;
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
          marginBottom: 16,
        }}>
          Recent rounds
        </Text>
        {rounds.map((round, idx) => (
          <View
            key={`${round.courseName}-${round.date}-${idx}`}
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              padding: 16,
              marginBottom: idx < rounds.length - 1 ? 12 : 0,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
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
              {round.date ? new Date(round.date).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              }) : round.date}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

export default RecentRounds;
