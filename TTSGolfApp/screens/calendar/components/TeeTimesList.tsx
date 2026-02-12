import React, { memo } from "react";
import { View, Text, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { Calendar } from "lucide-react-native";
import { CalendarTeeTime } from "../types";
import { CALENDAR_COLORS } from "../constants";
import TeeTimeCard from "./TeeTimeCard";
import { spacing, fontSize, fontFamily } from "../../../ui/theme/tokens";

interface TeeTimesListProps {
  selectedDate: Date | null;
  teeTimes: CalendarTeeTime[];
  loading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onTeeTimePress?: (teeTimeId: string) => void;
  onCancelSuccess?: () => void;
}

const EmptyState = memo(() => (
  <View style={{ alignItems: "center", paddingVertical: spacing["4xl"] }}>
    <Calendar size={48} color={CALENDAR_COLORS.textSecondary} />
    <Text
      style={{
        fontFamily: fontFamily.medium,
        fontSize: fontSize.base,
        color: CALENDAR_COLORS.textSecondary,
        marginTop: spacing.md,
      }}
    >
      No tee times scheduled
    </Text>
  </View>
));

const TeeTimesList = memo(({
  selectedDate,
  teeTimes,
  loading,
  refreshing = false,
  onRefresh,
  onTeeTimePress,
  onCancelSuccess,
}: TeeTimesListProps) => {
  if (!selectedDate) return null;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}
      showsVerticalScrollIndicator
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[CALENDAR_COLORS.primary]}
            tintColor={CALENDAR_COLORS.primary}
          />
        ) : undefined
      }
    >
      {loading ? (
        <ActivityIndicator size="large" color={CALENDAR_COLORS.primary} style={{ marginTop: spacing.xl }} />
      ) : teeTimes.length > 0 ? (
        teeTimes.map((teeTime) => (
          <TeeTimeCard
            key={teeTime.id}
            teeTime={teeTime}
            onPress={onTeeTimePress}
            onCancelSuccess={onCancelSuccess}
          />
        ))
      ) : (
        <EmptyState />
      )}
    </ScrollView>
  );
});

export default TeeTimesList;