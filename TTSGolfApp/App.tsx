import React, { useState } from "react";
import SplashScreen from "./screens/SplashScreen";
import WelcomeScreen from "./screens/WelcomeScreen";
import LoginScreen from "./screens/LoginScreen";
import HomePage from "./screens/Home";
import RosterScreen from "./screens/roster";
import MessagesScreen from "./screens/Messages";
import ChatDetailScreen from "./screens/ChatDetailScreen";
import FullCalendarScreen from "./screens/FullCalendarScreen";
import ProfileScreen from "./screens/profile";
import CreateTeeTimeScreen from "./screens/CreateTeeTime";
import InvitesScreen from "./screens/InvitesScreen";
import AvailabilityScreen from "./screens/AvailabilityScreen";
import FriendProfileScreen from "./screens/FriendProfileScreen";
import { OnboardingScreen } from "./screens/onboarding";

type ScreenName =
  | "Splash"
  | "Welcome"
  | "Login"
  | "Onboarding"
  | "HomePage"
  | "Home"
  | "Roster"
  | "Messages"
  | "ChatDetail"
  | "FullCalendar"
  | "Profile"
  | "CreateTeeTime"
  | "Invites"
  | "Availability"
  | "Community"
  | "FriendProfile";

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
}

interface Navigation {
  navigate: (screen: ScreenName, params?: NavigationParams) => void;
  replace: (screen: ScreenName, params?: NavigationParams) => void;
  goBack: () => void;
}

export default function App(): React.ReactElement {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>("Splash");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [screenParams, setScreenParams] = useState<NavigationParams>({});
  const [screenHistory, setScreenHistory] = useState<ScreenName[]>(["Splash"]);
  // Key to force remount screens when navigating
  const [screenKey, setScreenKey] = useState<number>(0);

  const navigation: Navigation = {
    navigate: (screen: ScreenName, params?: NavigationParams) => {
      if (params?.user) {
        setUserData(params.user);
      } else if (screen === "Login" || screen === "Welcome") {
        // Clear user data when navigating to auth screens
        setUserData(null);
      }
      setScreenParams(params || {});
      setScreenKey((prev) => prev + 1); // Force remount
      setScreenHistory((prev) => [...prev, screen]);
      setCurrentScreen(screen);
    },
    replace: (screen: ScreenName, params?: NavigationParams) => {
      if (params?.user) {
        setUserData(params.user);
      } else if (screen === "Login" || screen === "Welcome") {
        // Clear user data when navigating to auth screens
        setUserData(null);
      }
      setScreenKey((prev) => prev + 1); // Force remount
      setCurrentScreen(screen);
    },
    goBack: () => {
      if (screenHistory.length > 1) {
        const newHistory = [...screenHistory];
        newHistory.pop(); // Remove current screen
        const previousScreen = newHistory[newHistory.length - 1];
        setScreenHistory(newHistory);
        setScreenKey((prev) => prev + 1);
        setCurrentScreen(previousScreen);
      }
    },
  };

  const renderScreen = (): React.ReactElement => {
    // Using key prop forces React to remount the component with fresh state
    switch (currentScreen) {
      case "Splash":
        return <SplashScreen key={`splash-${screenKey}`} navigation={navigation as any} />;
      case "Welcome":
        return <WelcomeScreen key={`welcome-${screenKey}`} navigation={navigation as any} />;
      case "Login":
        return <LoginScreen key={`login-${screenKey}`} navigation={navigation as any} />;
      case "Onboarding":
        return <OnboardingScreen key={`onboarding-${screenKey}`} navigation={navigation as any} />;
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
        return <RosterScreen key={`roster-${screenKey}`} navigation={navigation as any} />;
      case "Messages":
        return <MessagesScreen key={`messages-${screenKey}`} navigation={navigation as any} />;
      case "ChatDetail":
        return (
          <ChatDetailScreen
            key={`chat-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      case "FullCalendar":
        return <FullCalendarScreen key={`calendar-${screenKey}`} navigation={navigation as any} />;
      case "Profile":
        return (
          <ProfileScreen
            key={`profile-${screenKey}`}
            navigation={navigation as any}
            route={{ params: { user: userData } } as any}
          />
        );
      case "CreateTeeTime":
        return <CreateTeeTimeScreen key={`create-${screenKey}`} navigation={navigation as any} />;
      case "Invites":
        return <InvitesScreen key={`invites-${screenKey}`} navigation={navigation as any} />;
      case "Availability":
      case "Community":
        return <AvailabilityScreen key={`availability-${screenKey}`} navigation={navigation as any} />;
      case "FriendProfile":
        return (
          <FriendProfileScreen
            key={`friend-profile-${screenKey}`}
            navigation={navigation as any}
            route={{ params: screenParams } as any}
          />
        );
      default:
        return <SplashScreen key={`default-${screenKey}`} navigation={navigation as any} />;
    }
  };

  return renderScreen();
}
