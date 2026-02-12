import React, { useState, useCallback, memo, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Modal,
} from "react-native";
import { ChevronDown, Trash2, Camera, X, MapPin } from "lucide-react-native";
import { Avatar } from "../../components/common";
import { ScreenShell, AppHeader } from "../../ui";
import { useColors } from "../../ui/theme/ThemeContext";
import { ConfirmModal } from "../../ui/feedback";
import { profileApi } from "../../services/api";
import { useUser } from "../../contexts";
import { logger } from "../../utils/logger";

const COLORS = {
    primary: "#5EBC68",
    placeholder: "#9CA3AF",
    textSub: "#6B7280",
    border: "#E5E7EB",
    gray50: "#F9FAFB",
    lightGray: "#EEEEEE",
    gray900: "#111827",
};

interface Props {
    navigation: any;
    route: { params: { profile?: any } };
}

const TEE_TIME_OPTIONS = [
    { label: "Morning", value: "morning" },
    { label: "Afternoon", value: "afternoon" },
    { label: "Evening", value: "evening" },
    { label: "Any time", value: "any" },
];

const WALK_RIDE_OPTIONS = [
    { label: "Walk", value: "walk" },
    { label: "Ride", value: "ride" },
    { label: "Either", value: "either" },
];

const GOLF_VIBE_OPTIONS = [
    { label: "Weekend warrior", value: "weekend_warrior" },
    { label: "Competitive player", value: "competitive" },
    { label: "Casual golfer", value: "casual" },
    { label: "Scratch golfer", value: "scratch" },
];

// Dropdown Select Component
const DropdownSelect = memo(({
    label,
    value,
    options,
    onSelect,
}: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onSelect: (value: string) => void;
}) => {
    const [showOptions, setShowOptions] = useState(false);
    const selectedOption = options.find(o => o.value === value);

    return (
        <View style={{ marginBottom: 16, zIndex: showOptions ? 1000 : 1 }}>
            <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: COLORS.gray900,
                marginBottom: 8,
            }}>
                {label}
            </Text>
            <View style={{ position: 'relative' }}>
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: COLORS.gray50,
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                    }}
                    onPress={() => setShowOptions(!showOptions)}
                    activeOpacity={0.7}
                >
                    <Text style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 15,
                        color: COLORS.gray900,
                    }}>
                        {selectedOption?.label || "Select..."}
                    </Text>
                    <ChevronDown 
                        size={20} 
                        color={COLORS.textSub}
                        style={{ 
                            transform: [{ rotate: showOptions ? '180deg' : '0deg' }] 
                        }}
                    />
                </TouchableOpacity>
                {showOptions && (
                    <View style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        backgroundColor: '#EEEEEE',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5,
                        zIndex: 2000,
                    }}>
                        {options.map((option, index) => (
                            <TouchableOpacity
                                key={option.value}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 14,
                                    borderBottomWidth: index < options.length - 1 ? 1 : 0,
                                    borderBottomColor: COLORS.border,
                                }}
                                onPress={() => {
                                    onSelect(option.value);
                                    setShowOptions(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 15,
                                    color: COLORS.gray900,
                                }}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
});

// Text Input Component
const FormInput = memo(({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
}) => (
    <View style={{ marginBottom: 16 }}>
        <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 14,
            color: COLORS.gray900,
            marginBottom: 8,
        }}>
            {label}
        </Text>
        <TextInput
            style={{
                backgroundColor: COLORS.gray50,
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                color: COLORS.gray900,
            }}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.placeholder}
            keyboardType={keyboardType}
        />
    </View>
));

