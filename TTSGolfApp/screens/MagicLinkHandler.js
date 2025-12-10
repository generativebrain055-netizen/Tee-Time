import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

/**
 * MagicLinkHandler Screen
 * Handles magic link deep linking from email
 * Automatically verifies token and logs user in
 */
const MagicLinkHandler = ({ route, navigation }) => {
  const [status, setStatus] = useState('Verifying...');
  const { token } = route.params || {};

  useEffect(() => {
    if (token) {
      verifyMagicLink(token);
    } else {
      setStatus('Invalid link');
      Alert.alert('Error', 'Invalid magic link. Please try again.');
      navigation.replace('Login');
    }
  }, [token]);

  const verifyMagicLink = async (token) => {
    try {
      setStatus('Verifying your magic link...');

      const response = await fetch(
        `${API_ENDPOINTS.VERIFY_MAGIC_LINK}?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setStatus('Success! Logging you in...');

        // Store tokens
        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));

        // Check if user needs to complete profile
        if (!data.user.firstName || !data.user.lastName) {
          // Navigate to profile completion
          setTimeout(() => {
            navigation.replace('CompleteProfile', { user: data.user });
          }, 1000);
        } else {
          // Navigate to home
          setTimeout(() => {
            navigation.replace('Home', { user: data.user });
          }, 1000);
        }
      } else {
        setStatus('Verification failed');
        Alert.alert(
          'Verification Failed',
          data.message || 'Invalid or expired magic link.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('Login'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Magic link verification error:', error);
      setStatus('Error occurred');
      Alert.alert(
        'Error',
        'Unable to verify magic link. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Login'),
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🏌️</Text>
        <Text style={styles.title}>TeeTime Golf</Text>
        <ActivityIndicator size="large" color="#4CAF50" style={styles.spinner} />
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.subtitle}>Please wait a moment...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    maxWidth: 350,
    width: '90%',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 30,
  },
  spinner: {
    marginVertical: 20,
  },
  status: {
    fontSize: 16,
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default MagicLinkHandler;
