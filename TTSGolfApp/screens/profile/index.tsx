import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Modal,
    TextInput,
    Share,
    Alert,
    Dimensions,
} from "react-native";
import { Settings, QrCode, Edit3, ArrowLeft, X, Trash2, MapPin, ScanLine } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { ScreenShell, ContentArea, AppHeader, AppBottomNav } from "../../ui";
import { ConfirmModal } from "../../ui/feedback";
import { Skeleton } from "../../ui/feedback/Skeleton";
import { teeTimeApi, TeeTime, profileApi, TeeTimeHistoryEntry, draftApi } from "../../services/api";
import { useUser } from "../../contexts";
import { logger } from "../../utils/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const QR_MODAL_SIZE = Math.min(SCREEN_WIDTH * 0.55, 240);
const QR_LOGO_SIZE = Math.round(QR_MODAL_SIZE * 0.34);
const TeeTimeLogo = require("../../assets/compact-logo.png");

const getInitials = (firstName?: string, lastName?: string): string => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
};

const getFullName = (firstName?: string, lastName?: string): string => {
    return `${firstName || ""} ${lastName || ""}`.trim() || "User";
};

const getMemberSinceText = (createdAt?: string): string => {
    if (!createdAt) return "Member";
    try {
        const d = new Date(createdAt);
        const month = d.toLocaleString("en-US", { month: "long" });
        const year = d.getFullYear();
        return `Member since ${month} ${year}`;
    } catch {
        return "Member";
    }
};

const formatScore = (score?: number | string): string => {
    if (!score) return "—";
    return String(score);
};

const getPreferredTeeTimeDisplay = (pref?: string): string => {
    if (!pref) return "Not set";
    const map: Record<string, string> = {
        morning: "Morning",
        afternoon: "Afternoon",
        evening: "Evening",
    };
    return map[pref] || pref;
};

const getWalkOrRideDisplay = (pref?: string): string => {
    if (!pref) return "Not set";
    const map: Record<string, string> = {
        walk: "Walk",
        ride: "Ride",
        either: "Either",
    };
    return map[pref] || pref;
};

const getGroupSizeDisplay = (pref?: string): string => {
    if (!pref) return "Not set";
    const map: Record<string, string> = {
        twosome: "Twosome",
        threesome: "Threesome",
        foursome: "Foursome",
        any: "Any",
    };
    return map[pref] || pref;
};

