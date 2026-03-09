import React, { useState, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Calendar, Clock as ClockIcon } from 'lucide-react-native';
import { availabilityApi, type TimeSlot, type DayOfWeek, type TimeSlotType } from '../services/api/availabilityApi';
import { ScreenShell, AppHeader } from '../ui';
import logger from '../utils/logger';

const WEEK_DAYS: { id: DayOfWeek; label: string }[] = [
  { id: 'Mon', label: 'Monday' },
  { id: 'Tue', label: 'Tuesday' },
  { id: 'Wed', label: 'Wednesday' },
  { id: 'Thu', label: 'Thursday' },
  { id: 'Fri', label: 'Friday' },
  { id: 'Sat', label: 'Saturday' },
  { id: 'Sun', label: 'Sunday' },
];

const TIME_SLOTS: { id: TimeSlotType; label: string }[] = [
  { id: 'morning', label: 'Morning (7-9)' },
  { id: 'late_morning', label: 'Late morning (9-12)' },
  { id: 'afternoon', label: 'Afternoon (12-3)' },
  { id: 'late_afternoon', label: 'Late afternoon (3-5)' },
  { id: 'evening', label: 'Evening (5-8)' },
];

type CustomTimes = Record<DayOfWeek, TimeSlotType[]>;

/** Day order for "next week" (Monday first). */
const DAY_ORDER: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Short labels for calendar strip */
const DAY_SHORT: Record<DayOfWeek, string> = {
  Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'T', Fri: 'F', Sat: 'S', Sun: 'S',
};

/** Get the upcoming week (Mon–Sun) for the calendar strip. If today is Mon, use this week; else use next Monday–Sunday. */
function getUpcomingWeekDates(): { dayOfWeek: DayOfWeek; date: Date; dayNum: number }[] {
  const today = new Date();
  const dayIndex = today.getDay();
  const daysUntilMonday = dayIndex === 0 ? 1 : dayIndex === 1 ? 0 : 8 - dayIndex;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + daysUntilMonday);
  return DAY_ORDER.map((dayOfWeek, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return { dayOfWeek, date: d, dayNum: d.getDate() };
  });
}

function getNextWeekDateForDay(dayOfWeek: DayOfWeek): Date {
  const today = new Date();
  const dayIndex = DAY_ORDER.indexOf(dayOfWeek);
  const nextMonday = new Date(today);
  const daysUntilMonday = (8 - today.getDay()) % 7;
  nextMonday.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
  nextMonday.setDate(nextMonday.getDate() + dayIndex);
  return nextMonday;
}

function formatDayDate(date: Date): string {
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  const suffix = day >= 11 && day <= 13 ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th';
  return `${month} ${day}${suffix}`;
}

