import React, { useState } from "react";
import SplashScreen from "./screens/SplashScreen";
import WelcomeScreen from "./screens/WelcomeScreen";
import LoginScreen from "./screens/LoginScreen";
import HomePage from "./screens/HomePage";
import { OnboardingScreen } from "./screens/onboarding";

type ScreenName =
  | "Splash"
  | "Welcome"
  | "Login"
  | "Onboarding"
  | "HomePage"
  | "Home";

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
}

interface Navigation {
  navigate: (screen: ScreenName, params?: NavigationParams) => void;
  replace: (screen: ScreenName, params?: NavigationParams) => void;
}

export default function App(): React.ReactElement {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>("Splash");
  const [userData, setUserData] = useState<UserData | null>(null);
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
      setScreenKey((prev) => prev + 1); // Force remount
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
      default:
        return <SplashScreen key={`default-${screenKey}`} navigation={navigation as any} />;
    }
  };

  return renderScreen();
}
