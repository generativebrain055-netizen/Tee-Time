import React, { memo } from "react";
import { View, Text } from "react-native";

interface Props {
  rounds: number;
  courses: number;
  socialScore: string | number;
}

const GolfStats = memo(({ rounds, courses, socialScore }: Props) => (
  <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
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
        Stats
      </Text>
      <View style={{
        flexDirection: 'row',
        gap: 12,
      }}>
        <View style={{
          flex: 1,
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 12,
          alignItems: 'center',
          backgroundColor: '#EFF6FF',
        }}>
          <Text style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 28,
            color: '#3B82F6',
            marginBottom: 4,
          }}>
            {rounds}
          </Text>
          <Text style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 13,
            color: '#3B82F6',
          }}>
            Rounds
          </Text>
        </View>
        <View style={{
          flex: 1,
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 12,
          alignItems: 'center',
          backgroundColor: '#ECFDF5',
        }}>
          <Text style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 28,
            color: '#10B981',
            marginBottom: 4,
          }}>
            {courses}
          </Text>
          <Text style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 13,
            color: '#10B981',
          }}>
            Courses
          </Text>
        </View>
        <View style={{
          flex: 1,
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 12,
          alignItems: 'center',
          backgroundColor: '#FAF5FF',
        }}>
          <Text style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 28,
            color: '#9333EA',
            marginBottom: 4,
          }}>
            {socialScore}
          </Text>
          <Text style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 13,
            color: '#9333EA',
          }}>
            Social Score
          </Text>
        </View>
      </View>
    </View>
  </View>
));

export default GolfStats;
