import React, { useState } from 'react';
import SimpleLoginScreen from './screens/SimpleLoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomePage from './screens/HomePage';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [userData, setUserData] = useState(null);

  const navigation = {
    navigate: (screen, params) => {
      if (params?.user) {
        setUserData(params.user);
      }
      setCurrentScreen(screen);
    },
  };

  if (currentScreen === 'Home') {
    return <HomePage route={{ params: { user: userData } }} />;
  }

  if (currentScreen === 'Signup') {
    return <SignupScreen navigation={navigation} />;
  }

  return <SimpleLoginScreen navigation={navigation} />;
}
