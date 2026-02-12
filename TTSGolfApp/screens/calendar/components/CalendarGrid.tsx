import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { CalendarDay } from "../types";
import { MONTHS } from "../constants";
import { spacing, fontSize, fontFamily, radii } from "../../../ui/theme/tokens";

const PRIMARY_GREEN = "#5EBC68";

interface DayCellProps {
  item: CalendarDay;
  onPress: (day: number | "") => void;
}

const DayCell = memo(({ item, onPress }: DayCellProps) => {
  const handlePress = useCallback(() => onPress(item.day), [item.day, onPress]);

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
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.sm,
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          backgroundColor: item.isSelected ? PRIMARY_GREEN : "transparent",
        }}
      >
        <Text
          style={{
            fontSize: fontSize.base,
            color: item.isSelected ? "#FFFFFF" : "#1F2937",
            fontFamily: item.isToday ? fontFamily.bold : fontFamily.semiBold,
          }}
        >
          {item.day}
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
  onDayPress: (day: number | "") => void;
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
      paddingVertical: spacing.xl,
      flex: 1,
      justifyContent: "center",
    }}
  >
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.xl,
      }}
    >
      <TouchableOpacity onPress={onPrevMonth} style={{ padding: spacing.sm }}>
        <ChevronLeft size={24} color="#6B7280" />
      </TouchableOpacity>
      <Text
        style={{
          fontSize: fontSize.lg,
          fontFamily: fontFamily.bold,
          color: "#1F2937",
        }}
      >
        {MONTHS[currentMonth]} {currentYear}
      </Text>
      <TouchableOpacity onPress={onNextMonth} style={{ padding: spacing.sm }}>
        <ChevronRight size={24} color="#6B7280" />
      </TouchableOpacity>
    </View>

    <View style={{ flexDirection: "row", marginBottom: spacing.md }}>
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <View key={day} style={{ width: "14.28%", alignItems: "center" }}>
          <Text
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

    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {calendarDays.map((item) => (
        <DayCell key={item.id} item={item} onPress={onDayPress} />
      ))}
    </View>
  </View>
));

export default CalendarGrid;
