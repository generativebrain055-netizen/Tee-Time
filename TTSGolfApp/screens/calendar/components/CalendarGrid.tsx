import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { CalendarDay } from "../types";
import { MONTHS_SHORT } from "../constants";
import { spacing, fontSize, fontFamily, radii } from "../../../ui/theme/tokens";

const PRIMARY_GREEN = "#5EBC68";

interface DayCellProps {
  item: CalendarDay;
  onPress: (date: Date) => void;
}

const DayCell = memo(({ item, onPress }: DayCellProps) => {
  const handlePress = useCallback(() => {
    if (item.day === "" || item.year == null || item.month == null) return;
    onPress(new Date(item.year, item.month, item.day as number));
  }, [item.day, item.year, item.month, onPress]);

  if (item.day === "") {
    return (
      <View
        style={{
          width: "14.28%",
          aspectRatio: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: "14.28%",
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.xs,
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={{
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          backgroundColor: item.isSelected ? PRIMARY_GREEN : "transparent",
        }}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            fontSize: fontSize.sm,
            color: item.isSelected
              ? "#FFFFFF"
              : item.isOtherMonth
                ? "#D1D5DB"
                : "#1F2937",
            fontFamily: item.isToday ? fontFamily.bold : fontFamily.semiBold,
          }}
        >
          {String(item.day)}
        </Text>
      </TouchableOpacity>
      {item.hasEvent && (
        <View
          style={{
            position: "absolute",
            bottom: spacing["2xs"],
            width: 20,
            height: 2,
            borderRadius: 1,
            backgroundColor: PRIMARY_GREEN,
          }}
        />
      )}
    </View>
  );
});

interface CalendarGridProps {
  currentMonth: number;
  currentYear: number;
  calendarDays: CalendarDay[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayPress: (date: Date) => void;
}

const CalendarGrid = memo(({
  currentMonth,
  currentYear,
  calendarDays,
  onPrevMonth,
  onNextMonth,
  onDayPress,
}: CalendarGridProps) => (
  <View
    style={{
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      flex: 1,
      minHeight: 0,
    }}
  >
    {/* Month row - always visible at top */}
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.lg,
      }}
    >
      <TouchableOpacity onPress={onPrevMonth} style={{ padding: spacing.sm }}>
        <ChevronLeft size={24} color="#6B7280" />
      </TouchableOpacity>
      <View style={{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center" }}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
            color: "#1F2937",
          }}
        >
          {MONTHS_SHORT[currentMonth]} {currentYear}
        </Text>
      </View>
      <TouchableOpacity onPress={onNextMonth} style={{ padding: spacing.sm }}>
        <ChevronRight size={24} color="#6B7280" />
      </TouchableOpacity>
    </View>

    {/* Weekday labels - always visible */}
    <View style={{ flexDirection: "row", marginBottom: spacing.sm }}>
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <View key={day} style={{ width: "14.28%", alignItems: "center", minWidth: 0 }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: fontSize.xs + 1,
              fontFamily: fontFamily.medium,
              color: "#9CA3AF",
            }}
          >
            {day}
          </Text>
        </View>
      ))}
    </View>

    {/* Day grid - scrollable when 6 rows to prevent overflow */}
    <ScrollView
      style={{ flex: 1, minHeight: 0 }}
      contentContainerStyle={{ paddingBottom: spacing.md }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start" }}>
        {calendarDays.map((item) => (
          <DayCell key={item.id} item={item} onPress={onDayPress} />
        ))}
      </View>
    </ScrollView>
  </View>
));

export default CalendarGrid;
