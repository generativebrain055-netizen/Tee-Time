import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { API_ENDPOINTS } from '../config/api';
import { COUNTRY_CODES } from '../constants/countryCodes';

const { width, height } = Dimensions.get("window");

const COUNTRY_CODES_OLD = [
  { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
  { code: "+355", country: "Albania", flag: "🇦🇱" },
  { code: "+213", country: "Algeria", flag: "🇩🇿" },
  { code: "+376", country: "Andorra", flag: "🇦🇩" },
  { code: "+244", country: "Angola", flag: "🇦🇴" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+374", country: "Armenia", flag: "🇦🇲" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+994", country: "Azerbaijan", flag: "🇦🇿" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+375", country: "Belarus", flag: "🇧🇾" },
  { code: "+32", country: "Belgium", flag: "🇧🇪" },
  { code: "+501", country: "Belize", flag: "🇧🇿" },
  { code: "+229", country: "Benin", flag: "🇧🇯" },
  { code: "+975", country: "Bhutan", flag: "🇧🇹" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+387", country: "Bosnia", flag: "🇧🇦" },
  { code: "+267", country: "Botswana", flag: "🇧🇼" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+673", country: "Brunei", flag: "🇧🇳" },
  { code: "+359", country: "Bulgaria", flag: "🇧🇬" },
  { code: "+226", country: "Burkina Faso", flag: "🇧🇫" },
  { code: "+257", country: "Burundi", flag: "🇧🇮" },
  { code: "+855", country: "Cambodia", flag: "🇰🇭" },
  { code: "+237", country: "Cameroon", flag: "🇨🇲" },
  { code: "+1", country: "Canada", flag: "🇨🇦" },
  { code: "+238", country: "Cape Verde", flag: "🇨🇻" },
  { code: "+236", country: "Central African Republic", flag: "🇨🇫" },
  { code: "+235", country: "Chad", flag: "🇹🇩" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+269", country: "Comoros", flag: "🇰🇲" },
  { code: "+242", country: "Congo", flag: "🇨🇬" },
  { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
  { code: "+385", country: "Croatia", flag: "🇭🇷" },
  { code: "+53", country: "Cuba", flag: "🇨🇺" },
  { code: "+357", country: "Cyprus", flag: "🇨🇾" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+253", country: "Djibouti", flag: "🇩🇯" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+503", country: "El Salvador", flag: "🇸🇻" },
  { code: "+240", country: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "+291", country: "Eritrea", flag: "🇪🇷" },
  { code: "+372", country: "Estonia", flag: "🇪🇪" },
  { code: "+251", country: "Ethiopia", flag: "🇪🇹" },
  { code: "+679", country: "Fiji", flag: "🇫🇯" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+241", country: "Gabon", flag: "🇬🇦" },
  { code: "+220", country: "Gambia", flag: "🇬🇲" },
  { code: "+995", country: "Georgia", flag: "🇬🇪" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+30", country: "Greece", flag: "🇬🇷" },
  { code: "+502", country: "Guatemala", flag: "🇬🇹" },
  { code: "+224", country: "Guinea", flag: "🇬🇳" },
  { code: "+245", country: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "+592", country: "Guyana", flag: "🇬🇾" },
  { code: "+509", country: "Haiti", flag: "🇭🇹" },
  { code: "+504", country: "Honduras", flag: "🇭🇳" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
  { code: "+36", country: "Hungary", flag: "🇭🇺" },
  { code: "+354", country: "Iceland", flag: "🇮🇸" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+964", country: "Iraq", flag: "🇮🇶" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+972", country: "Israel", flag: "🇮🇱" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+225", country: "Ivory Coast", flag: "🇨🇮" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+962", country: "Jordan", flag: "🇯🇴" },
  { code: "+7", country: "Kazakhstan", flag: "🇰🇿" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+996", country: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+856", country: "Laos", flag: "🇱🇦" },
  { code: "+371", country: "Latvia", flag: "🇱🇻" },
  { code: "+961", country: "Lebanon", flag: "🇱🇧" },
  { code: "+266", country: "Lesotho", flag: "🇱🇸" },
  { code: "+231", country: "Liberia", flag: "🇱🇷" },
  { code: "+218", country: "Libya", flag: "🇱🇾" },
  { code: "+423", country: "Liechtenstein", flag: "🇱🇮" },
  { code: "+370", country: "Lithuania", flag: "🇱🇹" },
  { code: "+352", country: "Luxembourg", flag: "🇱🇺" },
  { code: "+261", country: "Madagascar", flag: "🇲🇬" },
  { code: "+265", country: "Malawi", flag: "🇲🇼" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+960", country: "Maldives", flag: "🇲🇻" },
  { code: "+223", country: "Mali", flag: "🇲🇱" },
  { code: "+356", country: "Malta", flag: "🇲🇹" },
  { code: "+222", country: "Mauritania", flag: "🇲🇷" },
  { code: "+230", country: "Mauritius", flag: "🇲🇺" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+373", country: "Moldova", flag: "🇲🇩" },
  { code: "+377", country: "Monaco", flag: "🇲🇨" },
  { code: "+976", country: "Mongolia", flag: "🇲🇳" },
  { code: "+382", country: "Montenegro", flag: "🇲🇪" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" },
  { code: "+258", country: "Mozambique", flag: "🇲🇿" },
  { code: "+95", country: "Myanmar", flag: "🇲🇲" },
  { code: "+264", country: "Namibia", flag: "🇳🇦" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+505", country: "Nicaragua", flag: "🇳🇮" },
  { code: "+227", country: "Niger", flag: "🇳🇪" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+850", country: "North Korea", flag: "🇰🇵" },
  { code: "+389", country: "North Macedonia", flag: "🇲🇰" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+970", country: "Palestine", flag: "🇵🇸" },
  { code: "+507", country: "Panama", flag: "🇵🇦" },
  { code: "+675", country: "Papua New Guinea", flag: "🇵🇬" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+51", country: "Peru", flag: "🇵🇪" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+48", country: "Poland", flag: "🇵🇱" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+40", country: "Romania", flag: "🇷🇴" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+250", country: "Rwanda", flag: "🇷🇼" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+221", country: "Senegal", flag: "🇸🇳" },
  { code: "+381", country: "Serbia", flag: "🇷🇸" },
  { code: "+248", country: "Seychelles", flag: "🇸🇨" },
  { code: "+232", country: "Sierra Leone", flag: "🇸🇱" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+421", country: "Slovakia", flag: "🇸🇰" },
  { code: "+386", country: "Slovenia", flag: "🇸🇮" },
  { code: "+252", country: "Somalia", flag: "🇸🇴" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+211", country: "South Sudan", flag: "🇸🇸" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+249", country: "Sudan", flag: "🇸🇩" },
  { code: "+597", country: "Suriname", flag: "🇸🇷" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+963", country: "Syria", flag: "🇸🇾" },
  { code: "+886", country: "Taiwan", flag: "🇹🇼" },
  { code: "+992", country: "Tajikistan", flag: "🇹🇯" },
  { code: "+255", country: "Tanzania", flag: "🇹🇿" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+228", country: "Togo", flag: "🇹🇬" },
  { code: "+216", country: "Tunisia", flag: "🇹🇳" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+993", country: "Turkmenistan", flag: "🇹🇲" },
  { code: "+256", country: "Uganda", flag: "🇺🇬" },
  { code: "+380", country: "Ukraine", flag: "🇺🇦" },
  { code: "+971", country: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
  { code: "+678", country: "Vanuatu", flag: "🇻🇺" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+967", country: "Yemen", flag: "🇾🇪" },
  { code: "+260", country: "Zambia", flag: "🇿🇲" },
  { code: "+263", country: "Zimbabwe", flag: "🇿🇼" },
];

export default function LoginScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRY_CODES.find((c) => c.country === "United States") || COUNTRY_CODES[0]
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [currentStep, setCurrentStep] = useState("phone"); // phone, otp, password, username
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const e164Phone = `${selectedCountry.code}${digitsOnly}`;
  const isPhoneValid = digitsOnly.length >= 8;
  const isOtpValid = otpCode.trim().length === 6;
  const isPasswordValid = password.length >= 6;
  const isUsernameValid = username.trim().length >= 3;

  const primaryDisabled =
    loading ||
    (currentStep === "phone"
      ? !isPhoneValid
      : currentStep === "otp"
      ? !isOtpValid
      : currentStep === "username"
      ? !isUsernameValid || !isPasswordValid
      : !isPasswordValid);

  useEffect(() => {
    if (!resendTimer) return;
    const timerId = setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timerId);
  }, [resendTimer]);

  const handleRequestOtp = async (isResend = false) => {
    if (!isPhoneValid || loading) {
      return;
    }

    setLoading(true);
    if (!isResend) {
      setStatusMessage("");
    }
    setErrorMessage("");

    try {
      const response = await fetch(API_ENDPOINTS.REQUEST_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: e164Phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send OTP.");
      }

      setCurrentStep("otp");
      setOtpCode("");
      setStatusMessage(data.message || "OTP sent successfully.");
      setResendTimer(Number(data.resendAfterSeconds) || 30);
    } catch (error) {
      setErrorMessage(error.message || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!isOtpValid || loading) {
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: e164Phone, otp: otpCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to verify OTP.");
      }

      setStatusMessage("OTP verified. Logging you in...");
      setTimeout(() => {
        if (navigation) {
          navigation.navigate("Home", { user: data.user });
        }
      }, 500);
    } catch (error) {
      setErrorMessage(error.message || "Unable to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithPassword = async () => {
    if (!isPasswordValid || loading) return;

    setLoading(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: e164Phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      setStatusMessage("Login successful!");
      setTimeout(() => {
        if (navigation) {
          navigation.navigate("Home", { user: data.user });
        }
      }, 500);
    } catch (error) {
      setErrorMessage(error.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithUsername = async () => {
    if (!isUsernameValid || !isPasswordValid || loading) return;

    setLoading(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      setStatusMessage("Login successful!");
      setTimeout(() => {
        if (navigation) {
          navigation.navigate("Home", { user: data.user });
        }
      }, 500);
    } catch (error) {
      setErrorMessage(error.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (currentStep === "phone") {
      handleRequestOtp();
    } else if (currentStep === "otp") {
      handleVerifyOtp();
    } else if (currentStep === "username") {
      handleLoginWithUsername();
    } else {
      handleLoginWithPassword();
    }
  };

  const handleResendOtp = () => {
    if (resendTimer > 0 || loading) {
      return;
    }
    handleRequestOtp(true);
  };

  const selectCountry = (country) => {
    setSelectedCountry(country);
    setModalVisible(false);
    setSearchQuery("");
  };

  const filteredCountries = COUNTRY_CODES.filter(
    (country) =>
      country.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.includes(searchQuery)
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/compact-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Login Section */}
      <View style={styles.loginContainer}>
        <Text style={styles.title}>Login or Join</Text>
        <View style={styles.underline} />

        {/* Phone Number Input */}
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
            placeholder="Phone Number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            maxLength={15}
          />
        </View>

        {currentStep === "otp" && (
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>
              Enter the 6-digit code we sent to {e164Phone}
            </Text>
            <TextInput
              style={styles.otpInput}
              placeholder="Enter OTP"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={otpCode}
              onChangeText={setOtpCode}
              maxLength={6}
            />
            <TouchableOpacity
              style={[
                styles.resendButton,
                (resendTimer > 0 || loading) && styles.resendButtonDisabled,
              ]}
              onPress={handleResendOtp}
              disabled={resendTimer > 0 || loading}
            >
              <Text
                style={[
                  styles.resendButtonText,
                  (resendTimer > 0 || loading) &&
                    styles.resendButtonTextDisabled,
                ]}
              >
                {resendTimer > 0
                  ? `Resend code in ${resendTimer}s`
                  : "Resend code"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {currentStep === "password" && (
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Enter your password</Text>
            <TextInput
              style={{
                width: "100%",
                height: 55,
                borderWidth: 2,
                borderColor: "#E0E0E0",
                borderRadius: 8,
                paddingHorizontal: 16,
                fontSize: 16,
                marginBottom: 20,
                backgroundColor: "#FFFFFF",
              }}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setCurrentStep("phone")}>
              <Text
                style={{
                  color: "#2D7A4F",
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                Forgot Password? / Use OTP
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {currentStep === "username" && (
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Login with Username</Text>
            <TextInput
              style={{
                width: "100%",
                height: 55,
                borderWidth: 2,
                borderColor: "#E0E0E0",
                borderRadius: 8,
                paddingHorizontal: 16,
                fontSize: 16,
                marginBottom: 12,
                backgroundColor: "#FFFFFF",
              }}
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={{
                width: "100%",
                height: 55,
                borderWidth: 2,
                borderColor: "#E0E0E0",
                borderRadius: 8,
                paddingHorizontal: 16,
                fontSize: 16,
                marginBottom: 20,
                backgroundColor: "#FFFFFF",
              }}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setCurrentStep("phone")}>
              <Text
                style={{
                  color: "#2D7A4F",
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                Back to Phone Login
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            primaryDisabled && styles.continueButtonDisabled,
          ]}
          onPress={handlePrimaryAction}
          activeOpacity={0.8}
          disabled={primaryDisabled}
        >
          <Text style={styles.continueButtonText}>
            {loading
              ? "Please wait..."
              : currentStep === "phone"
              ? "Continue"
              : currentStep === "otp"
              ? "Verify & Login"
              : "Login"}
          </Text>
        </TouchableOpacity>

        {/* Signup / Login Switch */}
        <View style={styles.signupContainer}>
          {currentStep === "phone" ? (
            <>
              <TouchableOpacity onPress={() => setCurrentStep("password")}>
                <Text style={styles.signupLink}>Login with Phone & Password</Text>
              </TouchableOpacity>
              <Text style={styles.signupText}> or </Text>
              <TouchableOpacity onPress={() => setCurrentStep("username")}>
                <Text style={styles.signupLink}>Login with Username</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setCurrentStep("phone");
                setErrorMessage("");
                setStatusMessage("");
                setUsername("");
                setPassword("");
              }}
            >
              <Text style={styles.signupLink}>Back to Phone Entry</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <ActivityIndicator
            size="small"
            color="#000"
            style={styles.loadingIndicator}
          />
        )}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        {statusMessage ? (
          <Text style={styles.statusText}>{statusMessage}</Text>
        ) : null}
      </View>

      {/* Bottom Illustration */}
      <View style={styles.bottomContainer}>
        {/* People Image */}
        <Image
          source={require("../assets/people.png")}
          style={styles.peopleImage}
          resizeMode="contain"
        />

        {/* Grass Image */}
        <Image
          source={require("../assets/grass.png")}
          style={styles.grassImage}
          resizeMode="cover"
        />
      </View>

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
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>

            <ScrollView style={styles.countryList}>
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.countryItem,
                      selectedCountry.code === country.code &&
                        styles.selectedCountryItem,
                    ]}
                    onPress={() => selectCountry(country)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={styles.countryName}>{country.country}</Text>
                    <Text style={styles.countryCodeInList}>{country.code}</Text>
                    {selectedCountry.code === country.code && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsEmoji}>🔍</Text>
                  <Text style={styles.noResultsText}>No country found</Text>
                  <Text style={styles.noResultsSubtext}>
                    Try searching with a different keyword
                  </Text>
                </View>
              )}
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
    backgroundColor: "#FFFFFF",
  },
  logoContainer: {
    flex: 1.3,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 30,
  },
  logo: {
    width: width * 0.65,
    height: 140,
  },
  loginContainer: {
    flex: 2.4,
    paddingHorizontal: 40,
    justifyContent: "center",
    marginTop: -20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: "#1a1a1a",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  underline: {
    width: 160,
    height: 4,
    backgroundColor: "#50C878",
    alignSelf: "center",
    marginBottom: 35,
    borderRadius: 2,
  },
  phoneInputContainer: {
    flexDirection: "row",
    width: "100%",
    height: 58,
    borderWidth: 2,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  countryCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#F8F9FA",
    borderRightWidth: 1,
    borderRightColor: "#E0E0E0",
    minWidth: 105,
  },
  flagText: {
    fontSize: 24,
    marginRight: 6,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginRight: 4,
  },
  dropdownArrow: {
    fontSize: 10,
    color: "#666",
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#000000",
  },
  otpContainer: {
    width: "100%",
    marginBottom: 20,
  },
  otpLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
  },
  otpInput: {
    width: "100%",
    height: 55,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: "center",
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  resendButton: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: "#2D7A4F",
    fontWeight: "600",
  },
  resendButtonTextDisabled: {
    color: "#888",
  },
  continueButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#50C878",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#2D7A4F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderBottomWidth: 4,
    borderBottomColor: "#3D9960",
    marginTop: 5,
  },
  continueButtonDisabled: {
    backgroundColor: "#D3D3D3",
    elevation: 1,
    shadowOpacity: 0.1,
    borderBottomWidth: 3,
    borderBottomColor: "#A8A8A8",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  signupText: {
    color: "#666",
    fontSize: 16,
  },
  signupLink: {
    color: "#2D7A4F",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingIndicator: {
    marginTop: 12,
  },
  errorText: {
    marginTop: 16,
    color: "#D32F2F",
    textAlign: "center",
    fontWeight: "600",
  },
  statusText: {
    marginTop: 10,
    color: "#2E7D32",
    textAlign: "center",
    fontWeight: "600",
  },
  bottomContainer: {
    flex: 1.5,
    justifyContent: "flex-end",
    position: "relative",
  },
  peopleImage: {
    width: width,
    height: 168,
    position: "absolute",
    bottom: height * 0.12,
    left: 0,
    zIndex: 2,
  },
  grassImage: {
    width: width,
    height: height * 0.17,
    position: "absolute",
    bottom: -2,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.75,
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 18,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#666",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    height: 50,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  countryList: {
    height: height * 0.55,
    flexGrow: 0,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    backgroundColor: "#FFFFFF",
  },
  selectedCountryItem: {
    backgroundColor: "#F0F8F0",
  },
  countryFlag: {
    fontSize: 32,
    marginRight: 15,
    width: 40,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  countryCodeInList: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5CB85C",
    marginRight: 8,
  },
  checkMark: {
    fontSize: 20,
    color: "#5CB85C",
    fontWeight: "bold",
  },
  noResultsContainer: {
    flex: 1,
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
    minHeight: height * 0.4,
  },
  noResultsEmoji: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
