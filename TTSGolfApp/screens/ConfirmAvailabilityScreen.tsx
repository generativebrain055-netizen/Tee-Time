/**
 * Confirm your availability - review and save.
 * Shows list of days with "Available" badge and time slots, then Save Availability button.
 * On save success: modal "Your schedule is now live!" with green checkmark.
 */
import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { ScreenShell, AppHeader } from '../ui';
import { availabilityApi, type DayOfWeek, type TimeSlotType, type TimeSlot } from '../services/api/availabilityApi';
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

const PRIMARY_GREEN = '#22C55E';

interface ConfirmAvailabilityScreenProps {
  navigation: any;
  route: { params?: { customTimes?: CustomTimes } };
}

function ConfirmAvailabilityScreen({ navigation, route }: ConfirmAvailabilityScreenProps) {
  const customTimesFromParams = (route?.params?.customTimes ?? {}) as CustomTimes;
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const selectedDays = (Object.entries(customTimesFromParams) as [DayOfWeek, TimeSlotType[]][])
    .filter(([, slots]) => slots.length > 0)
    .sort(([a], [b]) => WEEK_DAYS.findIndex((d) => d.id === a) - WEEK_DAYS.findIndex((d) => d.id === b));

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const availability: TimeSlot[] = [];
      Object.entries(customTimesFromParams).forEach(([day, slots]) => {
        slots.forEach((slot) => {
          availability.push({ day_of_week: day as DayOfWeek, time_slot: slot });
        });
      });

      const response = await availabilityApi.saveUserAvailability(availability);
      if (response.success) {
        setShowSuccessModal(true);
      } else {
        throw new Error(response.message || 'Failed to save availability');
      }
    } catch (error: any) {
      logger.error('Save availability error', error);
      const msg = error?.message || error?.response?.data?.message || 'Failed to save availability';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [customTimesFromParams]);

  const closeSuccessAndGoBack = useCallback(() => {
    setShowSuccessModal(false);
    navigation.goBack();
  }, [navigation]);

  if (selectedDays.length === 0) {
    if (navigation.canGoBack()) navigation.goBack();
    return null;
  }

  return (
    <ScreenShell>
      <AppHeader title="Confirm your availability" onBack={() => navigation.goBack()} />

      <View style={styles.container}>
        <Text style={styles.intro}>Here's your availability for next week.</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedDays.map(([day, slots]) => {
            const dayLabel = WEEK_DAYS.find((d) => d.id === day)?.label ?? day;
            const slotLabels = slots
              .map((id) => TIME_SLOTS.find((s) => s.id === id)?.label)
              .filter(Boolean) as string[];
            return (
              <View key={day} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardDay}>{dayLabel}</Text>
                  <View style={styles.availablePill}>
                    <Text style={styles.availablePillText}>Available</Text>
                  </View>
                </View>
                <View style={styles.slotRow}>
                  {slotLabels.map((label) => (
                    <View key={label} style={styles.slotTag}>
                      <Text style={styles.slotTagText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Availability</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={closeSuccessAndGoBack}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeSuccessAndGoBack}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <View style={styles.modalCheckCircle}>
                <Text style={styles.modalCheckmark}>✓</Text>
              </View>
            </View>
            <Text style={styles.modalTitle}>Your schedule is now live!</Text>
            <Text style={styles.modalDescription}>
              Your Roster and On-Deck players can now see when you're free to tee it up.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={closeSuccessAndGoBack} activeOpacity={0.8}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  intro: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#374151',
    marginBottom: 20,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardDay: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#111827',
    marginRight: 10,
  },
  availablePill: {
    backgroundColor: PRIMARY_GREEN,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availablePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  slotTagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconWrap: { marginBottom: 20 },
  modalCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCheckmark: {
    fontSize: 32,
    color: PRIMARY_GREEN,
    fontFamily: 'Inter_700Bold',
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  modalButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});

export default memo(ConfirmAvailabilityScreen);
