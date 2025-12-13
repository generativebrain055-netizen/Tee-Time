import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Calendar,
    MapPin,
    Clock,
    Users,
} from "lucide-react-native";

// --- TYPES ---
interface CalendarDay {
    day: number | "";
    id: string;
    hasEvent?: boolean;
    isSelected?: boolean;
    isToday?: boolean;
    events?: TeeTime[];
}

interface TeeTime {
    id: number;
    date: string;
    time: string;
    course: string;
    location: string;
    players: number;
    status: "confirmed" | "pending";
}

// --- CONSTANTS ---
const COLORS = {
    primary: "#5DB075",
    bg: "#F6F6F6",
    white: "#FFFFFF",
    text: "#1C1C1E",
    textSecondary: "#8A8A8E",
    border: "#E5E5EA",
    confirmedBg: "#E8F5E9",
    confirmedText: "#2E7D32",
    pendingBg: "#FFF3E0",
    pendingText: "#E65100",
    grayCircle: "#E5E5EA",
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const CALENDAR_WIDTH = SCREEN_WIDTH - 40;
const DAY_CELL_WIDTH = Math.floor(CALENDAR_WIDTH / 7);
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

// --- MOCK TEE TIMES ---
const MOCK_TEE_TIMES: TeeTime[] = [
    {
        id: 1,
        date: "2024-12-3",
        time: "8:30 AM",
        course: "Pine Valley Golf Club",
        location: "Pine Valley, NJ",
        players: 4,
        status: "confirmed",
    },
    {
        id: 2,
        date: "2024-12-13",
        time: "10:00 AM",
        course: "Torrey Pines",
        location: "La Jolla, CA",
        players: 3,
        status: "confirmed",
    },
    {
        id: 3,
        date: "2024-12-13",
        time: "2:30 PM",
        course: "Pebble Beach",
        location: "Pebble Beach, CA",
        players: 4,
        status: "pending",
    },
    {
        id: 4,
        date: "2024-12-25",
        time: "9:00 AM",
        course: "Augusta National",
        location: "Augusta, GA",
        players: 4,
        status: "confirmed",
    },
];

// --- HELPER FUNCTIONS ---
const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
};

