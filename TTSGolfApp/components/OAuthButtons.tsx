import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { API_BASE_URL } from '../config/api';
import sessionManager from '../utils/sessionManager';

interface OAuthButtonsProps {
    onSuccess: (data: any) => void;
    onError: (error: string) => void;
}

// Configure Google Sign In
GoogleSignin.configure({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
});

export default function OAuthButtons({ onSuccess, onError }: OAuthButtonsProps) {
    const handleGoogleSignIn = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            if (!userInfo.data?.idToken) {
                throw new Error('No ID token received from Google');
            }

            // Send to backend
            const response = await fetch(`${API_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: userInfo.data.idToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Google sign in failed');
            }

            if (data.isNewUser) {
                // New user - go to onboarding with partial data
                onSuccess({ isNewUser: true, partialData: data.partialData });
            } else {
                // Existing user - save session and login
                await sessionManager.saveSession({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    user: data.user,
                });
                onSuccess({ isNewUser: false, user: data.user });
            }
        } catch (error: any) {
            console.error('Google Sign In Error:', error);
            onError(error.message || 'Google sign in failed');
        }
    };

    const handleAppleSignIn = async () => {
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            // Send to backend
            const response = await fetch(`${API_BASE_URL}/auth/apple`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identityToken: credential.identityToken,
                    user: credential.fullName ? {
                        name: {
                            firstName: credential.fullName.givenName,
                            lastName: credential.fullName.familyName,
                        }
                    } : null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Apple sign in failed');
            }

            if (data.isNewUser) {
                // New user - go to onboarding with partial data
                onSuccess({ isNewUser: true, partialData: data.partialData });
            } else {
                // Existing user - save session and login
                await sessionManager.saveSession({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    user: data.user,
                });
                onSuccess({ isNewUser: false, user: data.user });
            }
        } catch (error: any) {
            if (error.code === 'ERR_REQUEST_CANCELED') {
                // User canceled
                return;
            }
            console.error('Apple Sign In Error:', error);
            onError(error.message || 'Apple sign in failed');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
            </View>

            <View style={styles.buttonsContainer}>
                {Platform.OS === 'ios' && (
                    <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={12}
                        style={styles.appleButton}
                        onPress={handleAppleSignIn}
                    />
                )}

                <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 14,
        color: '#6B7280',
    },
    buttonsContainer: {
        gap: 12,
    },
    appleButton: {
        height: 56,
    },
    googleButton: {
        height: 56,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
});
