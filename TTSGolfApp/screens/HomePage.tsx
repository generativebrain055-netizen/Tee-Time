import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ViewStyle,
  TextStyle,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Home,
  Calendar as CalendarIcon,
  MessageSquare,
  Users,
  User,
} from "lucide-react-native";

// --- Types ---
type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
  Home: { user: UserData };
  HomePage: { user?: UserData };
};

interface UserData {
  firstName: string;
  lastName: string;
  username?: string;
  phoneNumber: string;
  handicap?: number | null;
  socialRate?: number;
}

type HomePageNavigationProp = StackNavigationProp<RootStackParamList, "HomePage">;
type HomePageRouteProp = RouteProp<RootStackParamList, "HomePage">;

interface HomePageProps {
  route: HomePageRouteProp;
  navigation: HomePageNavigationProp;
}

interface CalendarDay {
  day: number | "";
  id: string;
  hasEvent?: boolean;
  isSelected?: boolean;
  isToday?: boolean;
}

// --- Constants ---
const COLORS = {
  primary: "#5DB075",
  primaryDark: "#4a9c63",
  bg: "#F6F6F6",
  white: "#FFFFFF",
  text: "#1C1C1E",
  textSecondary: "#8A8A8E",
  border: "#E5E5EA",
  confirmedBg: "#E8F5E9",
  confirmedText: "#2E7D32",
  grayCircle: "#E5E5EA",
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const CALENDAR_WIDTH = SCREEN_WIDTH - 80; // 20px margin on each side + 20px padding on each side
const DAY_CELL_WIDTH = Math.floor(CALENDAR_WIDTH / 7);
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// --- Helper Functions ---
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
  eventsMap: Set<string>
): CalendarDay[] => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const days: CalendarDay[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: "", id: `empty-${i}` });
  }

  // Add days of the month
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


// --- Main Component ---
export default function HomePage({
  route,
  navigation,
}: HomePageProps): React.ReactElement {
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

  // Mock events - dates with tee times scheduled
  const eventsMap = useMemo(() => {
    const events = new Set<string>();
    // Add some sample events for current month
    events.add(`${currentYear}-${currentMonth}-3`);
    events.add(`${currentYear}-${currentMonth}-13`);
    events.add(`${currentYear}-${currentMonth}-25`);
    return events;
  }, [currentYear, currentMonth]);

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

  const handleSignOut = (): void => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("accessToken");
            await AsyncStorage.removeItem("refreshToken");
            await AsyncStorage.removeItem("user");
            if (navigation?.replace) {
              navigation.replace("Login");
            } else if (navigation?.navigate) {
              navigation.navigate("Login");
            }
          } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Error", "Unable to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  // --- Header Component ---
  const Header = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.logoText}>TEE TIME</Text>
        <Text style={styles.logoSubText}>Social</Text>
      </View>
      <TouchableOpacity style={styles.iconButton} onPress={handleSignOut}>
        <Bell color={COLORS.text} size={24} />
      </TouchableOpacity>
    </View>
  );

  // --- Calendar Component ---
  const CalendarSection = () => (
    <View style={styles.cardContainer}>
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

          let cellStyle: ViewStyle[] = [styles.dayCellInner];
          let textStyle: TextStyle[] = [styles.dayText];

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
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.fullCalendarBtn}>
        <Text style={styles.fullCalendarBtnText}>View Full Calendar</Text>
      </TouchableOpacity>
    </View>
  );


  // --- Upcoming Tee Times Section ---
  const UpcomingSection = () => {
    const selectedDateStr = selectedDate
      ? selectedDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
      })
      : "Select a date";

    return (
      <View style={styles.upcomingContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Tee Times</Text>
          <Text style={styles.sectionSubtitle}>3 rounds</Text>
        </View>

        <View style={styles.teeTimeCard}>
          {/* Header of Card */}
          <View style={styles.cardRow}>
            <Text style={styles.cardDate}>{selectedDateStr}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>✓ Confirmed</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.cardDetailRow}>
            <Clock size={16} color={COLORS.textSecondary} />
            <Text style={styles.cardDetailText}>8:30 AM</Text>
          </View>
          <View style={styles.cardDetailRow}>
            <MapPin size={16} color={COLORS.textSecondary} />
            <View>
              <Text style={styles.cardDetailTextMain}>Pine Valley Golf Club</Text>
              <Text style={styles.cardDetailTextSub}>Pine Valley, NJ</Text>
            </View>
          </View>

          {/* Floating Action Button */}
          <TouchableOpacity style={styles.fab}>
            <Plus color={COLORS.white} size={28} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- Bottom Navigation ---
  const BottomTab = () => {
    const tabs = [
      { name: "Home", icon: Home },
      { name: "Community", icon: CalendarIcon },
      { name: "Messages", icon: MessageSquare },
      { name: "Roster", icon: Users },
      { name: "Profile", icon: User },
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
              onPress={() => setActiveTab(tab.name)}
            >
              <IconComponent
                color={isActive ? COLORS.primary : COLORS.textSecondary}
                size={24}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? COLORS.primary : COLORS.textSecondary },
                ]}
              >
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header />
        <CalendarSection />
        <UpcomingSection />
        <View style={{ height: 100 }} />
      </ScrollView>
      <BottomTab />
    </SafeAreaView>
  );
}


// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: COLORS.bg,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 0.5,
  },
  logoSubText: {
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.primary,
    fontStyle: "italic",
    marginTop: -8,
  },
  iconButton: {
    padding: 8,
  },
  // Calendar Card
  cardContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
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
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  dayCellInner: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
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
  fullCalendarBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  fullCalendarBtnText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
  // Upcoming Section
  upcomingContainer: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  teeTimeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    position: "relative",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  cardDate: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  statusBadge: {
    backgroundColor: COLORS.confirmedBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: COLORS.confirmedText,
    fontWeight: "600",
    fontSize: 12,
  },
  cardDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardDetailText: {
    marginLeft: 10,
    color: COLORS.text,
    fontSize: 15,
  },
  cardDetailTextMain: {
    marginLeft: 10,
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 15,
  },
  cardDetailTextSub: {
    marginLeft: 10,
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  // Bottom Tab
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
  tabItem: {
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});
