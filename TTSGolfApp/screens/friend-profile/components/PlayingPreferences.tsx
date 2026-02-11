import React, { memo } from "react";
import { View, Text } from "react-native";
import { cn } from "../../../utils/cn";

interface Props {
  teeTimePreference: string;
  walkOrRide: string;
  golfVibe?: string;
  drinkOfChoice?: string;
}

const PlayingPreferences = memo(({ teeTimePreference, walkOrRide, golfVibe, drinkOfChoice }: Props) => (
  <>
    <Text style={{
      fontFamily: 'Inter_700Bold',
      fontSize: 18,
      color: '#111827',
      marginBottom: 20,
    }}>
      Playing preferences
    </Text>
    <View style={{
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 20,
    }}>
      <View style={{ flex: 1, minWidth: '45%' }}>
        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 11,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          marginBottom: 6,
          letterSpacing: 0.5,
        }}>
          TEE TIME PREFERENCE
        </Text>
        <Text style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 15,
          color: '#111827',
        }}>
          {teeTimePreference}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: '45%' }}>
        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 11,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          marginBottom: 6,
          letterSpacing: 0.5,
        }}>
          RIDE OR WALK
        </Text>
        <Text style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 15,
          color: '#111827',
        }}>
          {walkOrRide}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: '45%' }}>
        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 11,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          marginBottom: 6,
          letterSpacing: 0.5,
        }}>
          GOLF VIBE
        </Text>
        <Text style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 15,
          color: '#111827',
        }}>
          {golfVibe ?? "—"}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: '45%' }}>
        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 11,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          marginBottom: 6,
          letterSpacing: 0.5,
        }}>
          DRINK OF CHOICE
        </Text>
        <Text style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 15,
          color: '#111827',
        }}>
          {drinkOfChoice ?? "—"}
        </Text>
      </View>
    </View>
  </>
));

export default PlayingPreferences;
