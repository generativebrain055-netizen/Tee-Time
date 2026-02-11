import React from "react";
import { View, Text, TouchableOpacity, Modal, Dimensions } from "react-native";
import { X, ChevronLeft, ChevronRight } from "lucide-react-native";
import { COLORS, MONTHS } from "./constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// US standard: Sunday first
const DAYS_US = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DatePickerModalProps {
    visible: boolean;
    onClose: () => void;
    calendarMonth: number;
    calendarYear: number;
    selectedDate: Date | null;
    onSelectDate: (day: number) => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
}

export default function DatePickerModal({
    visible,
    onClose,
    calendarMonth,
    calendarYear,
    selectedDate,
    onSelectDate,
    onPrevMonth,
    onNextMonth,
}: DatePickerModalProps) {
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

    // Sunday = 0, which is correct for US format
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const generateCalendarDays = () => {
        const days: (number | null)[] = [];
        const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
        const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) days.push(null);
        
        // Add all days of the month
        for (let i = 1; i <= daysInMonth; i++) days.push(i);
        
        // Pad to exactly 6 rows (42 cells total: 6 rows × 7 days)
        const totalCells = 42;
        while (days.length < totalCells) {
            days.push(null);
        }
        
        return days;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = (day: number) =>
        today.getDate() === day &&
        today.getMonth() === calendarMonth &&
        today.getFullYear() === calendarYear;

    const isSelected = (day: number) =>
        selectedDate?.getDate() === day &&
        selectedDate?.getMonth() === calendarMonth &&
        selectedDate?.getFullYear() === calendarYear;

    const isPastDate = (day: number) => {
        const date = new Date(calendarYear, calendarMonth, day);
        date.setHours(0, 0, 0, 0);
        return date < today;
    };

    const handleSelectDate = (day: number) => {
        // Allow selecting today and future dates only
        if (!isPastDate(day)) {
            onSelectDate(day);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-[24px] px-6 pt-6 pb-8">
                    {/* Header with X, Month/Year, and Done */}
                    <View className="flex-row items-center justify-between mb-6">
                        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                            <X size={24} color={COLORS.text} strokeWidth={2} />
                        </TouchableOpacity>
                        
                        <View className="flex-row items-center gap-3">
                            <TouchableOpacity onPress={onPrevMonth} style={{ padding: 4 }}>
                                <ChevronLeft size={24} color={COLORS.text} strokeWidth={2} />
                            </TouchableOpacity>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 17,
                                color: '#1F2937',
                                minWidth: 120,
                                textAlign: 'center',
                            }}>
                                {MONTHS[calendarMonth]} {calendarYear}
                            </Text>
                            <TouchableOpacity onPress={onNextMonth} style={{ padding: 4 }}>
                                <ChevronRight size={24} color={COLORS.text} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#3B82F6',
                            }}>
                                Done
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Day headers */}
                    <View className="flex-row mb-4">
                        {DAYS_US.map((d, i) => (
                            <View key={i} style={{ width: (SCREEN_WIDTH - 48) / 7 }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 13,
                                    color: '#6B7280',
                                    textAlign: 'center',
                                }}>
                                    {d[0]}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Calendar grid */}
                    <View className="flex-row flex-wrap">
                        {generateCalendarDays().map((day, i) => {
                            const isPast = day !== null && isPastDate(day);
                            const isTodayDate = day !== null && isToday(day);
                            const isSelectedDate = day !== null && isSelected(day);

                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={{
                                        width: (SCREEN_WIDTH - 48) / 7,
                                        height: 48,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                    }}
                                    onPress={() => day !== null && handleSelectDate(day)}
                                    disabled={day === null || isPast}
                                >
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: isSelectedDate ? '#22C55E' : isTodayDate ? '#F3F4F6' : 'transparent',
                                    }}>
                                        <Text style={{
                                            fontFamily: isSelectedDate || isTodayDate ? 'Inter_600SemiBold' : 'Inter_400Regular',
                                            fontSize: 16,
                                            color: isPast ? '#D1D5DB' : isSelectedDate ? '#FFFFFF' : '#1F2937',
                                        }}>
                                            {day !== null ? day : ""}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
}
