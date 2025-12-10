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

  const navigation: Navigation = {
    navigate: (screen: ScreenName, params?: NavigationParams) => {
      if (params?.user) {
        setUserData(params.user);
      }
      setCurrentScreen(screen);
    },
    replace: (screen: ScreenName, params?: NavigationParams) => {
      if (params?.user) {
        setUserData(params.user);
      }
      setCurrentScreen(screen);
    },
  };

  const renderScreen = (): React.ReactElement => {
    switch (currentScreen) {
      case "Splash":
        return <SplashScreen navigation={navigation as any} />;
      case "Welcome":
        return <WelcomeScreen navigation={navigation as any} />;
      case "Login":
        return <LoginScreen navigation={navigation as any} />;
      case "Onboarding":
        return <OnboardingScreen navigation={navigation as any} />;
      case "HomePage":
      case "Home":
        return (
          <HomePage
            route={{ params: { user: userData } } as any}
            navigation={navigation as any}
          />
        );
      default:
        return <SplashScreen navigation={navigation as any} />;
    }
  };

  return renderScreen();
}
