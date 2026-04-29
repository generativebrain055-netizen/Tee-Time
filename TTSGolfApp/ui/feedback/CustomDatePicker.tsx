/**
 * CustomDatePicker — iOS-style date picker modal
 * 
 * Usage:
 *   <CustomDatePicker
 *     visible={showPicker}
 *     value={selectedDate}
 *     onConfirm={(date) => { setSelectedDate(date); setShowPicker(false); }}
 *     onCancel={() => setShowPicker(false)}
 *     minimumDate={new Date()}
 *   />
 */
import React, { memo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { formatDateMMDDYYYY } from '../../utils/formatting';

export interface CustomDatePickerProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
}

function CustomDatePickerInner({
  visible,
  value,
  onConfirm,
  onCancel,
  minimumDate,
  maximumDate,
  mode = 'date',
}: CustomDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState(value);

  // Generate dates for the next 30 days
  const generateDates = () => {
    const dates = [];
    const start = minimumDate || new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Generate time slots (every 30 minutes)
  const generateTimes = () => {
    const times = [];
    for (let hour = 6; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        times.push({ hour, minute });
      }
    }
    return times;
  };

  const dates = generateDates();
  const times = generateTimes();

  const formatDate = (date: Date) => {
    return formatDateMMDDYYYY(date);
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
    >
      <AnimatePresence>
        {visible && (
          <>
            {/* Backdrop */}
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 200 }}
              style={styles.backdrop}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={onCancel}
              />
            </MotiView>

            {/* Modal Content */}
            <View style={styles.container}>
              <MotiView
                from={{ opacity: 0, translateY: 50 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: 30 }}
                transition={{
                  type: 'spring',
                  damping: 25,
                  stiffness: 300,
                }}
                style={styles.modal}
              >
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>
                    {mode === 'date' ? 'Select Date' : mode === 'time' ? 'Select Time' : 'Select Date & Time'}
                  </Text>
                </View>

                {/* Date Selection */}
                {(mode === 'date' || mode === 'datetime') && (
                  <ScrollView 
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                  >
                    {dates.map((date) => (
                      <TouchableOpacity
                        key={date.toISOString()}
                        style={[
                          styles.dateItem,
                          isSameDate(date, selectedDate) && styles.dateItemSelected,
                        ]}
                        onPress={() => setSelectedDate(date)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dateText,
                            isSameDate(date, selectedDate) && styles.dateTextSelected,
                          ]}
                        >
                          {formatDate(date)}
                          {isToday(date) && (
                            <Text style={styles.todayBadge}> Today</Text>
                          )}
                        </Text>
                        {isSameDate(date, selectedDate) && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Time Selection */}
                {(mode === 'time' || mode === 'datetime') && (
                  <ScrollView 
                    style={[styles.scrollView, { maxHeight: 200 }]}
                    showsVerticalScrollIndicator={false}
                  >
                    {times.map(({ hour, minute }) => {
                      const isSelected = 
                        selectedDate.getHours() === hour &&
                        selectedDate.getMinutes() === minute;
                      
                      return (
                        <TouchableOpacity
                          key={`${hour}-${minute}`}
                          style={[
                            styles.timeItem,
                            isSelected && styles.timeItemSelected,
                          ]}
                          onPress={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setHours(hour, minute);
                            setSelectedDate(newDate);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.timeText,
                              isSelected && styles.timeTextSelected,
                            ]}
                          >
                            {formatTime(hour, minute)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={onCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.confirmButton]}
                    onPress={() => onConfirm(selectedDate)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </MotiView>
            </View>
          </>
        )}
      </AnimatePresence>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 300,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  dateText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#374151',
  },
  dateTextSelected: {
    color: '#059669',
    fontFamily: 'Inter_600SemiBold',
  },
  todayBadge: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#059669',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  timeItem: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  timeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#374151',
  },
  timeTextSelected: {
    color: '#059669',
    fontFamily: 'Inter_600SemiBold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#EEEEEE',
  },
  cancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  confirmButton: {
    backgroundColor: '#5EBC68',
  },
  confirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export const CustomDatePicker = memo(CustomDatePickerInner);
CustomDatePicker.displayName = 'CustomDatePicker';