export default function ProfileScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { profile, loading: profileLoading, fetchProfile } = useUser();
    const [refreshing, setRefreshing] = useState(false);
    const [recentRounds, setRecentRounds] = useState<TeeTimeHistoryEntry[]>([]);
    const [roundsLoading, setRoundsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrModalLoading, setQrModalLoading] = useState(false);
    const [qrData, setQrData] = useState<string | null>(null);
    const [qrVersion, setQrVersion] = useState(1);
    const [qrRegenerating, setQrRegenerating] = useState(false);

    // Fetch profile on mount if not cached
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);



    // Fetch recent rounds with scores
    useEffect(() => {
        const fetchRounds = async () => {
            try {
                const historyRes = await teeTimeApi.getHistory({ filter: "completed", limit: 3 });
                if (historyRes.success) {
                    setRecentRounds(historyRes.history);
                }
            } catch (error: any) {
                if (error?.message !== "Session expired") {
                    logger.error("[ProfileScreen] Error fetching rounds", error);
                }
            } finally {
                setRoundsLoading(false);
            }
        };

        if (profile) {
            fetchRounds();
        }
    }, [profile]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchProfile(true), // Force refresh
            (async () => {
                try {
                    const historyRes = await teeTimeApi.getHistory({ filter: "completed", limit: 3 });
                    if (historyRes.success) {
                        setRecentRounds(historyRes.history);
                    }
                } catch (error) {
                    logger.error("[ProfileScreen] Error fetching rounds", error);
                }
            })(),
        ]);
        setRefreshing(false);
    }, [fetchProfile]);

    const handleEditProfile = useCallback(() => {
        navigation?.navigate("EditProfile", { profile });
    }, [navigation, profile]);

    const handleDraftViaQR = useCallback(() => {
        setShowQRModal(true);
    }, []);

    const fetchQRForModal = useCallback(async () => {
        try {
            setQrModalLoading(true);
            const response = await draftApi.getQRCode();
            if (response.success && response.qrCode) {
                setQrData(response.qrCode.data);
                setQrVersion(response.qrCode.version);
            } else {
                setQrData(null);
            }
        } catch (error: any) {
            logger.error("[ProfileScreen] QR fetch error", error);
            setQrData(null);
        } finally {
            setQrModalLoading(false);
        }
    }, []);

    useEffect(() => {
        if (showQRModal) {
            fetchQRForModal();
        } else {
            setQrData(null);
        }
    }, [showQRModal, fetchQRForModal]);

    const closeQRModal = useCallback(() => setShowQRModal(false), []);

    const handleQRShare = useCallback(async () => {
        if (!qrData) return;
        try {
            await Share.share({
                message: `Scan my TeeTime QR code to add me to your roster!\n\nCode: ${qrData}`,
                title: "My TeeTime QR Code",
            });
        } catch (error) {
            logger.error("[ProfileScreen] QR share error", error);
        }
    }, [qrData]);

    const handleQRRegenerate = useCallback(() => {
        Alert.alert(
            "Regenerate QR Code",
            "This will invalidate your current QR code. Anyone who scanned your old code won't be able to use it. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Regenerate",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setQrRegenerating(true);
                            const response = await draftApi.regenerateQRCode();
                            if (response.success && response.qrCode) {
                                setQrData(response.qrCode.data);
                                setQrVersion(response.qrCode.version);
                                Alert.alert("Success", "QR code regenerated successfully!");
                            }
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to regenerate QR code");
                        } finally {
                            setQrRegenerating(false);
                        }
                    },
                },
            ]
        );
    }, []);

    const handleQRScan = useCallback(() => {
        setShowQRModal(false);
        navigation?.navigate("ScanQR");
    }, [navigation]);

    const handleSettings = useCallback(() => {
        navigation?.navigate("Settings");
    }, [navigation]);

    const handleEditAvailability = useCallback(() => {
        navigation?.navigate("EditAvailability");
    }, [navigation]);

    const fullName = getFullName(profile?.firstName, profile?.lastName);
    const initials = getInitials(profile?.firstName, profile?.lastName);
    const avatarUri = (profile?.avatarUrl || (profile as { avatar?: string })?.avatar || "").trim();
    const coursesPlayed = recentRounds.length > 0
        ? new Set(recentRounds.map(r => r.courseName)).size
        : 0;

    // Show loading only if both are loading initially
    const loading = profileLoading && roundsLoading;

    if (loading) {
        return (
            <ScreenShell>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
                    <ActivityIndicator size="large" color="#22C55E" />
                </View>
                <AppBottomNav activeTab="Profile" navigation={navigation} />
            </ScreenShell>
        );
    }

    return (
        <>
        <ScreenShell>
            <AppHeader
                title="Profile"
                onBack={() => navigation?.goBack()}
                rightComponent={
                    <TouchableOpacity onPress={handleSettings} style={{ padding: 4 }}>
                        <Settings size={24} color="#111827" strokeWidth={2} />
                    </TouchableOpacity>
                }
            />

            <ContentArea
                style={{ backgroundColor: '#F3F4F6' }}
                refreshing={refreshing}
                onRefresh={onRefresh}
            >
                {/* Cover Image */}
                <View style={{ height: 140, backgroundColor: '#4CAF50' }}>
                    <Image
                        source={require('../../assets/profile-cover.png')}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                </View>

                {/* Profile Card - Starting right after background */}
                <View style={{
                    marginHorizontal: 16,
                    marginTop: 0,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 20,
                    paddingTop: 70,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                }}>
                    {/* Profile Photo - Centered and overlapping */}
                    <View style={{ 
                        position: 'absolute',
                        top: -60,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                    }}>
                        {avatarUri ? (
                            <Image
                                key={avatarUri}
                                source={{ uri: avatarUri }}
                                style={{
                                    width: 120,
                                    height: 120,
                                    borderRadius: 60,
                                    borderWidth: 5,
                                    borderColor: '#FFFFFF',
                                }}
                            />
                        ) : (
                            <View style={{
                                width: 120,
                                height: 120,
                                borderRadius: 60,
                                backgroundColor: '#5EBC68',
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderWidth: 5,
                                borderColor: '#FFFFFF',
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_700Bold',
                                    fontSize: 36,
                                    color: '#FFFFFF',
                                }}>
                                    {initials}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* User Info */}
                    <Text style={{
                        fontFamily: 'Inter_700Bold',
                        fontSize: 20,
                        color: '#000000',
                        textAlign: 'center',
                        marginBottom: 4,
                    }}>
                        {fullName}
                    </Text>
                    <Text style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 13,
                        color: '#6B7280',
                        textAlign: 'center',
                        marginBottom: 16,
                    }}>
                        {profile?.location || "San Francisco, CA"} | Handicap: {profile?.handicap || "24"}
                    </Text>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={handleDraftViaQR}
                            activeOpacity={0.7}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                paddingVertical: 14,
                                backgroundColor: '#5EBC68',
                                borderRadius: 12,
                            }}
                        >
                            <QrCode size={20} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 15,
                                color: '#FFFFFF',
                            }}>
                                Draft via QR
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleEditProfile}
                            activeOpacity={0.7}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                paddingVertical: 14,
                                backgroundColor: '#FFFFFF',
                                borderWidth: 1.5,
                                borderColor: '#D1D5DB',
                                borderRadius: 12,
                            }}
                        >
                            <Edit3 size={20} color="#6B7280" strokeWidth={2.5} />
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 15,
                                color: '#6B7280',
                            }}>
                                Edit Profile
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Playing Preferences */}
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
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
                            marginBottom: 20,
                        }}>
                            <Text style={{
                                fontFamily: 'Inter_700Bold',
                                fontSize: 18,
                                color: '#111827',
                            }}>
                                Playing preferences
                            </Text>
                            <TouchableOpacity
                                onPress={handleEditAvailability}
                                activeOpacity={0.7}
                                style={{
                                    paddingVertical: 6,
                                    paddingHorizontal: 12,
                                    backgroundColor: '#F3F4F6',
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 13,
                                    color: '#5EBC68',
                                }}>
                                    Edit Availability
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 20,
                        }}>
                            <View style={{ flex: 1, minWidth: '45%' }}>
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 11,
                                    color: '#9CA3AF',
                                    textTransform: 'uppercase',
                                    marginBottom: 6,
                                    letterSpacing: 0.5,
                                }}>
                                    TEE TIME PREFERENCE
                                </Text>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 15,
                                    color: '#111827',
                                }}>
                                    {getPreferredTeeTimeDisplay(profile?.preferences?.preferredTeeTime)}
                                </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: '45%' }}>
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 11,
                                    color: '#9CA3AF',
                                    textTransform: 'uppercase',
                                    marginBottom: 6,
                                    letterSpacing: 0.5,
                                }}>
                                    RIDE OR WALK
                                </Text>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 15,
                                    color: '#111827',
                                }}>
                                    {getWalkOrRideDisplay(profile?.preferences?.walkOrRide) || "Ride"}
                                </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: '45%' }}>
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 11,
                                    color: '#9CA3AF',
                                    textTransform: 'uppercase',
                                    marginBottom: 6,
                                    letterSpacing: 0.5,
                                }}>
                                    GOLF VIBE
                                </Text>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 15,
                                    color: '#111827',
                                }}>
                                    {profile?.preferences?.playingPartnerPreference || "Weekend Warrior"}
                                </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: '45%' }}>
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 11,
                                    color: '#9CA3AF',
                                    textTransform: 'uppercase',
                                    marginBottom: 6,
                                    letterSpacing: 0.5,
                                }}>
                                    DRINK OF CHOICE
                                </Text>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 15,
                                    color: '#111827',
                                }}>
                                    {profile?.preferences?.drinkOfChoice || "Transfusion"}
                                </Text>
                            </View>
                        </View>

                        {/* Separator Line */}
                        <View style={{
                            height: 1,
                            backgroundColor: '#E5E7EB',
                            marginVertical: 20,
                        }} />

                        {/* Active Memberships (Read-only) */}
                        <Text style={{
                            fontFamily: 'Inter_700Bold',
                            fontSize: 18,
                            color: '#111827',
                            marginBottom: 12,
                        }}>
                            Active memberships
                        </Text>
                        {profile?.clubs && Array.isArray(profile.clubs) && profile.clubs.length > 0 ? (
                            profile.clubs.map((club, index) => (
                                <View key={club.id || index} style={{ marginBottom: index < profile.clubs.length - 1 ? 12 : 0 }}>
                                    <Text style={{
                                        fontFamily: 'Inter_500Medium',
                                        fontSize: 15,
                                        color: '#111827',
                                    }}>
                                        {club.name}
                                    </Text>
                                    {club.location && (
                                        <Text style={{
                                            fontFamily: 'Inter_400Regular',
                                            fontSize: 13,
                                            color: '#6B7280',
                                            marginTop: 2,
                                        }}>
                                            {club.location}
                                        </Text>
                                    )}
                                </View>
                            ))
                        ) : (
                            <Text style={{
                                fontFamily: 'Inter_500Medium',
                                fontSize: 15,
                                color: '#6B7280',
                            }}>
                                No clubs added
                            </Text>
                        )}
                    </View>
                </View>

                {/* Stats Cards */}
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
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
                            color: '#111827',
                            marginBottom: 16,
                        }}>
                            Stats
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            gap: 12,
                        }}>
                            <View style={{
                                flex: 1,
                                borderRadius: 12,
                                paddingVertical: 16,
                                paddingHorizontal: 12,
                                alignItems: 'center',
                                backgroundColor: '#EFF6FF',
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_700Bold',
                                    fontSize: 28,
                                    color: '#3B82F6',
                                    marginBottom: 4,
                                }}>
                                    {profile?.roundsPlayed || "24"}
                                </Text>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 13,
                                    color: '#3B82F6',
                                }}>
                                    Rounds
                                </Text>
                            </View>
                            <View style={{
                                flex: 1,
                                borderRadius: 12,
                                paddingVertical: 16,
                                paddingHorizontal: 12,
                                alignItems: 'center',
                                backgroundColor: '#ECFDF5',
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_700Bold',
                                    fontSize: 28,
                                    color: '#10B981',
                                    marginBottom: 4,
                                }}>
                                    {coursesPlayed || "12"}
                                </Text>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 13,
                                    color: '#10B981',
                                }}>
                                    Courses
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    borderRadius: 12,
                                    paddingVertical: 16,
                                    paddingHorizontal: 12,
                                    alignItems: 'center',
                                    backgroundColor: '#FAF5FF',
                                }}
                                onPress={() => navigation?.navigate("SocialRateHistory")}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_700Bold',
                                    fontSize: 28,
                                    color: '#9333EA',
                                    marginBottom: 4,
                                }}>
                                    {formatScore(profile?.socialRate) || "142"}
                                </Text>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 13,
                                    color: '#9333EA',
                                }}>
                                    Social Score
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Recent Rounds */}
                <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 24 }}>
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
                            color: '#111827',
                            marginBottom: 16,
                        }}>
                            Recent rounds
                        </Text>
                        {roundsLoading ? (
                            <View style={{
                                padding: 16,
                                alignItems: 'center',
                            }}>
                                <ActivityIndicator size="small" color="#22C55E" />
                            </View>
                        ) : recentRounds.length > 0 ? (
                            recentRounds.map((round, index) => (
                                <TouchableOpacity
                                    key={round.id || index}
                                    activeOpacity={0.7}
                                    onPress={() => navigation?.navigate("TeeTimeDetail", { teeTimeId: round.id })}
                                    style={{
                                        backgroundColor: '#F9FAFB',
                                        borderRadius: 12,
                                        padding: 16,
                                        marginBottom: index < recentRounds.length - 1 ? 12 : 0,
                                        borderWidth: 1,
                                        borderColor: '#E5E7EB',
                                    }}
                                >
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 15,
                                        color: '#111827',
                                        marginBottom: 4,
                                    }}>
                                        {round.courseName}
                                    </Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{
                                            fontFamily: 'Inter_400Regular',
                                            fontSize: 13,
                                            color: '#6B7280',
                                        }}>
                                            {new Date(round.teeDate).toLocaleDateString('en-US', { 
                                                month: 'long', 
                                                day: 'numeric', 
                                                year: 'numeric' 
                                            })}
                                        </Text>
                                        {round.gameScore !== undefined && round.gameScore !== null && (
                                            <Text style={{
                                                fontFamily: 'Inter_600SemiBold',
                                                fontSize: 15,
                                                color: '#111827',
                                            }}>
                                                Score: {round.gameScore}{round.holesPlayed === 9 ? ' (9)' : ''}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={{
                                padding: 24,
                                alignItems: 'center',
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_500Medium',
                                    fontSize: 14,
                                    color: '#6B7280',
                                    textAlign: 'center',
                                }}>
                                    No recent rounds yet
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

            </ContentArea>

            <AppBottomNav activeTab="Profile" navigation={navigation} />
        </ScreenShell>

        <Modal visible={showQRModal} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end", alignItems: "center" }}>
                <View style={{
                    width: "100%",
                    height: SCREEN_HEIGHT * (4 / 5),
                    backgroundColor: "#FFFFFF",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    paddingTop: 12,
                    paddingBottom: Math.max(insets.bottom, 24),
                    paddingHorizontal: 24,
                    alignItems: "center",
                }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 12 }}>
                        <View style={{ width: 32 }} />
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: "#1F2937" }} numberOfLines={1}>
                            {profile?.username?.trim() || fullName}
                        </Text>
                        <TouchableOpacity onPress={closeQRModal} hitSlop={12} style={{ padding: 4 }}>
                            <X size={24} color="#4B5563" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: "#747474", textAlign: "center", marginBottom: 20 }}>
                        {getMemberSinceText(profile?.createdAt)}
                    </Text>

                    {qrModalLoading ? (
                        <View style={{ width: QR_MODAL_SIZE + 32, height: QR_MODAL_SIZE + 32, justifyContent: "center", alignItems: "center", marginBottom: 24 }}>
                            <ActivityIndicator size="large" color="#5EBC68" />
                            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#6B7280", marginTop: 12 }}>Generating QR Code...</Text>
                        </View>
                    ) : qrData ? (
                        <View style={{ width: QR_MODAL_SIZE + 32, height: QR_MODAL_SIZE + 32, justifyContent: "center", alignItems: "center", marginBottom: 24 }}>
                            <View style={{ width: QR_MODAL_SIZE, height: QR_MODAL_SIZE, backgroundColor: "#FFFFFF", borderRadius: 4, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                                <QRCode
                                    value={qrData}
                                    size={QR_MODAL_SIZE}
                                    color="#111827"
                                    backgroundColor="#FFFFFF"
                                    quietZone={0}
                                    ecl="M"
                                    logo={TeeTimeLogo}
                                    logoSize={QR_LOGO_SIZE}
                                    logoBackgroundColor="#FFFFFF"
                                    logoBorderRadius={Math.round(QR_LOGO_SIZE / 2)}
                                />
                            </View>
                        </View>
                    ) : (
                        <View style={{ width: QR_MODAL_SIZE + 32, height: QR_MODAL_SIZE + 32, justifyContent: "center", alignItems: "center", marginBottom: 24 }}>
                            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#6B7280", marginBottom: 12 }}>Failed to load QR code</Text>
                            <TouchableOpacity onPress={fetchQRForModal} style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#5EBC68", borderRadius: 10 }}>
                                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFFFFF" }}>Tap to retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={{ flexDirection: "row", gap: 12, width: "100%", maxWidth: 320 }}>
                        <TouchableOpacity
                            onPress={handleQRScan}
                            activeOpacity={0.8}
                            style={{
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingVertical: 14,
                                borderRadius: 10,
                                backgroundColor: "#E9E9E9",
                                gap: 8,
                            }}
                        >
                            <ScanLine size={20} color="#6E6E6E" strokeWidth={2.5} />
                            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#6E6E6E" }}>Scan</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleQRShare}
                            disabled={!qrData}
                            activeOpacity={0.8}
                            style={{
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingVertical: 14,
                                borderRadius: 8,
                                backgroundColor: "#FFFFFF",
                                borderWidth: 1,
                                borderColor: "#E5E5E5",
                                gap: 8,
                            }}
                        >
                            <QrCode size={18} color="#1F2937" />
                            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#1F2937" }}>My Code</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    </>
    );
}
