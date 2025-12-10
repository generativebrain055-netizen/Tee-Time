import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ViewStyle,
  TextStyle,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

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

type HomePageNavigationProp = StackNavigationProp<
  RootStackParamList,
  "HomePage"
>;
type HomePageRouteProp = RouteProp<RootStackParamList, "HomePage">;

interface HomePageProps {
  route: HomePageRouteProp;
  navigation: HomePageNavigationProp;
}

interface Styles {
  container: ViewStyle;
  scrollContent: ViewStyle;
  header: ViewStyle;
  signOutButton: ViewStyle;
  signOutText: TextStyle;
  welcomeText: TextStyle;
  userName: TextStyle;
  userCard: ViewStyle;
  avatarContainer: ViewStyle;
  avatarText: TextStyle;
  userInfo: ViewStyle;
  infoRow: ViewStyle;
  infoLabel: TextStyle;
  infoValue: TextStyle;
  divider: ViewStyle;
  socialRateBadge: ViewStyle;
  socialRateText: TextStyle;
  actionsContainer: ViewStyle;
  sectionTitle: TextStyle;
  actionButton: ViewStyle;
  actionIcon: TextStyle;
  actionTextContainer: ViewStyle;
  actionTitle: TextStyle;
  actionSubtitle: TextStyle;
  actionArrow: TextStyle;
  statsCard: ViewStyle;
  statsGrid: ViewStyle;
  statItem: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
}

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

  const handleSignOut = (): void => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("accessToken");
            await AsyncStorage.removeItem("refreshToken");
            await AsyncStorage.removeItem("user");
            if (navigation) {
              if (navigation.replace) {
                navigation.replace("Login");
              } else if (navigation.navigate) {
                navigation.navigate("Login");
              }
            }
          } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Error", "Unable to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome Back!</Text>
            <Text style={styles.userName}>
              {user.firstName} {user.lastName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user.firstName?.charAt(0)}
              {user.lastName?.charAt(0)}
            </Text>
          </View>

          <View style={styles.userInfo}>
            {user.username && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Username</Text>
                  <Text style={styles.infoValue}>@{user.username}</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user.phoneNumber}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Social Rate</Text>
              <View style={styles.socialRateBadge}>
                <Text style={styles.socialRateText}>
                  {user.socialRate || 100}
                </Text>
              </View>
            </View>

            {user.handicap && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Handicap</Text>
                  <Text style={styles.infoValue}>{user.handicap}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📅</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>My Tee Times</Text>
              <Text style={styles.actionSubtitle}>View upcoming games</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>👥</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>My Roster</Text>
              <Text style={styles.actionSubtitle}>
                Manage your golf buddies
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>➕</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Send Invite</Text>
              <Text style={styles.actionSubtitle}>
                Invite players to a game
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔔</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Notifications</Text>
              <Text style={styles.actionSubtitle}>Check your invites</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Games Played</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Invites Sent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Roster Size</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  signOutButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signOutText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  welcomeText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#50C878",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  userInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    color: "#1a1a1a",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E8E8E8",
  },
  socialRateBadge: {
    backgroundColor: "#50C878",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  socialRateText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  actionArrow: {
    fontSize: 28,
    color: "#CCC",
    fontWeight: "300",
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#50C878",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
});
