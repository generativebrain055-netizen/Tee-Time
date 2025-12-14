import React, { useState, useMemo, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    Bell,
    Plus,
    Home,
    Calendar as CalendarIcon,
    MessageSquare,
    Users,
    User,
} from "lucide-react-native";
import { teeTimeApi, TeeTime } from "../../services/api";
import { COLORS } from "./constants";
import CalendarSection from "./CalendarSection";
import UpcomingSection from "./UpcomingSection";

interface CalendarDay {
    day: number | "";
    id: string;
    hasEvent?: boolean;
    isSelected?: boolean;
    isToday?: boolean;
}

interface UserData {
    firstName: string;
    lastName: string;
    username?: string;
    phoneNumber: string;
    handicap?: number | null;
    socialRate?: number;
}

// Helper functions
const getDaysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number): number => new Date(year, month, 1).getDay();

const generateCalendarDays = (
    year: number,
    month: number,
    selectedDate: Date | null,
    eventsMap: Set<string>
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
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
        const isSelected = selectedDate && selectedDate.getFullYear() === year &&
            selectedDate.getMonth() === month && selectedDate.getDate() === day;

        days.push({
            day,
            id: `day-${day}`,
            hasEvent: eventsMap.has(dateKey),
            isSelected: isSelected || false,
            isToday,
        });
    }

    return days;
};

export default function HomePage({ route, navigation }: any): React.ReactElement {
    const user: UserData = route?.params?.user || {
        firstName: "Guest",
        lastName: "User",
        username: "guest",
        phoneNumber: "+1234567890",
        handicap: null,
        socialRate: 100,
    };

    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date | null>(today);
    const [activeTab, setActiveTab] = useState<string>("Home");
    const [upcomingTeeTimes, setUpcomingTeeTimes] = useState<TeeTime[]>([]);

    useEffect(() => {
        loadUpcomingTeeTimes();
    }, []);

    const loadUpcomingTeeTimes = async () => {
        try {
            const response = await teeTimeApi.getUpcoming(5);
            if (response.success) setUpcomingTeeTimes(response.teeTimes);
        } catch (error) {
            console.log("Failed to load tee times:", error);
        }
    };

    const eventsMap = useMemo(() => {
        const events = new Set<string>();
        upcomingTeeTimes.forEach((tt) => {
            const date = new Date(tt.teeDate);
            events.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
        });
        return events;
    }, [upcomingTeeTimes]);

    const calendarDays = useMemo(
        () => generateCalendarDays(currentYear, currentMonth, selectedDate, eventsMap),
        [currentYear, currentMonth, selectedDate, eventsMap]
    );

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

    const handleNotifications = () => {
        Alert.alert("Notifications", "No new notifications", [{ text: "OK" }]);
    };

    // Header
    const Header = () => (
        <View style={styles.header}>
            <View>
                <Text style={styles.logoText}>TEE TIME</Text>
                <Text style={styles.logoSubText}>Social</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={handleNotifications}>
                <Bell color={COLORS.text} size={24} />
            </TouchableOpacity>
        </View>
    );

    // Bottom Navigation
    const BottomTab = () => {
        const tabs = [
            { name: "Home", icon: Home, screen: "HomePage" },
            { name: "Availability", icon: CalendarIcon, screen: "Availability" },
            { name: "Messages", icon: MessageSquare, screen: "Messages" },
            { name: "Roster", icon: Users, screen: "Roster" },
            { name: "Profile", icon: User, screen: "Profile" },
        ];

        return (
            <View style={styles.bottomTabContainer}>
                {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.name;
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.tabItem}
                            onPress={() => {
                                setActiveTab(tab.name);
                                if (navigation && tab.screen) {
                                    (navigation as any).navigate(tab.screen);
                                }
                            }}
                        >
                            <IconComponent
                                color={isActive ? COLORS.primary : COLORS.textSecondary}
                                size={24}
                            />
                            <Text style={[styles.tabLabel, { color: isActive ? COLORS.primary : COLORS.textSecondary }]}>
                                {tab.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Header />
                <CalendarSection
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    calendarDays={calendarDays}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    onDayPress={handleDayPress}
                    onViewFullCalendar={() => navigation?.navigate("FullCalendar")}
                />
                <UpcomingSection teeTimes={upcomingTeeTimes} />
                <View style={{ height: 100 }} />
            </ScrollView>

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation?.navigate("CreateTeeTime")}
            >
                <Plus color={COLORS.white} size={28} />
            </TouchableOpacity>

            <BottomTab />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scrollContent: { paddingBottom: 20 },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        backgroundColor: COLORS.bg,
    },
    logoText: { fontSize: 22, fontWeight: "900", color: "#000", letterSpacing: 0.5 },
    logoSubText: { fontSize: 20, fontWeight: "500", color: COLORS.primary, fontStyle: "italic", marginTop: -8 },
    iconButton: { padding: 8 },
    fab: {
        position: "absolute",
        bottom: 100,
        right: 20,
        backgroundColor: COLORS.primary,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 10,
    },
    bottomTabContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 12,
        paddingBottom: 25,
        borderTopWidth: 1,
        borderTopColor: "#F0F0F0",
        elevation: 10,
    },
    tabItem: { alignItems: "center" },
    tabLabel: { fontSize: 10, marginTop: 4, color: COLORS.textSecondary, fontWeight: "500" },
});
