/**
 * Full Calendar Screen - Schedule
 */
import React, { useCallback, memo, useState } from "react";
import { View, ScrollView, RefreshControl, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, ChevronUp } from "lucide-react-native";

import { useCalendar, StatusFilter, RoleFilter } from "./hooks/useCalendar";
import { CalendarGrid, TeeTimesList } from "./components";
import { CALENDAR_COLORS } from "./constants";
import { ScreenShell, AppHeader, ContentArea } from "../../ui";

const PRIMARY_GREEN = "#5EBC68";

interface Props {
  navigation: any;
}

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

const ROLE_OPTIONS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hosting", label: "I'm hosting" },
  { key: "invited", label: "I'm invited" },
];

const FilterDropdown = memo(
  ({
    label,
    options,
    selectedKey,
    onSelect,
    isOpen,
    onToggle,
  }: {
    label: string;
    options: { key: string; label: string }[];
    selectedKey: string;
    onSelect: (key: string) => void;
    isOpen: boolean;
    onToggle: () => void;
  }) => {
    const selectedLabel = options.find((o) => o.key === selectedKey)?.label ?? "All";
    return (
      <View className="relative">
        <TouchableOpacity
          className="flex-row items-center gap-1.5 bg-gray-100 rounded-lg px-4 py-2.5"
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <Text className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Inter_600SemiBold' }}>
            {label}: {selectedLabel}
          </Text>
          {isOpen ? (
            <ChevronUp size={16} color="#6B7280" />
          ) : (
            <ChevronDown size={16} color="#6B7280" />
          )}
        </TouchableOpacity>
        {isOpen && (
          <View
            className="absolute top-full left-0 mt-1 bg-[#EEEEEE] rounded-lg py-1 min-w-[180px] z-50"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {options.map((opt) => {
              const isSelected = opt.key === selectedKey;
              return (
                <TouchableOpacity
                  key={opt.key}
                  className="flex-row items-center gap-2 px-4 py-2.5"
                  onPress={() => {
                    onSelect(opt.key);
                    onToggle();
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-4 h-4 rounded-full border-2 items-center justify-center"
                    style={{
                      borderColor: isSelected ? PRIMARY_GREEN : "#D1D5DB",
                      backgroundColor: isSelected ? PRIMARY_GREEN : "transparent",
                    }}
                  >
                    {isSelected ? (
                      <Text className="text-white text-[10px] font-bold">✓</Text>
                    ) : null}
                  </View>
                  <Text
                    className="text-sm font-medium"
                    style={{ color: isSelected ? "#1F2937" : "#6B7280", fontFamily: 'Inter_500Medium' }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }
);

export default function FullCalendarScreen({ navigation }: Props) {
  const {
    currentMonth,
    currentYear,
    selectedDate,
    loading,
    refreshing,
    calendarDays,
    selectedDateTeeTimes,
    statusFilter,
    setStatusFilter,
    roleFilter,
    setRoleFilter,
    onRefresh,
    handlePrevMonth,
    handleNextMonth,
    handleDayPress,
  } = useCalendar();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const insets = useSafeAreaInsets();

  const handleBack = useCallback(() => {
    navigation?.goBack();
  }, [navigation]);

  const handleTeeTimePress = useCallback(
    (teeTimeId: string) => {
      navigation?.navigate("TeeTimeDetail", { teeTimeId });
    },
    [navigation]
  );

  return (
    <ScreenShell>

      <AppHeader title="Schedule" onBack={handleBack} />

      <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
        {/* Calendar Section - 48% (reduced from 55%) */}
        <View style={{ 
          flex: 0.48, 
          marginHorizontal: 16, 
          marginTop: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <CalendarGrid
            currentMonth={currentMonth}
            currentYear={currentYear}
            calendarDays={calendarDays}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onDayPress={handleDayPress}
          />
        </View>

        {/* Tee Times Section - 52% (increased from 45%) */}
        <View style={{ flex: 0.52, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 }}>
          <View style={{
            backgroundColor: '#F9FAFB',
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
            flex: 1,
            overflow: 'hidden',
          }}>
            {/* Filter bar */}
            <View style={{ 
              paddingHorizontal: 12, 
              paddingTop: 12, 
              paddingBottom: 12,
              backgroundColor: '#F9FAFB',
            }}>
              <View className="flex-row gap-3">
                <FilterDropdown
                  label="Role"
                  options={ROLE_OPTIONS}
                  selectedKey={roleFilter}
                  onSelect={(k) => setRoleFilter(k as RoleFilter)}
                  isOpen={roleDropdownOpen}
                  onToggle={() => {
                    setRoleDropdownOpen((v) => !v);
                    setStatusDropdownOpen(false);
                  }}
                />
                <FilterDropdown
                  label="Status"
                  options={STATUS_OPTIONS}
                  selectedKey={statusFilter}
                  onSelect={(k) => setStatusFilter(k as StatusFilter)}
                  isOpen={statusDropdownOpen}
                  onToggle={() => {
                    setStatusDropdownOpen((v) => !v);
                    setRoleDropdownOpen(false);
                  }}
                />
              </View>
            </View>

            {/* Scrollable Tee Times List */}
            <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
              <TeeTimesList
                selectedDate={selectedDate}
                teeTimes={selectedDateTeeTimes}
                loading={loading}
                onTeeTimePress={handleTeeTimePress}
                onCancelSuccess={onRefresh}
              />
            </View>
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}