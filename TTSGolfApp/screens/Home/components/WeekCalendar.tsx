import React, { memo } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { MotiView } from "moti";
import { WeekDay } from "../types";
import { transitions } from "../../../theme/animations";

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
      className="items-center justify-center flex-1 min-w-[48px]"
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        className={`items-center justify-center py-3 px-2 rounded-lg min-w-[48px] w-12 ${isSelected ? 'bg-primary' : ''}`}
      >
        <Text className={`font-sans text-sm mb-1 ${isSelected ? 'font-sans-semibold text-white' : 'text-gray-400'}`}>
          {day.dayName}
        </Text>
        <Text className={`font-sans-bold text-xl ${isSelected ? 'text-white' : 'text-gray-600'}`}>
          {day.dayNumber}
        </Text>
      </TouchableOpacity>
      {!isSelected && day.hasEvent && (
        <View className="w-5 h-0.5 bg-primary rounded-full mt-1" />
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
    <View className="px-5 pt-5 pb-5 bg-gray-50 flex-1">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="font-sans-bold text-xl text-gray-900">This week</Text>
        <TouchableOpacity
          className="flex-row items-center gap-1"
          onPress={onViewSchedule}
          activeOpacity={0.7}
        >
          <Text className="font-sans-semibold text-base text-blue-500">View schedule</Text>
          <ChevronRight size={18} color="#3B82F6" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
      <View 
        className="bg-white rounded-2xl overflow-hidden flex-1"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="px-4 pt-4 pb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, minWidth: '100%' }}
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
            <View className="h-px bg-gray-200" />
            <View className="flex-1">
              {children}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({});

export default memo(WeekCalendar);
