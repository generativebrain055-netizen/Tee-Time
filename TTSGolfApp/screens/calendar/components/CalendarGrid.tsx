import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { CalendarDay } from "../types";
import { MONTHS } from "../constants";

const PRIMARY_GREEN = "#5EBC68";

interface DayCellProps {
  item: CalendarDay;
  onPress: (day: number | "") => void;
}

const DayCell = memo(({ item, onPress }: DayCellProps) => {
  const handlePress = useCallback(() => onPress(item.day), [item.day, onPress]);

  if (item.day === "") {
    return <View style={{ width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' }} />;
  }

  return (
    <View style={{ width: '14.28%', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
      <TouchableOpacity
        onPress={handlePress}
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          backgroundColor: item.isSelected ? PRIMARY_GREEN : "transparent",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: item.isSelected ? "#FFFFFF" : "#1F2937",
            fontWeight: item.isToday ? "700" : "600",
            fontFamily: item.isToday ? 'Inter_700Bold' : 'Inter_600SemiBold',
          }}
        >
          {item.day}
        </Text>
      </TouchableOpacity>
      {item.hasEvent && (
        <View
          style={{ 
            position: 'absolute',
            bottom: 2,
            width: 20,
            height: 2,
            borderRadius: 1,
            backgroundColor: PRIMARY_GREEN 
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
  <View style={{ paddingHorizontal: 16, paddingVertical: 20, flex: 1, justifyContent: 'center' }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <TouchableOpacity onPress={onPrevMonth} style={{ padding: 8 }}>
        <ChevronLeft size={24} color="#6B7280" />
      </TouchableOpacity>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', fontFamily: 'Inter_700Bold' }}>
        {MONTHS[currentMonth]} {currentYear}
      </Text>
      <TouchableOpacity onPress={onNextMonth} style={{ padding: 8 }}>
        <ChevronRight size={24} color="#6B7280" />
      </TouchableOpacity>
    </View>

    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <View key={day} style={{ width: '14.28%', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#9CA3AF', fontFamily: 'Inter_500Medium' }}>{day}</Text>
        </View>
      ))}
    </View>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {calendarDays.map((item) => (
        <DayCell key={item.id} item={item} onPress={onDayPress} />
      ))}
    </View>
  </View>
));

export default CalendarGrid;