// Day chip component - matches design
const DayChip = memo<{
  label: string;
  isSelected: boolean;
  onPress: () => void;
}>(({ label, isSelected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: isSelected ? 2 : 1,
      borderColor: isSelected ? '#111827' : '#D1D5DB',
      borderStyle: isSelected ? 'solid' : 'dashed',
      backgroundColor: '#FFFFFF',
    }}
    activeOpacity={0.7}
  >
    <Text
      style={{
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        color: isSelected ? '#111827' : '#9CA3AF',
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
));

DayChip.displayName = 'DayChip';

// Time slot chip component - matches design
const TimeChip = memo<{
  label: string;
  isSelected: boolean;
  onPress: () => void;
}>(({ label, isSelected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: isSelected ? 2 : 1,
      borderColor: isSelected ? '#111827' : '#D1D5DB',
      borderStyle: isSelected ? 'solid' : 'dashed',
      backgroundColor: '#FFFFFF',
    }}
    activeOpacity={0.7}
  >
    <Text
      style={{
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        color: isSelected ? '#111827' : '#9CA3AF',
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
));

TimeChip.displayName = 'TimeChip';

// Weekly calendar day cell - tap to toggle day availability
const WeekDayCell = memo<{
  dayOfWeek: DayOfWeek;
  dayNum: number;
  isSelected: boolean;
  onPress: () => void;
}>(({ dayOfWeek, dayNum, isSelected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={{
      flex: 1,
      minWidth: 40,
      paddingVertical: 12,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isSelected ? '#DCFCE7' : '#FFFFFF',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isSelected ? '#22C55E' : '#E5E7EB',
    }}
  >
    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#6B7280', marginBottom: 2 }}>
      {DAY_SHORT[dayOfWeek]}
    </Text>
    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: isSelected ? '#166534' : '#111827' }}>
      {dayNum}
    </Text>
  </TouchableOpacity>
));
WeekDayCell.displayName = 'WeekDayCell';

// Loading skeleton
const LoadingSkeleton = memo(() => {
  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader title="Set your availability" onBack={() => {}} />
      <View className="px-6 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="mb-6">
            <View className="w-32 h-5 bg-gray-200 rounded mb-3" />
            <View className="flex-row flex-wrap gap-2">
              <View className="w-24 h-9 bg-gray-200 rounded-lg" />
              <View className="w-28 h-9 bg-gray-200 rounded-lg" />
              <View className="w-24 h-9 bg-gray-200 rounded-lg" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

function EditAvailabilityScreen({ navigation, route }: any) {
  const [loading, setLoading] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [dayDetailDay, setDayDetailDay] = useState<DayOfWeek | null>(null);
  const [customTimes, setCustomTimes] = useState<CustomTimes>({
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  });

  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const response = await availabilityApi.getUserAvailability();
        if (response.success && response.data && Array.isArray(response.data)) {
          const grouped: CustomTimes = {
            Mon: [],
            Tue: [],
            Wed: [],
            Thu: [],
            Fri: [],
            Sat: [],
            Sun: [],
          };

          response.data.forEach((slot) => {
            if (slot.is_active && slot.day_of_week && slot.time_slot) {
              if (!grouped[slot.day_of_week].includes(slot.time_slot)) {
                grouped[slot.day_of_week].push(slot.time_slot);
              }
            }
          });

          setCustomTimes(grouped);
        }
      } catch (error) {
        logger.error('Failed to load availability:', error);
        // Error loading availability - user can still set new availability
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, []);

  const toggleDaySlot = useCallback((day: DayOfWeek, slot: TimeSlotType) => {
    setCustomTimes((prev) => {
      const daySlots = prev[day];
      const isSelected = daySlots.includes(slot);

      return {
        ...prev,
        [day]: isSelected
          ? daySlots.filter((s) => s !== slot)
          : [...daySlots, slot],
      };
    });
  }, []);

  const toggleDay = useCallback((day: DayOfWeek) => {
    setCustomTimes((prev) => {
      const daySlots = prev[day];
      const hasAnySelected = daySlots.length > 0;

      return {
        ...prev,
        [day]: hasAnySelected ? [] : TIME_SLOTS.map((s) => s.id),
      };
    });
  }, []);

  const openDayDetail = useCallback((day: DayOfWeek) => {
    const hasSlots = customTimes[day].length > 0;
    if (!hasSlots) {
      setCustomTimes((prev) => ({
        ...prev,
        [day]: TIME_SLOTS.map((s) => s.id),
      }));
    }
    setDayDetailDay(day);
  }, [customTimes]);

  const closeDayDetail = useCallback(() => setDayDetailDay(null), []);

  const totalSelected = Object.values(customTimes).reduce(
    (sum, slots) => sum + slots.length,
    0
  );

  const selectedDays = Object.entries(customTimes).filter(([_, slots]) => slots.length > 0);

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar style="dark" />
        <LoadingSkeleton />
      </View>
    );
  }

  return (
    <ScreenShell>

      <AppHeader
        title="Set your availability"
        onBack={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            onPress={() => {
              if (totalSelected > 0) {
                navigation.navigate('ConfirmAvailability', { customTimes });
              }
            }}
            disabled={totalSelected === 0}
            style={{
              backgroundColor: totalSelected > 0 ? '#22C55E' : '#E5E7EB',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 52,
              flexDirection: 'row',
              flexShrink: 0,
            }}
            activeOpacity={0.8}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 14,
                color: totalSelected > 0 ? '#FFFFFF' : '#9CA3AF',
              }}
            >
              Next
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={{ flex: 1, backgroundColor: '#F9FAFB' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Weekly calendar view - tap days to set general availability */}
          <View style={{ marginBottom: 24, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
              Your week
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', marginBottom: 12 }}>
              Tap a day to mark when you're available
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {getUpcomingWeekDates().map(({ dayOfWeek, dayNum }) => {
                const hasSlots = customTimes[dayOfWeek].length > 0;
                return (
                  <WeekDayCell
                    key={dayOfWeek}
                    dayOfWeek={dayOfWeek}
                    dayNum={dayNum}
                    isSelected={hasSlots}
                    onPress={() => openDayDetail(dayOfWeek)}
                  />
                );
              })}
            </View>
          </View>

          {/* When can you play section */}
          <View style={{ marginBottom: 32, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#DCFCE7',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Calendar size={20} color="#22C55E" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', fontFamily: 'Inter_600SemiBold' }}>
                When can you play this week?
              </Text>
            </View>

            {/* Day Chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WEEK_DAYS.map((day) => {
                const hasSlots = customTimes[day.id].length > 0;
                return (
                  <DayChip
                    key={day.id}
                    label={day.label}
                    isSelected={hasSlots}
                    onPress={() => openDayDetail(day.id)}
                  />
                );
              })}
            </View>
          </View>

          {/* What time can you play section */}
          <View style={{ marginBottom: 32, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#DBEAFE',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <ClockIcon size={20} color="#3B82F6" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', fontFamily: 'Inter_600SemiBold' }}>
                What time can you play?
              </Text>
            </View>

            {/* Time Slot Chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {TIME_SLOTS.map((slot) => {
                // Check if this time slot is selected for any day
                const isSelectedAnywhere = selectedDays.some(([_, slots]) => 
                  slots.includes(slot.id)
                );
                return (
                  <TimeChip
                    key={slot.id}
                    label={slot.label}
                    isSelected={isSelectedAnywhere}
                    onPress={() => {
                      // Toggle this time slot for all selected days
                      setCustomTimes((prev) => {
                        const newTimes = { ...prev };
                        selectedDays.forEach(([day]) => {
                          const daySlots = newTimes[day as DayOfWeek];
                          const hasSlot = daySlots.includes(slot.id);
                          if (hasSlot) {
                            newTimes[day as DayOfWeek] = daySlots.filter(s => s !== slot.id);
                          } else {
                            newTimes[day as DayOfWeek] = [...daySlots, slot.id];
                          }
                        });
                        return newTimes;
                      });
                    }}
                  />
                );
              })}
            </View>

            {/* Customize toggle */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#F3F4F6',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', fontFamily: 'Inter_600SemiBold' }}>
                Customize times per day
              </Text>
              <TouchableOpacity
                onPress={() => setIsCustomizing(!isCustomizing)}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isCustomizing ? '#22C55E' : '#E5E7EB',
                  justifyContent: 'center',
                  padding: 2,
                }}
                activeOpacity={0.8}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: '#FFFFFF',
                    alignSelf: isCustomizing ? 'flex-end' : 'flex-start',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Per-day customization */}
          {isCustomizing && selectedDays.length > 0 && (
            <View>
              {selectedDays.map(([day, slots]) => {
                const dayLabel = WEEK_DAYS.find(d => d.id === day)?.label ?? day;
                const dateLabel = formatDayDate(getNextWeekDateForDay(day as DayOfWeek));
                return (
                <View key={day} style={{ marginBottom: 24, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12 }}>
                  <TouchableOpacity
                    onPress={() => setDayDetailDay(day as DayOfWeek)}
                    style={{ marginBottom: 12 }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', fontFamily: 'Inter_600SemiBold' }}>
                      {dayLabel} – {dateLabel}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                      Tap to customize time blocks
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {TIME_SLOTS.map((slot) => (
                      <TimeChip
                        key={slot.id}
                        label={slot.label}
                        isSelected={slots.includes(slot.id)}
                        onPress={() => toggleDaySlot(day as DayOfWeek, slot.id)}
                      />
                    ))}
                  </View>
                </View>
              );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Per-day detail modal: customize time blocks for one day */}
      <Modal
        visible={dayDetailDay !== null}
        transparent
        animationType="fade"
        onRequestClose={closeDayDetail}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: 24,
          }}
          activeOpacity={1}
          onPress={closeDayDetail}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
            }}
          >
            {dayDetailDay !== null && (
              <>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>
                  {WEEK_DAYS.find(d => d.id === dayDetailDay)?.label ?? dayDetailDay}
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Inter_400Regular', marginBottom: 20 }}>
                  {formatDayDate(getNextWeekDateForDay(dayDetailDay))}
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', marginBottom: 12 }}>
                  Select time blocks for this day
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {TIME_SLOTS.map((slot) => (
                    <TimeChip
                      key={slot.id}
                      label={slot.label}
                      isSelected={customTimes[dayDetailDay].includes(slot.id)}
                      onPress={() => toggleDaySlot(dayDetailDay, slot.id)}
                    />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setCustomTimes((prev) => ({ ...prev, [dayDetailDay]: [] }));
                      closeDayDetail();
                    }}
                    style={{ paddingVertical: 10, paddingHorizontal: 4 }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, color: '#DC2626', fontFamily: 'Inter_500Medium' }}>
                      Clear day
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={closeDayDetail}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      borderRadius: 12,
                      backgroundColor: '#111827',
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' }}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenShell>
  );
}

export default memo(EditAvailabilityScreen);
