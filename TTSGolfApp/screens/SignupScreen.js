import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { API_ENDPOINTS } from '../config/api';
import { COUNTRY_CODES } from '../constants/countryCodes';

export default function SignupScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: OTP Verification
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phoneNumber: '',
    handicap: '',
    password: '',
  });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const handleContinue = async () => {
    if (step === 1) {
      // Validate basic info
      if (!formData.firstName.trim()) {
        Alert.alert('Error', 'Please enter your first name');
        return;
      }
      if (!formData.lastName.trim()) {
        Alert.alert('Error', 'Please enter your last name');
        return;
      }
      if (!formData.username.trim() || formData.username.length < 3) {
        Alert.alert('Error', 'Username must be at least 3 characters');
        return;
      }
      if (!formData.phoneNumber.trim() || formData.phoneNumber.length < 10) {
        Alert.alert('Error', 'Please enter a valid phone number');
        return;
      }
      if (!formData.password.trim() || formData.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }

      // Request OTP
      setLoading(true);
      try {
        const fullPhoneNumber = `${selectedCountry.code}${formData.phoneNumber}`;
        const response = await fetch(API_ENDPOINTS.REQUEST_OTP, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
        });

        const data = await response.json();
        
        if (data.success) {
          Alert.alert('Success', 'OTP sent! Check your phone or console.');
          setStep(2);
          setOtpTimer(60); // 1 minute timer
        } else {
          Alert.alert('Error', data.message || 'Failed to send OTP');
        }
      } catch (error) {
        Alert.alert('Error', 'Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      // Verify OTP and create account
      if (otp.length !== 6) {
        Alert.alert('Error', 'Please enter the 6-digit OTP');
        return;
      }

      setLoading(true);
      try {
        const fullPhoneNumber = `${selectedCountry.code}${formData.phoneNumber}`;
        const response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: fullPhoneNumber,
            otp: otp,
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.username,
            handicap: formData.handicap,
            password: formData.password,
          }),
        });

        const data = await response.json();
        
        if (data.success && data.user) {
          const userName = data.user.firstName || formData.firstName || 'there';
          Alert.alert('Success', `Welcome ${userName}! Account created successfully.`);
          if (navigation) {
            navigation.navigate('Home', { user: data.user });
          }
        } else {
          Alert.alert('Error', data.message || 'Invalid OTP');
        }
      } catch (error) {
        Alert.alert('Error', 'Network error. Please try again.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Enter your details to get started' : 'Verify your phone number'}
            </Text>
          </View>

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John"
                  placeholderTextColor="#999"
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Doe"
                  placeholderTextColor="#999"
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="johndoe123"
                  placeholderTextColor="#999"
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text.toLowerCase().replace(/\s/g, '') })}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <View style={styles.phoneInputContainer}>
                  <TouchableOpacity
                    style={styles.countryCodeButton}
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                    <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>

                  <TextInput
                    style={styles.phoneInput}
                    placeholder="234 567 8900"
                    placeholderTextColor="#999"
                    value={formData.phoneNumber}
                    onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Handicap (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 15"
                  placeholderTextColor="#999"
                  value={formData.handicap}
                  onChangeText={(text) => setFormData({ ...formData, handicap: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#999"
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry
                />
              </View>
            </View>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <View style={styles.form}>
              <Text style={styles.otpInfo}>
                We've sent a 6-digit code to {formData.phoneNumber}
              </Text>
              
              {otpTimer > 0 && (
                <View style={styles.timerContainer}>
                  <Text style={styles.timerText}>⏱️ Code expires in: {otpTimer}s</Text>
                </View>
              )}

              {otpTimer === 0 && (
                <View style={styles.expiredContainer}>
                  <Text style={styles.expiredText}>⚠️ OTP expired. Please request a new one.</Text>
                </View>
              )}
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Enter OTP *</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="123456"
                  placeholderTextColor="#999"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => setStep(1)}
              >
                <Text style={styles.resendText}>Change phone number</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            <Text style={styles.continueButtonText}>
              {loading ? 'Please wait...' : step === 1 ? 'Send OTP' : 'Verify & Continue'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          {step === 1 && (
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation && navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* Country Code Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.countryList}>
              {COUNTRY_CODES.map((country, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.countryItem,
                    selectedCountry.code === country.code && styles.selectedCountryItem
                  ]}
                  onPress={() => {
                    setSelectedCountry(country);
                    setModalVisible(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryName}>{country.country}</Text>
                  <Text style={styles.countryCodeInList}>{country.code}</Text>
                  {selectedCountry.code === country.code && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
  },
  form: {
    marginBottom: 24,
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
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  otpInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  continueButton: {
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
    marginTop: 10,
  },
  continueButtonDisabled: {
    backgroundColor: '#D3D3D3',
    borderBottomColor: '#A8A8A8',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 15,
    color: '#666',
  },
  loginLinkBold: {
    color: '#50C878',
    fontWeight: '700',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#50C878',
    fontWeight: '600',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    height: 56,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#F8F9FA',
    borderRightWidth: 2,
    borderRightColor: '#E8E8E8',
    minWidth: 110,
  },
  flagText: {
    fontSize: 24,
    marginRight: 6,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginRight: 4,
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#666',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
  },
  countryList: {
    maxHeight: '100%',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#FFFFFF',
  },
  selectedCountryItem: {
    backgroundColor: '#F0F8F0',
  },
  countryFlag: {
    fontSize: 32,
    marginRight: 15,
    width: 40,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  countryCodeInList: {
    fontSize: 15,
    fontWeight: '600',
    color: '#50C878',
    marginRight: 8,
  },
  checkMark: {
    fontSize: 20,
    color: '#50C878',
    fontWeight: 'bold',
  },
  timerContainer: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  timerText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '600',
  },
  expiredContainer: {
    backgroundColor: '#F8D7DA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F5C6CB',
  },
  expiredText: {
    fontSize: 14,
    color: '#721C24',
    textAlign: 'center',
    fontWeight: '600',
  },
});
