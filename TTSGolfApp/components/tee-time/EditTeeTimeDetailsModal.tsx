import React, { memo, useCallback, useEffect, useRef, useState } from "react";
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
import { X, Calendar, Clock } from "lucide-react-native";
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
import GolfCourseAutocomplete, {
  type GolfCourse,
} from "../GolfCourseAutocomplete";

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

/** Typed US-style or API-style date → local calendar Date, or null. */
function parseUsDateInput(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (mdy) {
    const month = parseInt(mdy[1], 10) - 1;
    const day = parseInt(mdy[2], 10);
    const year = parseInt(mdy[3], 10);
    const d = new Date(year, month, day);
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month ||
      d.getDate() !== day
    ) {
      return null;
    }
    return d;
  }
  const d = parseCalendarDateLocal(t);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function splitLocationLine(line: string): { courseName: string; courseLocation: string } {
  const trimmed = line.trim();
  const idx = trimmed.indexOf(",");
  if (idx === -1) {
    return { courseName: trimmed, courseLocation: "" };
  }
  return {
    courseName: trimmed.slice(0, idx).trim(),
    courseLocation: trimmed.slice(idx + 1).trim(),
  };
}

function EditTeeTimeDetailsModalInner({
  visible,
  teeTimeId,
  initial,
  onClose,
  onSaved,
}: Props): React.ReactElement | null {
  /** Single line like Create flow: "Course" or "Course, City" for autocomplete + save split */
  const [locationLine, setLocationLine] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateInputDraft, setDateInputDraft] = useState("");
  const [timeDraft, setTimeDraft] = useState("10:00 AM");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Remount GolfCourseAutocomplete so its internal query matches `locationLine` when the sheet opens. */
  const [courseFieldKey, setCourseFieldKey] = useState(0);
  const lastGoodTimeRef = useRef("10:00 AM");
  /** Parent passes a new `initial` object every render (e.g. detail screen ticks every 1s). Only hydrate when the sheet opens, not on every parent re-render. */
  const hasSnapshottedThisOpenRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      hasSnapshottedThisOpenRef.current = false;
      return;
    }
    if (!initial || hasSnapshottedThisOpenRef.current) return;
    const loc = initial.courseLocation?.trim()
      ? `${initial.courseName}, ${initial.courseLocation}`
      : initial.courseName || "";
    setLocationLine(loc);
    setCourseFieldKey((k) => k + 1);
    const d = parseCalendarDateLocal(initial.teeDate);
    const cal = Number.isNaN(d.getTime()) ? new Date() : d;
    setSelectedDate(cal);
    setDateInputDraft(formatDateMMDDYYYY(cal));
    const t = formatTime(initial.teeTime) || "10:00 AM";
    setTimeDraft(t);
    lastGoodTimeRef.current = t;
    setCalendarMonth(cal.getMonth());
    setCalendarYear(cal.getFullYear());
    hasSnapshottedThisOpenRef.current = true;
  }, [visible, initial]);

  const commitTypedDate = useCallback(() => {
    const raw = dateInputDraft.trim();
    if (!raw) {
      if (selectedDate) setDateInputDraft(formatDateMMDDYYYY(selectedDate));
      return;
    }
    const parsed = parseUsDateInput(raw);
    if (parsed) {
      setSelectedDate(parsed);
      setDateInputDraft(formatDateMMDDYYYY(parsed));
      setCalendarMonth(parsed.getMonth());
      setCalendarYear(parsed.getFullYear());
      return;
    }
    Alert.alert(
      "Invalid date",
      "Use MM/DD/YYYY (e.g. 04/29/2026) or YYYY-MM-DD.",
    );
    if (selectedDate) setDateInputDraft(formatDateMMDDYYYY(selectedDate));
  }, [dateInputDraft, selectedDate]);

  const commitTypedTime = useCallback(() => {
    const raw = timeDraft.trim();
    if (!raw) {
      setTimeDraft(lastGoodTimeRef.current);
      return;
    }
    const parsed = parseFlexibleTeeTime(raw);
    if (parsed) {
      setTimeDraft(parsed);
      lastGoodTimeRef.current = parsed;
      return;
    }
    Alert.alert(
      "Invalid time",
      "Enter a valid time such as 8:30 AM, 2:45 PM, or 14:30.",
    );
    setTimeDraft(lastGoodTimeRef.current);
  }, [timeDraft]);

  const handleCourseSelect = useCallback((course: GolfCourse) => {
    const fullLocation =
      course.location && course.location !== "Custom entry"
        ? `${course.name}, ${course.location}`
        : course.name;
    setLocationLine(fullLocation);
    // Autocomplete sets its internal field to `course.name` only; remount so value shows full line.
    setCourseFieldKey((k) => k + 1);
  }, []);

  const onSelectDate = useCallback(
    (day: number) => {
      const next = new Date(calendarYear, calendarMonth, day);
      setSelectedDate(next);
      setDateInputDraft(formatDateMMDDYYYY(next));
      setShowDatePicker(false);
    },
    [calendarYear, calendarMonth],
  );

  const handleSave = useCallback(async () => {
    if (!initial) return;
    const { courseName: name, courseLocation: locRest } =
      splitLocationLine(locationLine);
    if (!name) {
      Alert.alert("Missing course", "Enter or choose a course or club name.");
      return;
    }
    const parsedDate = parseUsDateInput(dateInputDraft.trim()) ?? selectedDate;
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      Alert.alert("Missing date", "Enter a valid tee date (MM/DD/YYYY).");
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

    const teeDate = formatDateForApi(parsedDate);
    const teeTime = formatTimeForApi(parsed);
    const body: {
      courseName: string;
      courseLocation: string | null;
      teeDate: string;
      teeTime: string;
    } = {
      courseName: name,
      courseLocation: locRest || null,
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
    locationLine,
    dateInputDraft,
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
              CLUB / COURSE
            </Text>
            <View className="mb-4">
              <GolfCourseAutocomplete
                key={courseFieldKey}
                value={locationLine}
                onChangeText={setLocationLine}
                onSelect={handleCourseSelect}
                placeholder="Search golf courses..."
              />
            </View>

            <Text className="font-jakarta-semibold text-xs text-gray-500 mb-1.5">
              TEE DATE
            </Text>
            <View className="flex-row items-stretch border border-gray-200 rounded-xl overflow-hidden mb-1 bg-gray-50">
              <TextInput
                className="flex-1 font-jakarta text-base text-gray-900 px-4 py-3.5"
                value={dateInputDraft}
                onChangeText={setDateInputDraft}
                onBlur={commitTypedDate}
                onSubmitEditing={commitTypedDate}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
                returnKeyType="done"
              />
              <TouchableOpacity
                accessibilityLabel="Open calendar"
                className="justify-center px-4 border-l border-gray-200 bg-white"
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Calendar size={22} color={COLORS.primary} strokeWidth={1.75} />
              </TouchableOpacity>
            </View>
            <Text className="font-jakarta text-xs text-gray-400 mb-4 px-0.5">
              Type a date, or tap the calendar to pick.
            </Text>

            <Text className="font-jakarta-semibold text-xs text-gray-500 mb-1.5">
              TEE TIME
            </Text>
            <View className="flex-row items-stretch border border-gray-200 rounded-xl overflow-hidden mb-1 bg-gray-50">
              <TextInput
                className="flex-1 font-jakarta text-base text-gray-900 px-4 py-3.5"
                placeholder="e.g. 8:30 AM or 14:30"
                placeholderTextColor="#9CA3AF"
                value={timeDraft}
                onChangeText={setTimeDraft}
                onBlur={commitTypedTime}
                onSubmitEditing={commitTypedTime}
                returnKeyType="done"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <TouchableOpacity
                accessibilityLabel="Open time wheel"
                className="justify-center px-4 border-l border-gray-200 bg-white"
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Clock size={22} color={COLORS.primary} strokeWidth={1.75} />
              </TouchableOpacity>
            </View>
            <Text className="font-jakarta text-xs text-gray-400 mb-6 px-0.5">
              Type a time, or tap the clock for the scrolling picker.
            </Text>

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
            lastGoodTimeRef.current = t;
            setShowTimePicker(false);
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const EditTeeTimeDetailsModal = memo(EditTeeTimeDetailsModalInner);