const generateCalendarDays = (
    year: number,
    month: number,
    selectedDate: Date | null,
    teeTimesMap: Map<string, TeeTime[]>
): CalendarDay[] => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    const days: CalendarDay[] = [];

    for (let i = 0; i < firstDay; i++) {
        days.push({ day: "", id: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${month}-${day}`;
        const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
        const isSelected =
            selectedDate &&
            selectedDate.getFullYear() === year &&
            selectedDate.getMonth() === month &&
            selectedDate.getDate() === day;

        const events = teeTimesMap.get(dateKey);

        days.push({
            day,
            id: `day-${day}`,
            hasEvent: !!events && events.length > 0,
            isSelected: isSelected || false,
            isToday,
            events,
        });
    }

    return days;
};

export default function FullCalendarScreen({ navigation }: any) {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date | null>(today);

    // Create tee times map
    const teeTimesMap = useMemo(() => {
        const map = new Map<string, TeeTime[]>();
        MOCK_TEE_TIMES.forEach((teeTime) => {
            const [year, month, day] = teeTime.date.split("-").map(Number);
            const key = `${year}-${month - 1}-${day}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(teeTime);
        });
        return map;
    }, []);

    const calendarDays = useMemo(
        () => generateCalendarDays(currentYear, currentMonth, selectedDate, teeTimesMap),
        [currentYear, currentMonth, selectedDate, teeTimesMap]
    );

    const selectedDateTeeTimes = useMemo(() => {
        if (!selectedDate) return [];
        const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
        return teeTimesMap.get(key) || [];
    }, [selectedDate, teeTimesMap]);

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDayPress = (day: number | "") => {
        if (day === "") return;
        setSelectedDate(new Date(currentYear, currentMonth, day));
    };

    // --- HEADER ---
    const Header = () => (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation && (navigation as any).goBack()}
            >
                <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Calendar</Text>
            <View style={{ width: 40 }} />
        </View>
    );

    // --- CALENDAR ---
    const CalendarView = () => (
        <View style={styles.calendarCard}>
            {/* Month Navigation */}
            <View style={styles.monthHeader}>
                <TouchableOpacity onPress={handlePrevMonth}>
                    <ChevronLeft color={COLORS.textSecondary} size={24} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                    {MONTHS[currentMonth]} {currentYear}
                </Text>
                <TouchableOpacity onPress={handleNextMonth}>
                    <ChevronRight color={COLORS.textSecondary} size={24} />
                </TouchableOpacity>
            </View>

            {/* Days of Week */}
            <View style={styles.weekRow}>
                {DAYS_OF_WEEK.map((day) => (
                    <Text key={day} style={styles.weekDayText}>
                        {day}
                    </Text>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
                {calendarDays.map((item) => {
                    if (item.day === "") {
                        return <View key={item.id} style={styles.dayCell} />;
                    }

                    let cellStyle: any[] = [styles.dayCellInner];
                    let textStyle: any[] = [styles.dayText];

                    if (item.isSelected) {
                        cellStyle.push(styles.selectedDayBg);
                        textStyle.push(styles.selectedDayText);
                    } else if (item.isToday) {
                        cellStyle.push(styles.todayBg);
                        textStyle.push(styles.todayText);
                    } else if (item.hasEvent) {
                        cellStyle.push(styles.eventDayBg);
                    }

                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.dayCell}
                            onPress={() => handleDayPress(item.day)}
                        >
                            <View style={cellStyle}>
                                <Text style={textStyle}>{item.day}</Text>
                                {item.hasEvent && !item.isSelected && (
                                    <View style={styles.eventDot} />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    // --- TEE TIME CARD ---
    const TeeTimeCard = ({ teeTime }: { teeTime: TeeTime }) => (
        <View style={styles.teeTimeCard}>
            <View style={styles.teeTimeHeader}>
                <View style={styles.teeTimeTime}>
                    <Clock size={16} color={COLORS.textSecondary} />
                    <Text style={styles.teeTimeTimeText}>{teeTime.time}</Text>
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        teeTime.status === "confirmed"
                            ? styles.confirmedBadge
                            : styles.pendingBadge,
                    ]}
                >
                    <Text
                        style={[
                            styles.statusText,
                            teeTime.status === "confirmed"
                                ? styles.confirmedText
                                : styles.pendingText,
                        ]}
                    >
                        {teeTime.status === "confirmed" ? "✓ Confirmed" : "⏱ Pending"}
                    </Text>
                </View>
            </View>
            <View style={styles.teeTimeLocation}>
                <MapPin size={16} color={COLORS.textSecondary} />
                <View style={styles.teeTimeLocationText}>
                    <Text style={styles.teeTimeCourse}>{teeTime.course}</Text>
                    <Text style={styles.teeTimeAddress}>{teeTime.location}</Text>
                </View>
            </View>
            <View style={styles.teeTimePlayers}>
                <Users size={16} color={COLORS.textSecondary} />
                <Text style={styles.teeTimePlayersText}>
                    {teeTime.players} players
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <Header />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                <CalendarView />

                {/* Selected Date Tee Times */}
                {selectedDate && (
                    <View style={styles.teeTimesSection}>
                        <Text style={styles.sectionTitle}>
                            {selectedDate.toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </Text>
                        {selectedDateTeeTimes.length > 0 ? (
                            selectedDateTeeTimes.map((teeTime) => (
                                <TeeTimeCard key={teeTime.id} teeTime={teeTime} />
                            ))
                        ) : (
                            <View style={styles.noTeeTimes}>
                                <Calendar size={48} color={COLORS.textSecondary} />
                                <Text style={styles.noTeeTimesText}>
                                    No tee times scheduled
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}


// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
        backgroundColor: COLORS.white,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.text,
    },
    scrollView: {
        flex: 1,
    },
    calendarCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    monthHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.text,
    },
    weekRow: {
        flexDirection: "row",
        justifyContent: "flex-start",
        marginBottom: 10,
    },
    weekDayText: {
        width: DAY_CELL_WIDTH,
        textAlign: "center",
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: "500",
    },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
    },
    dayCell: {
        width: DAY_CELL_WIDTH,
        height: 50,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    dayCellInner: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    dayText: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: "500",
    },
    selectedDayBg: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
    },
    selectedDayText: {
        color: COLORS.white,
        fontWeight: "bold",
    },
    todayBg: {
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: 12,
    },
    todayText: {
        color: COLORS.primary,
        fontWeight: "bold",
    },
    eventDayBg: {
        backgroundColor: COLORS.grayCircle,
        borderRadius: 18,
    },
    eventDot: {
        position: "absolute",
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
    },
    teeTimesSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.text,
        marginBottom: 16,
    },
    teeTimeCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    teeTimeHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    teeTimeTime: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    teeTimeTimeText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    confirmedBadge: {
        backgroundColor: COLORS.confirmedBg,
    },
    pendingBadge: {
        backgroundColor: COLORS.pendingBg,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    confirmedText: {
        color: COLORS.confirmedText,
    },
    pendingText: {
        color: COLORS.pendingText,
    },
    teeTimeLocation: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 12,
    },
    teeTimeLocationText: {
        flex: 1,
    },
    teeTimeCourse: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
    },
    teeTimeAddress: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    teeTimePlayers: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    teeTimePlayersText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    noTeeTimes: {
        alignItems: "center",
        paddingVertical: 40,
    },
    noTeeTimesText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: 12,
    },
});
