/**
 * CompleteProfileScreen
 * For users who signed up via magic link
 * Collects additional profile information
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ViewStyle,
  TextStyle,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_ENDPOINTS } from "../config/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { logger } from "../utils/logger";

/**
 * User data interface
 */
interface User {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  handicap?: number;
}

/**
 * Navigation params for the screen
 */
type RootStackParamList = {
  CompleteProfile: { user: User };
  Home: { user: User };
};

type Props = NativeStackScreenProps<RootStackParamList, "CompleteProfile">;

/**
 * API response interface
 */
interface UpdateProfileResponse {
  success: boolean;
  message?: string;
  user?: User;
}

const CompleteProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = route.params || {};

  const [firstName, setFirstName] = useState<string>(user?.firstName || "");
  const [lastName, setLastName] = useState<string>(user?.lastName || "");
  const [username, setUsername] = useState<string>("");
  const [handicap, setHandicap] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleComplete = async (): Promise<void> => {
    // Validation
    if (!firstName.trim()) {
      Alert.alert("Required", "Please enter your first name");
      return;
    }
    if (!lastName.trim()) {
      Alert.alert("Required", "Please enter your last name");
      return;
    }
    if (!username.trim()) {
      Alert.alert("Required", "Please choose a username");
      return;
    }
    if (username.length < 3) {
      Alert.alert("Invalid", "Username must be at least 3 characters");
      return;
    }

    setLoading(true);

    try {
      const accessToken = await AsyncStorage.getItem("accessToken");

      const response = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim().toLowerCase(),
          handicap: handicap ? parseInt(handicap) : null,
        }),
      });

      const data: UpdateProfileResponse = await response.json();

      if (data.success && data.user) {
        // Update stored user data
        await AsyncStorage.setItem("user", JSON.stringify(data.user));

        Alert.alert(
          "Welcome! 🎉",
          "Your profile is complete. Let's get started!",
          [
            {
              text: "Continue",
              onPress: () => navigation.replace("Home", { user: data.user! }),
            },
          ]
        );
      } else {
        Alert.alert("Error", data.message || "Unable to update profile");
      }
    } catch (error) {
      logger.error("[CompleteProfileScreen] Profile update error", error);
      Alert.alert("Error", "Unable to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = (): void => {
    Alert.alert(
      "Skip Profile Setup?",
      "You can complete your profile later from settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          onPress: () => navigation.replace("Home", { user }),
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Let's get to know you better!</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="johndoe"
              value={username}
              onChangeText={(text: string) => setUsername(text.toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>This will be your unique identifier</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Handicap (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="15"
              value={handicap}
              onChangeText={setHandicap}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.hint}>Your golf handicap index</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "Complete Profile"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/**
 * Stylesheet interfaces
 */
interface Styles {
  container: ViewStyle;
  scrollContent: ViewStyle;
  header: ViewStyle;
  emoji: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  form: ViewStyle;
  inputGroup: ViewStyle;
  label: TextStyle;
  input: TextStyle;
  hint: TextStyle;
  button: ViewStyle;
  buttonDisabled: ViewStyle;
  buttonText: TextStyle;
  skipButton: ViewStyle;
  skipButtonText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
    color: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  hint: {
    fontSize: 13,
    color: "#888",
    marginTop: 8,
    fontStyle: "italic",
  },
  button: {
    height: 58,
    backgroundColor: "#50C878",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    elevation: 8,
    shadowColor: "#2D7A4F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    borderBottomWidth: 4,
    borderBottomColor: "#3D9960",
  },
  buttonDisabled: {
    backgroundColor: "#D3D3D3",
    borderBottomColor: "#A8A8A8",
    elevation: 2,
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  skipButtonText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default CompleteProfileScreen;
