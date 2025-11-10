import React, { useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import HomePage from './screens/HomePage';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');

  const navigation = {
    navigate: (screen) => setCurrentScreen(screen),
  };

  if (currentScreen === 'Home') {
    return <HomePage />;
  }

  return <LoginScreen navigation={navigation} />;
}
