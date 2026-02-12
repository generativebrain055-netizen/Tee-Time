import React, { memo } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { MotiView } from "moti";
import { WeekDay } from "../types";
import { transitions } from "../../../theme/animations";
import { spacing, fontSize, radii, shadows, palette } from "../../../ui/theme/tokens";
import { colorTokens } from "../../../theme/tokens";

interface WeekCalendarProps {
  weekDays: WeekDay[];
  selectedDate: Date | null;
  onSelectDay: (date: Date) => void;
  onViewSchedule: () => void;
  children?: React.ReactNode;
}

const toDateString = (d: Date) => d.toDateString();

const DayColumn = memo(
  ({
    day,
    isSelected,
    onPress,
    index,
  }: {
    day: WeekDay;
    isSelected: boolean;
    onPress: () => void;
    index: number;
  }) => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...transitions.snappy, delay: index * 30 }}
      style={styles.dayColumnWrap}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[
          styles.dayPill,
          isSelected && styles.dayPillSelected,
        ]}
      >
        <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
          {day.dayName}
        </Text>
        <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
          {day.dayNumber}
        </Text>
      </TouchableOpacity>
      {!isSelected && day.hasEvent && (
        <View style={styles.dayDot} />
      )}
    </MotiView>
  )
);
DayColumn.displayName = "DayColumn";

function WeekCalendar({
  weekDays,
  selectedDate,
  onSelectDay,
  onViewSchedule,
  children,
}: WeekCalendarProps) {
  const selectedKey = selectedDate ? toDateString(selectedDate) : null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>This week</Text>
        <TouchableOpacity
          style={styles.viewScheduleButton}
          onPress={onViewSchedule}
          activeOpacity={0.7}
        >
          <Text style={styles.viewScheduleText}>View schedule</Text>
          <ChevronRight size={18} color={palette.blue500} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.daysContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysScrollContent}
          >
            {weekDays.map((day, index) => {
              const isSelected =
                selectedKey !== null && toDateString(day.date) === selectedKey;
              return (
                <DayColumn
                  key={index}
                  day={day}
                  isSelected={isSelected}
                  onPress={() => onSelectDay(day.date)}
                  index={index}
                />
              );
            })}
          </ScrollView>
        </View>
        {children && (
          <>
            <View style={styles.cardDivider} />
            <View style={styles.cardContent}>
              {children}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    backgroundColor: palette.gray50,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: fontSize.xl,
    color: colorTokens.text.primary,
  },
  viewScheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  viewScheduleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.base,
    color: palette.blue500,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radii.lg,
    overflow: "hidden",
    flex: 1,
    elevation: 2,
  },
  daysContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  daysScrollContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    minWidth: "100%",
  },
  dayColumnWrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minWidth: 48,
  },
  dayPill: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    minWidth: 48,
    width: 48,
  },
  dayPillSelected: {
    backgroundColor: palette.green500,
  },
  dayName: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: palette.gray400,
    marginBottom: spacing.xs,
  },
  dayNameSelected: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  dayNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: fontSize.xl,
    color: palette.gray600,
  },
  dayNumberSelected: {
    color: "#FFFFFF",
  },
  dayDot: {
    width: 20,
    height: 2,
    backgroundColor: palette.green500,
    borderRadius: 1,
    marginTop: spacing.xs,
  },
  cardDivider: {
    height: 1,
    backgroundColor: palette.gray200,
  },
  cardContent: {
    flex: 1,
  },
});

export default memo(WeekCalendar);
