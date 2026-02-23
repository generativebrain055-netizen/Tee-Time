import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Check, Clock } from 'lucide-react-native';
import { availabilityApi, type TimeSlot, type DayOfWeek, type TimeSlotType } from '../../services/api/availabilityApi';

interface AvailabilityOnboardingScreenProps {
  navigation: any;
}

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

type Step = 'intro' | 'selection' | 'confirm';
type CustomTimes = Record<DayOfWeek, TimeSlotType[]>;

const Chip: React.FC<{
  label: string;
  isSelected: boolean;
  onPress: () => void;
}> = ({ label, isSelected, onPress }) => (
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
);

const Toggle: React.FC<{
  isOn: boolean;
  onToggle: () => void;
}> = ({ isOn, onToggle }) => (
  <TouchableOpacity
    onPress={onToggle}
    style={{
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: isOn ? '#22C55E' : '#E5E7EB',
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
        alignSelf: isOn ? 'flex-end' : 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      }}
    />
  </TouchableOpacity>
);

export default function AvailabilityOnboardingScreen({
  navigation,
}: AvailabilityOnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('intro');
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Selection State
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [globalTimes, setGlobalTimes] = useState<TimeSlotType[]>([]);
  const [customTimes, setCustomTimes] = useState<Partial<CustomTimes>>({});

  const toggleDay = useCallback((dayId: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  }, []);

  const toggleGlobalTime = useCallback((timeId: TimeSlotType) => {
    setGlobalTimes((prev) =>
      prev.includes(timeId) ? prev.filter((t) => t !== timeId) : [...prev, timeId]
    );
  }, []);

  const toggleCustomTime = useCallback((dayId: DayOfWeek, timeId: TimeSlotType) => {
    setCustomTimes((prev) => {
      const dayTimes = prev[dayId] || [];
      const newDayTimes = dayTimes.includes(timeId)
        ? dayTimes.filter((t) => t !== timeId)
        : [...dayTimes, timeId];
      return { ...prev, [dayId]: newDayTimes };
    });
  }, []);

  const handleSkip = useCallback(() => {
    // Dismiss without saving any availability; user can set it later from settings
    navigation?.replace('Home');
  }, [navigation]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Prepare availability data - flatten to match backend format
      const availabilityData: TimeSlot[] = selectedDays.flatMap((dayId) => {
        let timeIds: TimeSlotType[] = [];
        if (isCustomizing) {
          timeIds = customTimes[dayId] || [];
        } else {
          timeIds = globalTimes;
        }

        // Create one entry per time slot
        return timeIds.map((timeId) => ({
          day_of_week: dayId,
          time_slot: timeId,
        }));
      });

      // Save to backend
      const result = await availabilityApi.saveUserAvailability(availabilityData);

      // Handle backend returning success: false (e.g. 200 with failure body)
      if (result && (result as { success?: boolean }).success === false) {
        const msg = (result as { message?: string }).message || 'Failed to save availability.';
        throw new Error(msg);
      }

      setShowSuccess(true);
      setTimeout(() => {
        navigation?.replace('Home');
      }, 2000);
    } catch (error: any) {
      const { logger } = require('../../utils/logger');
      logger.error('[AvailabilityOnboarding] Save availability error', error);
      const message =
        error?.message ||
        (error?.response?.data?.message ?? error?.response?.data?.error) ||
        'Failed to save availability. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  }, [selectedDays, isCustomizing, customTimes, globalTimes, navigation]);

  const getSummaryData = useCallback(() => {
    const sortedDays = WEEK_DAYS.filter((d) => selectedDays.includes(d.id));

    return sortedDays.map((day) => {
      let timeIds: TimeSlotType[] = [];
      if (isCustomizing) {
        timeIds = customTimes[day.id] || [];
      } else {
        timeIds = globalTimes;
      }

      const times = timeIds
        .map((tid) => TIME_SLOTS.find((t) => t.id === tid)?.label)
        .filter(Boolean) as string[];

      return {
        dayLabel: day.label,
        times,
      };
    });
  }, [selectedDays, isCustomizing, customTimes, globalTimes]);

  // Intro Step
  if (step === 'intro') {
    return (
      <View
        className="flex-1 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <StatusBar style="dark" />
        <View className="flex-1 p-6 relative">
          {/* Skip - dismiss without saving availability */}
          <View className="absolute top-0 right-6 z-10">
            <TouchableOpacity
              onPress={handleSkip}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Text className="text-gray-500 font-semibold text-sm">Skip</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 flex-col items-center justify-center mt-20">
            <View className="w-24 h-24 bg-green-50 rounded-md flex items-center justify-center mb-8">
              <Calendar size={40} color="#10B981" strokeWidth={1.5} />
            </View>

            <Text className="text-2xl font-black text-gray-900 mb-4 text-center">
              It's that time of the week!
            </Text>

            <Text className="text-gray-500 text-sm leading-relaxed text-center max-w-[280px]">
              Update your availability so your Roster and On-Deck players know when
              you're available to play.
            </Text>
          </View>

          <TouchableOpacity
            className="mb-8 bg-green-500 py-3.5 rounded-md items-center"
            style={{
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={() => setStep('selection')}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-sm">Let's go</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Selection Step
  if (step === 'selection') {
    return (
      <View
        className="flex-1 bg-gray-50"
        style={{ paddingTop: insets.top }}
      >
        <StatusBar style="dark" />

        {/* Header */}
        <View className="px-6 py-4 bg-white flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => setStep('intro')}
            className="p-2 -ml-2 rounded-full"
          >
            <ArrowLeft size={24} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">
            Set your availability
          </Text>
          <TouchableOpacity
            onPress={() => setStep('confirm')}
            disabled={selectedDays.length === 0}
            style={{
              backgroundColor: selectedDays.length === 0 ? '#E5E7EB' : '#22C55E',
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 15,
              color: selectedDays.length === 0 ? '#9CA3AF' : '#FFFFFF',
            }}>
              Next
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Days Section */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center mr-3">
                <Calendar size={20} color="#5EBC68" strokeWidth={2} />
              </View>
              <Text className="text-lg font-bold text-gray-900">
                When can you play this week?
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {WEEK_DAYS.map((day) => (
                <Chip
                  key={day.id}
                  label={day.label}
                  isSelected={selectedDays.includes(day.id)}
                  onPress={() => toggleDay(day.id)}
                />
              ))}
            </View>
          </View>

          {/* Times Section */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                <Clock size={20} color="#3B82F6" strokeWidth={2} />
              </View>
              <Text className="text-lg font-bold text-gray-900">
                What time can you play?
              </Text>
            </View>

            {!isCustomizing && (
              <View className="flex-row flex-wrap gap-2 mb-6">
                {TIME_SLOTS.map((time) => (
                  <Chip
                    key={time.id}
                    label={time.label}
                    isSelected={globalTimes.includes(time.id)}
                    onPress={() => toggleGlobalTime(time.id)}
                  />
                ))}
              </View>
            )}

            <View className="flex-row items-center justify-between pt-4">
              <Text className="text-sm font-semibold text-gray-900">
                Customize times per day
              </Text>
              <Toggle
                isOn={isCustomizing}
                onToggle={() => setIsCustomizing(!isCustomizing)}
              />
            </View>

            {/* Custom Times */}
            {isCustomizing && (
              <View className="mt-6" style={{ gap: 24 }}>
                {selectedDays.length === 0 && (
                  <Text className="text-sm text-gray-400 text-center italic">
                    Select days above to customize times
                  </Text>
                )}
                {WEEK_DAYS.filter((d) => selectedDays.includes(d.id)).map((day) => (
                  <View key={day.id}>
                    <Text className="text-base font-bold text-gray-900 mb-3">
                      {day.label} - November 24th
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {TIME_SLOTS.map((time) => {
                        const dayTimes = customTimes[day.id] || [];
                        return (
                          <Chip
                            key={time.id}
                            label={time.label}
                            isSelected={dayTimes.includes(time.id)}
                            onPress={() => toggleCustomTime(day.id, time.id)}
                          />
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Confirm Step
  const summaryData = getSummaryData();

  return (
    <View
      className="flex-1 bg-gray-50 relative"
      style={{ paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-4 bg-white flex-row items-center gap-4">
        <TouchableOpacity
          onPress={() => setStep('selection')}
          className="p-2 -ml-2 rounded-full"
        >
          <ArrowLeft size={24} color="#000000" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          Confirm your availability
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-base text-gray-700 mb-6">
          Here's your availability for next week
        </Text>

        <View style={{ gap: 16 }}>
          {summaryData.map((item, idx) => (
            <View
              key={idx}
              className="bg-white p-5 rounded-xl border border-gray-100"
            >
              <View className="flex-row items-center mb-4">
                <Text className="text-lg font-bold text-gray-900 mr-2">
                  {item.dayLabel}
                </Text>
                <View className="px-3 py-1 bg-green-100 rounded-full">
                  <Text className="text-green-700 text-xs font-bold">
                    Available
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {item.times.length > 0 ? (
                  item.times.map((t) => (
                    <View key={t} className="bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200">
                      <Text className="text-gray-900 text-sm font-semibold">
                        {t}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-sm text-gray-400 italic">
                    No specific times selected
                  </Text>
                )}
              </View>
            </View>
          ))}
          {summaryData.length === 0 && (
            <View className="text-center py-10">
              <Text className="text-gray-400 text-base text-center">
                No days selected.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
        <TouchableOpacity
          className="bg-primary py-4 rounded-md items-center"
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Confirm</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      {showSuccess && (
        <View className="absolute inset-0 bg-black/40 flex items-center justify-center p-8 z-50">
          <View className="bg-white rounded-md p-8 w-full items-center">
            <View className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <Check size={40} color="#10B981" strokeWidth={3} />
            </View>
            <Text className="text-xl font-black text-gray-900 mb-3 text-center">
              Your schedule is now live!
            </Text>
            <Text className="text-sm text-gray-500 leading-relaxed text-center">
              Your Roster and On-Deck players can now see when you're free to tee it
              up.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
