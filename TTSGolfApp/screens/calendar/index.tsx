/**
 * Full Calendar Screen - Schedule (Figma 565-* full schedule / month view)
 */
import React, { useCallback, memo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCalendar, StatusFilter, RoleFilter } from "./hooks/useCalendar";
import { CalendarGrid, TeeTimesList } from "./components";
import { CALENDAR_COLORS } from "./constants";
import { ScreenShell, AppHeader } from "../../ui";
import { spacing, fontSize, fontFamily, radii } from "../../ui/theme/tokens";

const PRIMARY_GREEN = CALENDAR_COLORS.primary;

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
      <View style={{ position: "relative" }}>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            backgroundColor: "#FFFFFF",
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm + 2,
          }}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontFamily: fontFamily.semiBold,
              fontSize: fontSize.sm,
              color: "#374151",
            }}
          >
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
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: spacing.xs,
              backgroundColor: "#EEEEEE",
              borderRadius: radii.md,
              paddingVertical: spacing.xs,
              minWidth: 180,
              zIndex: 50,
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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm + 2,
                  }}
                  onPress={() => {
                    onSelect(opt.key);
                    onToggle();
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: isSelected ? PRIMARY_GREEN : "#D1D5DB",
                      backgroundColor: isSelected ? PRIMARY_GREEN : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected ? (
                      <Text style={{ color: "#FFF", fontSize: 10, fontFamily: fontFamily.bold }}>✓</Text>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontFamily: fontFamily.medium,
                      fontSize: fontSize.sm,
                      color: isSelected ? "#1F2937" : "#6B7280",
                    }}
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
  const insets = useSafeAreaInsets();
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

      <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
        {/* Month calendar (Figma 565-*) */}
        <View
          style={{
            flex: 0.48,
            minHeight: 200,
            marginHorizontal: spacing.lg,
            marginTop: spacing.lg,
            backgroundColor: "#FFFFFF",
            borderRadius: radii.lg,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
            overflow: "hidden",
          }}
        >
          <CalendarGrid
            currentMonth={currentMonth}
            currentYear={currentYear}
            calendarDays={calendarDays}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onDayPress={handleDayPress}
          />
        </View>

        {/* Tee times for selected day */}
        <View
          style={{
            flex: 0.52,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            // Keep details fully visible above device bottom safe area.
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          }}
        >
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: radii.lg,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
              flex: 1,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                paddingHorizontal: spacing.md,
                paddingTop: spacing.md,
                paddingBottom: spacing.md,
                backgroundColor: "#F9FAFB",
              }}
            >
              <View style={{ flexDirection: "row", gap: spacing.md }}>
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

            <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
              <TeeTimesList
                selectedDate={selectedDate}
                teeTimes={selectedDateTeeTimes}
                loading={loading}
                refreshing={refreshing}
                onRefresh={onRefresh}
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