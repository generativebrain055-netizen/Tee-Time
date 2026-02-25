import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
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
  /** When true, the line between weekdays and content is hidden (e.g. empty state) */
  hideDivider?: boolean;
}

const toDateString = (d: Date) => d.toDateString();

/** Fixed row heights so layout does not shift when selected or when schedule dot is shown */
const WEEKDAY_ROW_HEIGHT = 20;
const DAY_NUMBER_ROW_HEIGHT = 28;
const UNDERLINE_ROW_HEIGHT = 10;

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
        <View style={[styles.weekdayRow, { height: WEEKDAY_ROW_HEIGHT }]}>
          <Text
            style={[styles.dayName, isSelected && styles.dayNameSelected]}
            numberOfLines={1}
          >
            {day.dayName}
          </Text>
        </View>
        <View style={[styles.dayNumberRow, { height: DAY_NUMBER_ROW_HEIGHT }]}>
          <Text
            style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}
            numberOfLines={1}
          >
            {day.dayNumber}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={[styles.underlineRow, { height: UNDERLINE_ROW_HEIGHT }]}>
        {!isSelected && day.hasEvent ? (
          <View style={styles.dayDot} />
        ) : null}
      </View>
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
  hideDivider = false,
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
          <View style={styles.daysRow}>
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
          </View>
        </View>
        {children && (
          <>
            {!hideDivider && <View style={styles.cardDivider} />}
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
  daysRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    width: "100%",
  },
  dayColumnWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: WEEKDAY_ROW_HEIGHT + DAY_NUMBER_ROW_HEIGHT + UNDERLINE_ROW_HEIGHT + spacing.md * 2,
  },
  dayPill: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    width: "100%",
  },
  dayPillSelected: {
    backgroundColor: palette.green500,
  },
  weekdayRow: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  dayNumberRow: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  underlineRow: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  dayName: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.sm,
    color: palette.gray400,
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
