import "./global.css";
import React, { useState, useEffect, Suspense, lazy } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sessionManager } from "./utils/sessionManager";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import SplashScreen from "./screens/SplashScreen";
import WelcomeScreen from "./screens/WelcomeScreen";
// Lazy-load Login and Onboarding (defers Firebase/OAuth init until user taps "Sign in" or "Create account")
const LoginScreen = lazy(() => import("./screens/login"));
const OnboardingModule = lazy(() => import("./screens/onboarding").then((m) => ({ default: m.OnboardingScreen })));
const OAuthOnboardingModule = lazy(() => import("./screens/onboarding/OAuthOnboardingScreen").then((m) => ({ default: m.OAuthOnboardingScreen })));
const SsoSignupInfoModule = lazy(() => import("./screens/onboarding/SsoSignupInfoScreen").then((m) => ({ default: m.SsoSignupInfoScreen })));
import HomePage from "./screens/Home";
import RosterScreen from "./screens/roster";
import MessagesScreen from "./screens/Messages";
import ChatDetailScreen from "./screens/ChatDetailScreen";
import FullCalendarScreen from "./screens/calendar";
import ProfileScreen from "./screens/profile";
import CreateTeeTimeScreen from "./screens/CreateTeeTime";
import InvitesScreen from "./screens/InvitesScreen";
import AvailabilityScreen from "./screens/AvailabilityScreen";
import FriendProfileScreen from "./screens/friend-profile";
import GroupProfileScreen from "./screens/roster/group-profile";
import EditProfileScreen from "./screens/profile/EditProfileScreen";
import QRCodeScreen from "./screens/profile/QRCodeScreen";
import ScanQRScreen from "./screens/profile/ScanQRScreen";
import NotificationsScreen from "./screens/notifications";
import TeeTimeDetailScreen from "./screens/TeeTimeDetailScreen";
import TeeTimeHistoryScreen from "./screens/TeeTimeHistoryScreen";
import CheckInScreen from "./screens/CheckInScreen";
import RosterProfileScreen from "./screens/roster/RosterProfileScreen";
import SelectOnDeckScreen from "./screens/SelectOnDeckScreen";

type ScreenName =
  | "Splash"
  | "Welcome"
  | "Login"
  | "Onboarding"
  | "OAuthOnboarding"
  | "SsoSignupInfo"
  | "HomePage"
  | "Home"
  | "Roster"
  | "RosterProfile"
  | "Messages"
  | "ChatDetail"
  | "FullCalendar"
  | "Profile"
  | "EditProfile"
  | "QRCode"
  | "ScanQR"
  | "CreateTeeTime"
  | "Invites"
  | "Availability"
  | "Community"
  | "FriendProfile"
  | "GroupProfile"
  | "Notifications"
  | "TeeTimeDetail"
  | "TeeTimeHistory"
  | "CheckIn"
  | "SelectOnDeck";

interface UserData {
  firstName: string;
  lastName: string;
  username?: string;
  phoneNumber: string;
  handicap?: number | null;
  socialRate?: number;
}

interface NavigationParams {
  user?: UserData;
  chatInfo?: any;
  userId?: string;
  [key: string]: any; // Allow additional params
}

interface Navigation {
  navigate: (screen: ScreenName, params?: NavigationParams) => void;
  replace: (screen: ScreenName, params?: NavigationParams) => void;
  goBack: () => void;
  reset: (options: {
    index: number;
    routes: Array<{ name: ScreenName; params?: NavigationParams }>;
  }) => void;
}

