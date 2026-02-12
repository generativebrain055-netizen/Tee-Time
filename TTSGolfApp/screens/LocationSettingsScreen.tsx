/**
 * Location Settings Screen
 * Allows users to update their location for distance-based features
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { MapPin, Navigation, Check } from "lucide-react-native";
import * as Location from "expo-location";
import { ScreenShell, AppHeader } from "../ui";
import { useColors, useTheme } from "../ui/theme";
import { profileApi } from "../services/api";
import { useUser } from "../contexts";
import { spacing, fontSize, fontFamily, radii } from "../ui/theme/tokens";
import { logger } from "../utils/logger";

export default function LocationSettingsScreen({ navigation }: any) {
    const colors = useColors();
    const theme = useTheme();
    const { profile, fetchProfile } = useUser();
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationName, setLocationName] = useState<string>("");

    useEffect(() => {
        // Load current location from profile
        if (profile?.location) {
            setLocationName(profile.location);
        }
    }, [profile]);

    const requestLocationPermission = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Location Permission Required",
                    "Please enable location access to update your location for distance-based features.",
                    [{ text: "OK" }]
                );
                return false;
            }
            return true;
        } catch (error) {
            logger.error("[LocationSettingsScreen] Permission error", error);
            Alert.alert("Error", "Failed to request location permission");
            return false;
        }
    }, []);

    const getCurrentLocation = useCallback(async () => {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) return;

        setLoading(true);
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;
            setCurrentLocation({ lat: latitude, lng: longitude });

            // Reverse geocode to get location name
            try {
                const addresses = await Location.reverseGeocodeAsync({
                    latitude,
                    longitude,
                });

                if (addresses && addresses.length > 0) {
                    const address = addresses[0];
                    const city = address.city || address.subAdministrativeArea || "";
                    const state = address.region || "";
                    const locationStr = city && state ? `${city}, ${state}` : city || state || "Current Location";
                    setLocationName(locationStr);
                }
            } catch (geocodeError) {
                logger.warn("[LocationSettingsScreen] Geocoding failed", geocodeError);
                setLocationName("Current Location");
            }
        } catch (error) {
            logger.error("[LocationSettingsScreen] Location error", error);
            Alert.alert("Error", "Failed to get your current location");
        } finally {
            setLoading(false);
        }
    }, [requestLocationPermission]);

    const updateLocation = useCallback(async () => {
        if (!currentLocation) {
            Alert.alert("Error", "Please get your current location first");
            return;
        }

        setUpdating(true);
        try {
            await profileApi.updateProfile({
                location: locationName,
            });

            // Store coordinates in a way that can be used for distance calculations
            // Note: We're storing location as a string, but coordinates could be stored separately
            // For now, we'll update the location string and the app can use geocoding when needed
            
            await fetchProfile();
            Alert.alert("Success", "Location updated successfully");
        } catch (error: any) {
            logger.error("[LocationSettingsScreen] Update error", error);
            Alert.alert("Error", error?.message || "Failed to update location");
        } finally {
            setUpdating(false);
        }
    }, [currentLocation, locationName, fetchProfile]);

    return (
        <ScreenShell>
            <AppHeader
                title="Location Settings"
                onBack={() => navigation?.goBack()}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                {/* Header Section */}
                <View style={[styles.headerSection, { backgroundColor: colors.surface }]}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primaryContainer }]}>
                        <MapPin size={32} color={colors.primary} strokeWidth={2} />
                    </View>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        Update Your Location
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Keep your location updated for accurate distance-based features
                    </Text>
                </View>

                {/* Current Location Display */}
                <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        Current Location
                    </Text>
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                        {profile?.location || "Not set"}
                    </Text>
                </View>

                {/* Get Current Location */}
                <View style={[styles.actionCard, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                        onPress={getCurrentLocation}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.surface} />
                        ) : (
                            <>
                                <Navigation size={20} color={colors.surface} strokeWidth={2} />
                                <Text style={[styles.actionButtonText, { color: colors.surface }]}>
                                    Get Current Location
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {currentLocation && (
                        <View style={styles.locationInfo}>
                            <View style={styles.locationRow}>
                                <Check size={20} color={colors.primary} strokeWidth={2} />
                                <Text style={[styles.locationInfoText, { color: colors.textPrimary }]}>
                                    Location detected: {locationName}
                                </Text>
                            </View>
                            <Text style={[styles.coordinatesText, { color: colors.textMuted }]}>
                                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Update Button */}
                {currentLocation && (
                    <TouchableOpacity
                        style={[styles.updateButton, { backgroundColor: colors.primary }]}
                        onPress={updateLocation}
                        disabled={updating}
                        activeOpacity={0.8}
                    >
                        {updating ? (
                            <ActivityIndicator size="small" color={colors.surface} />
                        ) : (
                            <Text style={[styles.updateButtonText, { color: colors.surface }]}>
                                Update Location
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                {/* Info Text */}
                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                    Your location is used to calculate distances for features like Open invites, 
                    Waiver Wire posts, and course recommendations. Update it whenever you travel 
                    to ensure accurate results.
                </Text>
            </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    contentContainer: {
        padding: spacing.lg,
        paddingBottom: spacing['4xl'],
    },
    headerSection: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        paddingHorizontal: spacing.lg,
        borderRadius: radii.lg,
        marginBottom: spacing.lg,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize['2xl'],
        marginBottom: spacing.xs,
    },
    headerSubtitle: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.base,
        textAlign: 'center',
    },
    infoCard: {
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize.lg,
        marginBottom: spacing.sm,
    },
    locationText: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.base,
    },
    actionCard: {
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        gap: spacing.sm,
    },
    actionButtonText: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
    },
    locationInfo: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    locationInfoText: {
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
        flex: 1,
    },
    coordinatesText: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.xs,
        marginLeft: spacing['2xl'],
    },
    updateButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    updateButtonText: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
    },
    infoText: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.xs,
        textAlign: 'center',
        lineHeight: fontSize.sm * 1.5,
    },
});
