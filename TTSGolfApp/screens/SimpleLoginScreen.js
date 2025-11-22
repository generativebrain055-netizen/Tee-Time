import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { API_ENDPOINTS } from '../config/api';

const { width, height } = Dimensions.get('window');

export default function SimpleLoginScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          password: password,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Login successful!');
        if (navigation) {
          navigation.navigate('Home');
        }
      } else {
        Alert.alert('Error', data.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/compact-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to your account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 234 567 8900"
              placeholderTextColor="#999"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => navigation && navigation.navigate('Signup')}
          >
            <Text style={styles.signupLinkText}>
              Don't have an account? <Text style={styles.signupLinkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Illustration */}
        <View style={styles.bottomContainer}>
          <Image
            source={require('../assets/people.png')}
            style={styles.peopleImage}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/grass.png')}
            style={styles.grassImage}
            resizeMode="cover"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  logoContainer: {
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.65,
    height: 120,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    paddingBottom: height * 0.3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#000',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  loginButton: {
    height: 56,
    backgroundColor: '#50C878',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#2D7A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderBottomWidth: 4,
    borderBottomColor: '#3D9960',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#D3D3D3',
    borderBottomColor: '#A8A8A8',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  signupLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  signupLinkText: {
    fontSize: 15,
    color: '#666',
  },
  signupLinkBold: {
    color: '#50C878',
    fontWeight: '700',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.25,
    justifyContent: 'flex-end',
  },
  peopleImage: {
    width: width,
    height: 120,
    position: 'absolute',
    bottom: height * 0.13,
    left: 0,
    zIndex: 2,
  },
  grassImage: {
    width: width,
    height: height * 0.13,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