export default function App(): React.ReactElement {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>("Splash");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [screenParams, setScreenParams] = useState<NavigationParams>({});
  const [screenHistory, setScreenHistory] = useState<
    { screen: ScreenName; params: NavigationParams }[]
  >([{ screen: "Splash", params: {} }]);
  // Key to force remount screens when navigating
  const [screenKey, setScreenKey] = useState<number>(0);

  // Set up session expired handler
  useEffect(() => {
    sessionManager.setOnSessionExpired(() => {
      // Navigate to login when session expires
      setUserData(null);
      setScreenParams({});
      setScreenHistory([{ screen: "Login", params: {} }]);
      setScreenKey((prev) => prev + 1);
      setCurrentScreen("Login");
    });
  }, []);

  const navigation: Navigation = {
    navigate: (screen: ScreenName, params?: NavigationParams) => {
      if (params?.user) {
        setUserData(params.user);
      } else if (screen === "Login" || screen === "Welcome") {
        // Clear user data when navigating to auth screens
        setUserData(null);
      }
      const navParams = params || {};
      setScreenParams(navParams);
      setScreenKey((prev) => prev + 1); // Force remount
      setScreenHistory((prev) => [...prev, { screen, params: navParams }]);
      setCurrentScreen(screen);
    },
    replace: (screen: ScreenName, params?: NavigationParams) => {
      if (params?.user) {
        setUserData(params.user);
      } else if (screen === "Login" || screen === "Welcome") {
        // Clear user data when navigating to auth screens
        setUserData(null);
      }
      const navParams = params || {};
      setScreenParams(navParams);
      // Update the current history entry instead of just changing screen to prevent ghost history
      setScreenHistory((prev) => {
        const newHistory = [...prev];
        if (newHistory.length > 0) {
          newHistory[newHistory.length - 1] = { screen, params: navParams };
        } else {
          newHistory.push({ screen, params: navParams });
        }
        return newHistory;
      });
      setScreenKey((prev) => prev + 1); // Force remount
      setCurrentScreen(screen);
    },
    goBack: () => {
      if (screenHistory.length > 1) {
        const newHistory = [...screenHistory];
        newHistory.pop(); // Remove current screen
        const previousEntry = newHistory[newHistory.length - 1];
        setScreenHistory(newHistory);
        setScreenParams(previousEntry.params); // Restore previous screen's params
        setScreenKey((prev) => prev + 1);
        setCurrentScreen(previousEntry.screen);
      }
    },
    reset: (options: {
      index: number;
      routes: Array<{ name: ScreenName; params?: NavigationParams }>;
    }) => {
      // Reset navigation stack to specified routes
      const targetRoute = options.routes[options.index];
      const navParams = targetRoute.params || {};
      setUserData(null);
      setScreenParams(navParams);
      setScreenHistory([{ screen: targetRoute.name, params: navParams }]);
      setScreenKey((prev) => prev + 1);
      setCurrentScreen(targetRoute.name);
    },
  };

  const renderScreen = (): React.ReactElement => {
    // Using key prop forces React to remount the component with fresh state
    switch (currentScreen) {
      case "Splash":
        return (
          <SplashScreen
            key={`splash-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "Welcome":
        return (
          <WelcomeScreen
            key={`welcome-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "Login":
        return (
          <Suspense
            fallback={
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            }
          >
            <LoginScreen
              key={`login-${screenKey}`}
              navigation={navigation as any}
            />
          </Suspense>
        );
      case "Onboarding":
        return (
          <Suspense
            fallback={
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            }
          >
            <OnboardingModule
              key={`onboarding-${screenKey}`}
              navigation={navigation as any}
            />
          </Suspense>
        );
      case "OAuthOnboarding":
        return (
          <Suspense
            fallback={
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            }
          >
            <OAuthOnboardingModule
              key={`oauth-onboarding-${screenKey}`}
              navigation={navigation as any}
              route={{ params: screenParams } as any}
            />
          </Suspense>
        );
      case "SsoSignupInfo":
        return (
          <Suspense
            fallback={
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            }
          >
            <SsoSignupInfoModule
              key={`sso-signup-${screenKey}`}
              navigation={navigation as any}
              route={{ params: screenParams } as any}
            />
          </Suspense>
        );
      case "HomePage":
      case "Home":
        return (
          <HomePage
            key={`home-${screenKey}`}
            route={{ params: { user: userData } } as any}
            navigation={navigation as any}
          />
        );
      case "Roster":
        return (
          <RosterScreen
            key={`roster-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      case "Messages":
        return (
          <MessagesScreen
            key={`messages-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "ChatDetail":
        return (
          <ChatDetailScreen
            key={`chat-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      case "FullCalendar":
        return (
          <FullCalendarScreen
            key={`calendar-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "Profile":
        return (
          <ProfileScreen
            key={`profile-${screenKey}`}
            navigation={navigation as any}
            route={{ params: { user: userData } } as any}
          />
        );
      case "EditProfile":
        return (
          <EditProfileScreen
            key={`edit-profile-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      case "QRCode":
        return (
          <QRCodeScreen
            key={`qr-code-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "ScanQR":
        return (
          <ScanQRScreen
            key={`scan-qr-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "CreateTeeTime":
        return (
          <CreateTeeTimeScreen
            key={`create-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "Invites":
        return (
          <InvitesScreen
            key={`invites-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "Availability":
      case "Community":
        return (
          <AvailabilityScreen
            key={`availability-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "FriendProfile":
        return (
          <FriendProfileScreen
            key={`friend-profile-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      case "GroupProfile":
        return (
          <GroupProfileScreen
            key={`group-profile-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      case "Notifications":
        return (
          <NotificationsScreen
            key={`notifications-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "TeeTimeDetail":
        return (
          <TeeTimeDetailScreen
            key={`tee-time-detail-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      case "TeeTimeHistory":
        return (
          <TeeTimeHistoryScreen
            key={`tee-time-history-${screenKey}`}
            navigation={navigation as any}
          />
        );
      case "CheckIn":
        return (
          <CheckInScreen
            key={`check-in-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      case "RosterProfile":
        return (
          <RosterProfileScreen
            key={`roster-profile-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      case "SelectOnDeck":
        return (
          <SelectOnDeckScreen
            key={`select-on-deck-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      default:
        return (
          <SplashScreen
            key={`default-${screenKey}`}
            navigation={navigation as any}
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      <SafeAreaProvider>{renderScreen()}</SafeAreaProvider>
    </ErrorBoundary>
  );
}
