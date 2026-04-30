import React, { memo, useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { X, Calendar, Clock, MapPin } from "lucide-react-native";
import DatePickerModal from "../../screens/CreateTeeTime/DatePickerModal";
import TimePickerModal from "../../screens/CreateTeeTime/TimePickerModal";
import { parseFlexibleTeeTime } from "../../screens/CreateTeeTime/timeInputUtils";
import { COLORS } from "../../screens/CreateTeeTime/constants";
import { teeTimeApi } from "../../services/api";
import {
  formatDateMMDDYYYY,
  formatTime,
  parseCalendarDateLocal,
} from "../../utils/formatting";
import { logger } from "../../utils/logger";

export type EditTeeTimeInitial = {
  courseName: string;
  courseLocation: string;
  teeDate: string;
  teeTime: string;
};

type Props = {
  visible: boolean;
  teeTimeId: string;
  initial: EditTeeTimeInitial | null;
  onClose: () => void;
  onSaved: () => void;
};

function formatDateForApi(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${m}-${d}-${y}`;
}

function formatTimeForApi(time: string): string {
  const normalized = parseFlexibleTeeTime(time.trim()) ?? time;
  const match = normalized.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "10:00";
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

function EditTeeTimeDetailsModalInner({
  visible,
  teeTimeId,
  initial,
  onClose,
  onSaved,
}: Props): React.ReactElement | null {
  const [courseName, setCourseName] = useState("");
  const [courseLocation, setCourseLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeDraft, setTimeDraft] = useState("10:00 AM");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !initial) return;
    setCourseName(initial.courseName || "");
    setCourseLocation(initial.courseLocation || "");
    const d = parseCalendarDateLocal(initial.teeDate);
    setSelectedDate(Number.isNaN(d.getTime()) ? new Date() : d);
    setTimeDraft(formatTime(initial.teeTime) || "10:00 AM");
    setCalendarMonth(d.getMonth());
    setCalendarYear(d.getFullYear());
  }, [visible, initial]);

  const onSelectDate = useCallback(
    (day: number) => {
      setSelectedDate(new Date(calendarYear, calendarMonth, day));
      setShowDatePicker(false);
    },
    [calendarYear, calendarMonth],
  );

  const handleSave = useCallback(async () => {
    if (!initial) return;
    const name = courseName.trim();
    if (!name) {
      Alert.alert("Missing course", "Enter a course or club name.");
      return;
    }
    if (!selectedDate) {
      Alert.alert("Missing date", "Choose a tee date.");
      return;
    }
    const parsed = parseFlexibleTeeTime(timeDraft.trim());
    if (!parsed) {
      Alert.alert(
        "Invalid time",
        "Enter a valid time such as 8:30 AM, 2:45 PM, or 14:30.",
      );
      return;
    }

    const teeDate = formatDateForApi(selectedDate);
    const teeTime = formatTimeForApi(parsed);
    const body: {
      courseName: string;
      courseLocation: string | null;
      teeDate: string;
      teeTime: string;
    } = {
      courseName: name,
      courseLocation: courseLocation.trim() || null,
      teeDate,
      teeTime,
    };

    setSaving(true);
    try {
      const res = await teeTimeApi.patchTeeTime(teeTimeId, body);
      if (res.success) {
        onSaved();
        onClose();
      } else {
        Alert.alert("Could not update", "Try again.");
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "Could not update tee time.";
      logger.warn("[EditTeeTimeDetailsModal] patch failed", e);
      Alert.alert("Update failed", msg);
    } finally {
      setSaving(false);
    }
  }, [
    initial,
    courseName,
    courseLocation,
    selectedDate,
    timeDraft,
    teeTimeId,
    onClose,
    onSaved,
  ]);

  if (!initial) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/50"
      >
        <View className="bg-white rounded-t-3xl max-h-[90%]">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
            <Text className="font-jakarta-bold text-lg text-gray-900">
              Edit date, time & club
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-5 pt-4"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 28 }}
          >
            <Text className="font-jakarta text-sm text-gray-500 mb-4">
              Participants are notified when you save changes to date, time, or course.
            </Text>

            <Text className="font-jakarta-semibold text-xs text-gray-500 mb-1.5">
              CLUB / COURSE NAME
            </Text>
            <View className="flex-row items-center border border-gray-200 rounded-xl px-3 py-3 mb-4 bg-gray-50">
              <MapPin size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
              <TextInput
                className="flex-1 font-jakarta text-base text-gray-900 py-1"
                value={courseName}
                onChangeText={setCourseName}
                placeholder="Course name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text className="font-jakarta-semibold text-xs text-gray-500 mb-1.5">
              LOCATION (OPTIONAL)
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 mb-4 bg-gray-50 font-jakarta text-base text-gray-900"
              value={courseLocation}
              onChangeText={setCourseLocation}
              placeholder="Address or city"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="font-jakarta-semibold text-xs text-gray-500 mb-1.5">
              TEE DATE
            </Text>
            <TouchableOpacity
              className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3.5 mb-4 bg-gray-50"
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Calendar size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
              <Text className="font-jakarta text-base text-gray-900">
                {selectedDate ? formatDateMMDDYYYY(selectedDate) : "Select date"}
              </Text>
            </TouchableOpacity>

            <Text className="font-jakarta-semibold text-xs text-gray-500 mb-1.5">
              TEE TIME
            </Text>
            <TouchableOpacity
              className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3.5 mb-6 bg-gray-50"
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Clock size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
              <Text className="font-jakarta text-base text-gray-900">{timeDraft}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="rounded-xl py-4 items-center mb-3"
              style={{ backgroundColor: COLORS.primary }}
              onPress={() => void handleSave()}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-jakarta-bold text-base text-white">Save changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity className="py-3 items-center mb-2" onPress={onClose} disabled={saving}>
              <Text className="font-jakarta-semibold text-base text-gray-500">Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <DatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          onPrevMonth={() =>
            setCalendarMonth((m) => {
              if (m === 0) {
                setCalendarYear((y) => y - 1);
                return 11;
              }
              return m - 1;
            })
          }
          onNextMonth={() =>
            setCalendarMonth((m) => {
              if (m === 11) {
                setCalendarYear((y) => y + 1);
                return 0;
              }
              return m + 1;
            })
          }
        />

        <TimePickerModal
          visible={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          initialTime={timeDraft}
          onSelect={(t) => {
            setTimeDraft(t);
            setShowTimePicker(false);
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const EditTeeTimeDetailsModal = memo(EditTeeTimeDetailsModalInner);
