import React, { useState } from "react";
import SplashScreen from "./screens/SplashScreen";
import WelcomeScreen from "./screens/WelcomeScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import HomePage from "./screens/HomePage";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("Splash");
  const [userData, setUserData] = useState(null);

  const navigation = {
    navigate: (screen, params) => {
      if (params?.user) {
        setUserData(params.user);
      }
      setCurrentScreen(screen);
    },
    replace: (screen, params) => {
      if (params?.user) {
        setUserData(params.user);
      }
      setCurrentScreen(screen);
    },
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "Splash":
        return <SplashScreen navigation={navigation} />;
      case "Welcome":
        return <WelcomeScreen navigation={navigation} />;
      case "Login":
        return <LoginScreen navigation={navigation} />;
      case "Signup":
        return <SignupScreen navigation={navigation} />;
      case "Home":
        return (
          <HomePage
            route={{ params: { user: userData } }}
            navigation={navigation}
          />
        );
      default:
        return <SplashScreen navigation={navigation} />;
    }
  };

  return renderScreen();
}