export default function EditProfileScreen({ navigation, route }: Props) {
    const { profile: contextProfile, updateProfile: updateContextProfile } = useUser();
    const initialProfile = route.params?.profile || contextProfile || {};

    const [saving, setSaving] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [showAddClubModal, setShowAddClubModal] = useState(false);
    const [clubSearch, setClubSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedClub, setSelectedClub] = useState<any>(null);
    const [phoneNumber, setPhoneNumber] = useState(initialProfile.phoneNumber || initialProfile.phone || "");
    const [handicap, setHandicap] = useState(initialProfile.handicap?.toString() || "");
    const [preferredTeeTime, setPreferredTeeTime] = useState(
        initialProfile.preferences?.preferredTeeTime || "afternoon"
    );
    const [walkOrRide, setWalkOrRide] = useState(
        initialProfile.preferences?.walkOrRide || "ride"
    );
    const [golfVibe, setGolfVibe] = useState(
        initialProfile.preferences?.playingPartnerPreference || "weekend_warrior"
    );
    const [drinkOfChoice, setDrinkOfChoice] = useState(
        initialProfile.preferences?.drinkOfChoice || ""
    );
    const [clubs, setClubs] = useState<{ id: string; name: string; location?: string }[]>(
        Array.isArray(initialProfile.clubs) 
            ? initialProfile.clubs.filter((club: any) => club && club.id && club.name)
            : []
    );

    // Sync clubs with context profile when it updates
    useEffect(() => {
        if (contextProfile?.clubs && Array.isArray(contextProfile.clubs)) {
            // Filter out any invalid club entries and ensure id is string
            const validClubs = contextProfile.clubs
                .filter((club): club is { id: string; name: string; location?: string; type?: string } => !!(club && club.id && club.name))
                .map((c) => ({ id: c.id, name: c.name, location: c.location }));
            setClubs(validClubs);
        }
    }, [contextProfile?.clubs]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const updateData = {
                phoneNumber: phoneNumber || undefined,
                handicap: handicap ? parseInt(handicap) : undefined,
                preferences: {
                    preferredTeeTime,
                    walkOrRide,
                    playingPartnerPreference: golfVibe,
                    drinkOfChoice,
                },
                clubs: Array.isArray(clubs) ? clubs.map(c => ({ id: c.id, name: c.name, location: c.location || '' })) : [],
            };

            logger.debug('[EditProfileScreen] Saving profile with data', updateData);
            logger.debug('[EditProfileScreen] Clubs being saved', clubs);

            const response = await profileApi.updateProfile(updateData);

            logger.debug('[EditProfileScreen] Update response', response);

            if (response.success) {
                logger.info('[EditProfileScreen] Update successful, updating context');
                updateContextProfile({
                    phoneNumber: phoneNumber || undefined,
                    handicap: handicap ? parseInt(handicap) : undefined,
                    preferences: {
                        preferredTeeTime,
                        walkOrRide,
                        playingPartnerPreference: golfVibe,
                        drinkOfChoice,
                    },
                    clubs: Array.isArray(clubs) ? clubs.map(c => ({ id: c.id, name: c.name, location: c.location || '' })) : [],
                });

                setShowSuccessModal(true);
            }
        } catch (error: any) {
            logger.error("[EditProfileScreen] Error saving profile", error);
            setErrorMessage(error.message || "Failed to save profile");
            setShowErrorModal(true);
        } finally {
            setSaving(false);
        }
    }, [phoneNumber, handicap, preferredTeeTime, walkOrRide, golfVibe, drinkOfChoice, clubs, navigation, updateContextProfile]);

    const handleChangePhoto = useCallback(() => {
        setShowPhotoModal(true);
    }, []);

    const handleRemoveClub = useCallback((index: number) => {
        setClubs(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleAddClub = useCallback(() => {
        setShowAddClubModal(true);
        setClubSearch("");
        setSearchResults([]);
        setSelectedClub(null);
    }, []);

    const handleSearchClubs = useCallback(async (query: string) => {
        setClubSearch(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_URL}/api/courses/clubs/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                setSearchResults(data.clubs || []);
            }
        } catch (error) {
            logger.error("[EditProfileScreen] Error searching clubs", error);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    }, []);

    const handleSelectClub = useCallback((club: any) => {
        setSelectedClub(club);
        setClubSearch(club.name);
        setSearchResults([]);
    }, []);

    const handleConfirmAddClub = useCallback(() => {
        if (selectedClub) {
            const newClub = {
                id: selectedClub.id,
                name: selectedClub.name,
                location: `${selectedClub.city}, ${selectedClub.state}`,
            };
            setClubs(prev => [...prev, newClub]);
            setShowAddClubModal(false);
            setSelectedClub(null);
            setClubSearch("");
        }
    }, [selectedClub]);

    const initials = `${initialProfile.firstName?.[0] || ""}${initialProfile.lastName?.[0] || ""}`.toUpperCase() || "JS";
    const colors = useColors();

    return (
        <ScreenShell>
            <AppHeader
                title="Edit Profile"
                onBack={() => navigation.goBack()}
            />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    style={{ backgroundColor: '#F3F4F6' }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {/* Profile Photo Section */}
                    <View style={{
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 16,
                        paddingTop: 24,
                    }}>
                        <View style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            padding: 20,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                        }}>
                            <Text style={{
                                fontFamily: 'Inter_700Bold',
                                fontSize: 18,
                                color: COLORS.gray900,
                                marginBottom: 16,
                            }}>
                                Profile Photo
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Avatar
                                    uri={initialProfile.avatarUrl}
                                    size={64}
                                    showCameraButton={false}
                                />
                                <TouchableOpacity onPress={handleChangePhoto} style={{ marginLeft: 16 }}>
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 15,
                                        color: '#3B82F6',
                                    }}>
                                        Change Photo
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Basic Information Section */}
                    <View style={{
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 16,
                        paddingTop: 16,
                    }}>
                        <View style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            padding: 20,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                        }}>
                            <Text style={{
                                fontFamily: 'Inter_700Bold',
                                fontSize: 18,
                                color: COLORS.gray900,
                                marginBottom: 16,
                            }}>
                                Basic Information
                            </Text>
                            <FormInput
                                label="Phone Number"
                                value={phoneNumber}
                                onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, ""))}
                                placeholder="(555) 123-4567"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Playing Preferences Section */}
                    <View style={{
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 16,
                        paddingTop: 16,
                    }}>
                        <View style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            padding: 20,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                        }}>
                            <Text style={{
                                fontFamily: 'Inter_700Bold',
                                fontSize: 18,
                                color: COLORS.gray900,
                                marginBottom: 16,
                            }}>
                                Playing Preferences
                            </Text>
                            <FormInput
                                label="Handicap"
                                value={handicap}
                                onChangeText={setHandicap}
                                placeholder="24"
                                keyboardType="numeric"
                            />
                            <DropdownSelect
                                label="Tee time preference"
                                value={preferredTeeTime}
                                options={TEE_TIME_OPTIONS}
                                onSelect={setPreferredTeeTime}
                            />
                            <DropdownSelect
                                label="Ride or walk"
                                value={walkOrRide}
                                options={WALK_RIDE_OPTIONS}
                                onSelect={setWalkOrRide}
                            />
                            <DropdownSelect
                                label="Golf vibe"
                                value={golfVibe}
                                options={GOLF_VIBE_OPTIONS}
                                onSelect={setGolfVibe}
                            />
                            <FormInput
                                label="Drink of choice"
                                value={drinkOfChoice}
                                onChangeText={setDrinkOfChoice}
                                placeholder="Transfusion"
                            />
                        </View>
                    </View>

                    {/* Active Memberships Section */}
                    <View style={{
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 16,
                        paddingTop: 16,
                    }}>
                        <View style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            padding: 20,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16,
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_700Bold',
                                    fontSize: 18,
                                    color: COLORS.gray900,
                                }}>
                                    Active memberships
                                </Text>
                                <TouchableOpacity onPress={handleAddClub}>
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 15,
                                        color: '#3B82F6',
                                    }}>
                                        + Add
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {Array.isArray(clubs) && clubs.length > 0 ? (
                                clubs.map((club, index) => (
                                    <View
                                        key={club.id || index}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 16,
                                            backgroundColor: COLORS.gray50,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: COLORS.border,
                                            marginBottom: 12,
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontFamily: 'Inter_600SemiBold',
                                                fontSize: 15,
                                                color: COLORS.gray900,
                                            }}>
                                                {club.name}
                                            </Text>
                                            {club.location && (
                                                <Text style={{
                                                    fontFamily: 'Inter_400Regular',
                                                    fontSize: 13,
                                                    color: COLORS.textSub,
                                                    marginTop: 4,
                                                }}>
                                                    {club.location}
                                                </Text>
                                            )}
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemoveClub(index)}>
                                            <Trash2 size={20} color="#EF4444" strokeWidth={2} />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            ) : (
                                <View style={{
                                    padding: 32,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Text style={{
                                        fontFamily: 'Inter_400Regular',
                                        fontSize: 14,
                                        color: COLORS.textSub,
                                        textAlign: 'center',
                                    }}>
                                        No memberships added yet
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={{
                        flexDirection: 'row',
                        gap: 12,
                        paddingHorizontal: 16,
                        paddingTop: 24,
                        backgroundColor: '#F3F4F6',
                    }}>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                paddingVertical: 14,
                                borderRadius: 12,
                                backgroundColor: '#FFFFFF',
                                borderWidth: 1,
                                borderColor: '#D1D5DB',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 15,
                                color: '#6B7280',
                            }}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                paddingVertical: 14,
                                borderRadius: 12,
                                backgroundColor: COLORS.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 15,
                                    color: 'white',
                                }}>
                                    Save changes
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <ConfirmModal
                visible={showSuccessModal}
                title="Success"
                message="Profile updated successfully!"
                onConfirm={() => {
                    setShowSuccessModal(false);
                    navigation.goBack();
                }}
                onCancel={() => {
                    setShowSuccessModal(false);
                    navigation.goBack();
                }}
                confirmText="OK"
            />

            <ConfirmModal
                visible={showErrorModal}
                title="Error"
                message={errorMessage}
                onConfirm={() => setShowErrorModal(false)}
                onCancel={() => setShowErrorModal(false)}
                confirmText="OK"
            />

            <ConfirmModal
                visible={showPhotoModal}
                title="Change Photo"
                message="Choose an option"
                onConfirm={() => {
                    setShowPhotoModal(false);
                    logger.debug("[EditProfileScreen] Camera option selected");
                }}
                onCancel={() => {
                    setShowPhotoModal(false);
                    logger.debug("[EditProfileScreen] Library option selected");
                }}
                confirmText="Take Photo"
                cancelText="Choose from Library"
            />

            {/* Add Club Modal */}
            <Modal
                visible={showAddClubModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddClubModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'flex-end',
                }}>
                    <View style={{
                        backgroundColor: '#FFFFFF',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 24,
                        maxHeight: '80%',
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 20,
                        }}>
                            <Text style={{
                                fontFamily: 'Inter_700Bold',
                                fontSize: 20,
                                color: '#111827',
                            }}>
                                Add club membership
                            </Text>
                            <TouchableOpacity onPress={() => setShowAddClubModal(false)}>
                                <X size={24} color="#6B7280" strokeWidth={2} />
                            </TouchableOpacity>
                        </View>

                        <View style={{
                            backgroundColor: '#F9FAFB',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            marginBottom: 16,
                        }}>
                            <TextInput
                                style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 15,
                                    color: '#111827',
                                }}
                                placeholder="Club search"
                                placeholderTextColor="#9CA3AF"
                                value={clubSearch}
                                onChangeText={handleSearchClubs}
                            />
                        </View>

                        <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
                            {searching ? (
                                <ActivityIndicator size="small" color="#5EBC68" />
                            ) : Array.isArray(searchResults) && searchResults.length > 0 ? (
                                searchResults.map((club, index) => (
                                    <TouchableOpacity
                                        key={club.id || index}
                                        onPress={() => handleSelectClub(club)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            padding: 16,
                                            backgroundColor: selectedClub?.id === club.id ? '#F0FDF4' : '#FFFFFF',
                                            borderRadius: 12,
                                            marginBottom: 8,
                                            borderWidth: 1,
                                            borderColor: selectedClub?.id === club.id ? '#5EBC68' : '#E5E7EB',
                                        }}
                                    >
                                        <MapPin size={20} color="#6B7280" strokeWidth={2} style={{ marginRight: 12 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontFamily: 'Inter_600SemiBold',
                                                fontSize: 15,
                                                color: '#111827',
                                                marginBottom: 2,
                                            }}>
                                                {club.name}
                                            </Text>
                                            {club.city && club.state && (
                                                <Text style={{
                                                    fontFamily: 'Inter_400Regular',
                                                    fontSize: 13,
                                                    color: '#6B7280',
                                                }}>
                                                    {club.city}, {club.state}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : clubSearch.length >= 2 ? (
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 14,
                                    color: '#6B7280',
                                    textAlign: 'center',
                                    paddingVertical: 20,
                                }}>
                                    No clubs found
                                </Text>
                            ) : null}
                        </ScrollView>

                        <TouchableOpacity
                            onPress={handleConfirmAddClub}
                            disabled={!selectedClub}
                            style={{
                                backgroundColor: selectedClub ? '#5EBC68' : '#E5E7EB',
                                borderRadius: 12,
                                paddingVertical: 16,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: selectedClub ? '#FFFFFF' : '#9CA3AF',
                            }}>
                                Add club
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenShell>
    );
}
