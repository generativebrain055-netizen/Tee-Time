import React, { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
    TextInput,
    StyleSheet,
} from "react-native";
import { Clock, ChevronDown, Check, SlidersHorizontal, X, Search, Phone, Plus } from "lucide-react-native";
import { COLORS, FIGMA_YOUR_PLAYERS } from "./constants";
import { Friend } from "../../services/api";

interface RosterInviteStepProps {
    friends: Friend[];
    responseWindow: number;
    orderedPlayers: string[];
    onResponseWindowChange: (hours: number) => void;
    onReorderPlayers: (orderedIds: string[]) => void;
    onAddPhoneInvite?: (phone: string, name: string) => void;
    phoneInvites?: Array<{ phone: string; name: string }>;
    /** Figma 565-351: creator header (name + avatar) */
    creatorName?: string;
    creatorAvatarUrl?: string;
}

const RESPONSE_WINDOWS = [
    { value: 0.0333, label: "2 minutes (TEST)" }, // ~2 minutes for testing
    { value: 1, label: "1 hour" },
    { value: 2, label: "2 hours" },
    { value: 3, label: "3 hours" },
    { value: 4, label: "4 hours" },
    { value: 6, label: "6 hours" },
    { value: 8, label: "8 hours" },
    { value: 12, label: "12 hours" },
    { value: 24, label: "24 hours" },
];

const SORT_OPTIONS = [
    { value: "roster", label: "Roster order" },
    { value: "handicap_high", label: "Handicap: High to low" },
    { value: "handicap_low", label: "Handicap: Low to high" },
    { value: "social_score", label: "Social Score: High to low" },
    { value: "recently_played", label: "Recently Played" },
];

export default function RosterInviteStep({
    friends,
    responseWindow,
    orderedPlayers,
    onResponseWindowChange,
    onReorderPlayers,
    onAddPhoneInvite,
    phoneInvites = [],
    creatorName,
    creatorAvatarUrl,
}: RosterInviteStepProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
    const [selectedSort, setSelectedSort] = useState("roster");
    const [indicatedAvailable, setIndicatedAvailable] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showPhoneInput, setShowPhoneInput] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [phoneName, setPhoneName] = useState("");

    // Extract unique club names from friends
    const availableClubs = React.useMemo(() => {
        const clubSet = new Set<string>();
        friends.forEach(friend => {
            if (friend.clubs && Array.isArray(friend.clubs)) {
                friend.clubs.forEach(club => {
                    if (club && club.name) {
                        clubSet.add(club.name);
                    }
                });
            }
        });
        return Array.from(clubSet).sort();
    }, [friends]);

    // Filter and sort friends
    const filteredAndSortedFriends = React.useMemo(() => {
        let filtered = [...friends];

        // Apply club filter
        if (selectedClubs.length > 0) {
            filtered = filtered.filter(friend => {
                if (!friend.clubs || !Array.isArray(friend.clubs)) return false;
                return friend.clubs.some(club => 
                    club && club.name && selectedClubs.includes(club.name)
                );
            });
        }

        // Apply availability filter
        if (indicatedAvailable) {
            // TODO: Filter by friends who have indicated availability
            // This would require availability data to be included in friends
        }

        // Apply sorting
        switch (selectedSort) {
            case 'handicap_high':
                filtered.sort((a, b) => (b.handicap || 0) - (a.handicap || 0));
                break;
            case 'handicap_low':
                filtered.sort((a, b) => (a.handicap || 0) - (b.handicap || 0));
                break;
            case 'social_score':
                filtered.sort((a, b) => (b.socialRate || 0) - (a.socialRate || 0));
                break;
            case 'recently_played':
                filtered.sort((a, b) => (b.roundsPlayed || 0) - (a.roundsPlayed || 0));
                break;
            case 'roster':
            default:
                // Keep original roster order
                break;
        }

        return filtered;
    }, [friends, selectedClubs, indicatedAvailable, selectedSort]);

    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    const creatorInitials = creatorName
        ? creatorName.trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase()
        : "";

    const getSelectedLabel = () => {
        const option = RESPONSE_WINDOWS.find((w) => w.value === responseWindow);
        return option?.label || "Select response time";
    };

    // Get ordered friends list based on filters and sorting
    const getOrderedFriends = useCallback(() => {
        const baseFriends = filteredAndSortedFriends;
        if (orderedPlayers.length === 0 || selectedClubs.length > 0 || selectedSort !== 'roster') {
            return baseFriends;
        }
        return orderedPlayers
            .map((id) => baseFriends.find((f) => f.id === id))
            .filter(Boolean) as Friend[];
    }, [filteredAndSortedFriends, orderedPlayers, selectedClubs, selectedSort]);

    const orderedFriendsBase = getOrderedFriends();

    // Figma 1269-3370: Search players filter
    const orderedFriends = useMemo(() => {
        if (!searchQuery.trim()) return orderedFriendsBase;
        const q = searchQuery.trim().toLowerCase();
        return orderedFriendsBase.filter(
            (f) =>
                `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) ||
                (f.username || "").toLowerCase().includes(q)
        );
    }, [orderedFriendsBase, searchQuery]);

    const toggleClub = (club: string) => {
        setSelectedClubs(prev => 
            prev.includes(club) 
                ? prev.filter(c => c !== club)
                : [...prev, club]
        );
    };

    const applyFilters = () => {
        // Update ordered players based on filtered results
        // This ensures the parent component knows which players are selected
        const filteredIds = filteredAndSortedFriends.map(f => f.id);
        onReorderPlayers(filteredIds);
        setShowFilterModal(false);
    };

    const saveSearch = () => {
        // Save search logic here
        setShowFilterModal(false);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F6F8' }}>
            <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Figma 565-351: Header card – creator name + avatar (Frame 2608818, 8px radius) */}
                <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        marginBottom: 16,
                    }}>
                        {creatorAvatarUrl ? (
                            <Image
                                source={{ uri: creatorAvatarUrl }}
                                style={{ width: 40, height: 40, borderRadius: 20 }}
                            />
                        ) : (
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: '#22C55E',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 14,
                                    color: '#FFFFFF',
                                }}>
                                    {creatorInitials || "?"}
                                </Text>
                            </View>
                        )}
                        <Text style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 16,
                            color: '#374151',
                            marginLeft: 12,
                        }}>
                            {creatorName ?? "Roster host"}
                        </Text>
                    </View>

                {/* Response Window Section – Figma 565: "Response window" label, then "Select response time" dropdown */}
                <Text style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 14,
                    color: '#374151',
                    marginBottom: 8,
                }}>
                    Response window
                </Text>
                <View style={{ marginBottom: 24, zIndex: 1000 }}>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 16,
                            paddingHorizontal: 16,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                        }}
                        onPress={() => setShowPicker(!showPicker)}
                        activeOpacity={0.7}
                    >
                        <Clock size={20} color="#9CA3AF" strokeWidth={2} />
                        <Text style={{
                            flex: 1,
                            fontFamily: 'Inter_400Regular',
                            fontSize: 16,
                            color: '#6B7280',
                            marginLeft: 12,
                        }}>
                            {getSelectedLabel()}
                        </Text>
                        <ChevronDown size={20} color="#9CA3AF" strokeWidth={2} />
                    </TouchableOpacity>

                    {/* Dropdown attached to field - Figma 430-958: 8px radius */}
                    {showPicker && (
                        <View style={{
                            position: 'absolute',
                            top: 56,
                            left: 0,
                            right: 0,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 5,
                            zIndex: 1001,
                        }}>
                            {RESPONSE_WINDOWS.map((option, index) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingVertical: 14,
                                        paddingHorizontal: 16,
                                        borderBottomWidth: index < RESPONSE_WINDOWS.length - 1 ? 1 : 0,
                                        borderBottomColor: '#F3F4F6',
                                    }}
                                    onPress={() => {
                                        onResponseWindowChange(option.value);
                                        setShowPicker(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{
                                        fontFamily: 'Inter_500Medium',
                                        fontSize: 16,
                                        color: '#111827',
                                    }}>
                                        {option.label}
                                    </Text>
                                    {responseWindow === option.value && (
                                        <Check size={20} color="#22C55E" strokeWidth={2.5} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Figma 1269-3055: Your players + Search players */}
                <Text style={rosterStyles.sectionTitle}>{FIGMA_YOUR_PLAYERS.title}</Text>
                <View style={rosterStyles.searchWrap}>
                    <Search size={18} color="#9CA3AF" strokeWidth={2} />
                    <TextInput
                        style={rosterStyles.searchInput}
                        placeholder={FIGMA_YOUR_PLAYERS.searchPlaceholder}
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                }}>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            gap: 6,
                        }}
                        onPress={() => setShowFilterModal(true)}
                        activeOpacity={0.7}
                    >
                        <SlidersHorizontal size={16} color="#6B7280" strokeWidth={2} />
                        <Text style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 14,
                            color: '#6B7280',
                        }}>
                            Filter
                        </Text>
                        {selectedClubs.length > 0 && (
                            <View style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: '#22C55E',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_700Bold',
                                    fontSize: 11,
                                    color: '#FFFFFF',
                                }}>
                                    {selectedClubs.length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Roster List – Figma 430-958: 8px radius */}
                <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    overflow: 'hidden',
                }}>
                    {orderedFriends.map((friend, index) => (
                        <View 
                            key={friend.id} 
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 16,
                                paddingHorizontal: 16,
                                borderBottomWidth: index < orderedFriends.length - 1 ? 1 : 0,
                                borderBottomColor: '#F3F4F6',
                            }}
                        >
                            {friend.avatar ? (
                                <Image 
                                    source={{ uri: friend.avatar }} 
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 24,
                                    }}
                                />
                            ) : (
                                <View style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: '#22C55E',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 16,
                                        color: '#FFFFFF',
                                    }}>
                                        {getInitials(friend.firstName, friend.lastName)}
                                    </Text>
                                </View>
                            )}

                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#111827',
                                }}>
                                    {friend.firstName} {friend.lastName}
                                </Text>
                            </View>
                        </View>
                    ))}
                    {orderedFriends.length === 0 && phoneInvites.length === 0 && (
                        <View style={{
                            alignItems: 'center',
                            paddingVertical: 40,
                            paddingHorizontal: 20,
                        }}>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#111827',
                                marginBottom: 8,
                            }}>
                                No friends in roster
                            </Text>
                            <Text style={{
                                fontFamily: 'Inter_400Regular',
                                fontSize: 14,
                                color: '#6B7280',
                                textAlign: 'center',
                            }}>
                                Add friends from Availability to use roster invites
                            </Text>
                        </View>
                    )}
                    
                    {/* Phone Invites Section */}
                    {phoneInvites.length > 0 && phoneInvites.map((invite, index) => (
                        <View 
                            key={`phone-${index}`}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 16,
                                paddingHorizontal: 16,
                                borderBottomWidth: index < phoneInvites.length - 1 || orderedFriends.length > 0 ? 1 : 0,
                                borderBottomColor: '#F3F4F6',
                            }}
                        >
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: '#E5E7EB',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <Phone size={20} color="#6B7280" strokeWidth={2} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#111827',
                                }}>
                                    {invite.name || 'Unknown'}
                                </Text>
                                <Text style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 14,
                                    color: '#6B7280',
                                    marginTop: 2,
                                }}>
                                    {invite.phone}
                                </Text>
                            </View>
                        </View>
                    ))}
                    
                    {/* Add Phone Number Button */}
                    {onAddPhoneInvite && (
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 16,
                                paddingHorizontal: 16,
                                borderTopWidth: orderedFriends.length > 0 || phoneInvites.length > 0 ? 1 : 0,
                                borderTopColor: '#F3F4F6',
                                backgroundColor: showPhoneInput ? '#F9FAFB' : 'transparent',
                            }}
                            onPress={() => setShowPhoneInput(!showPhoneInput)}
                            activeOpacity={0.7}
                        >
                            <Plus size={20} color="#22C55E" strokeWidth={2.5} />
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#22C55E',
                                marginLeft: 8,
                            }}>
                                Invite by phone number
                            </Text>
                        </TouchableOpacity>
                    )}
                    
                    {/* Phone Input Form */}
                    {showPhoneInput && onAddPhoneInvite && (
                        <View style={{
                            padding: 16,
                            backgroundColor: '#F9FAFB',
                            borderTopWidth: 1,
                            borderTopColor: '#E5E7EB',
                        }}>
                            <TextInput
                                style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 16,
                                    color: '#111827',
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#E5E7EB',
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    marginBottom: 12,
                                }}
                                placeholder="Name (optional)"
                                placeholderTextColor="#9CA3AF"
                                value={phoneName}
                                onChangeText={setPhoneName}
                            />
                            <TextInput
                                style={{
                                    fontFamily: 'Inter_400Regular',
                                    fontSize: 16,
                                    color: '#111827',
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#E5E7EB',
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    marginBottom: 12,
                                }}
                                placeholder="Phone number (e.g., +15551234567)"
                                placeholderTextColor="#9CA3AF"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                            />
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        paddingVertical: 12,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#E5E7EB',
                                        backgroundColor: '#FFFFFF',
                                        alignItems: 'center',
                                    }}
                                    onPress={() => {
                                        setShowPhoneInput(false);
                                        setPhoneNumber("");
                                        setPhoneName("");
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 16,
                                        color: '#6B7280',
                                    }}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        paddingVertical: 12,
                                        borderRadius: 8,
                                        backgroundColor: '#22C55E',
                                        alignItems: 'center',
                                    }}
                                    onPress={() => {
                                        if (phoneNumber.trim()) {
                                            onAddPhoneInvite(phoneNumber.trim(), phoneName.trim() || phoneNumber.trim());
                                            setPhoneNumber("");
                                            setPhoneName("");
                                            setShowPhoneInput(false);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                    disabled={!phoneNumber.trim()}
                                >
                                    <Text style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 16,
                                        color: '#FFFFFF',
                                    }}>
                                        Add
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
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
                        paddingTop: 20,
                        paddingBottom: 40,
                        maxHeight: '90%',
                    }}>
                        {/* Header */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 20,
                            paddingBottom: 20,
                            borderBottomWidth: 1,
                            borderBottomColor: '#F3F4F6',
                        }}>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)} activeOpacity={0.7}>
                                <X size={24} color="#6B7280" strokeWidth={2} />
                            </TouchableOpacity>
                            <Text style={{
                                fontFamily: 'Inter_700Bold',
                                fontSize: 18,
                                color: '#111827',
                            }}>
                                Sort & Filter
                            </Text>
                            <TouchableOpacity 
                                onPress={() => setShowSortDropdown(!showSortDropdown)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 14,
                                    color: '#6B7280',
                                }}>
                                    Sort by
                                </Text>
                                <ChevronDown size={16} color="#6B7280" strokeWidth={2} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}>
                            {/* Sort Dropdown */}
                            {showSortDropdown && (
                                <View style={{
                                    backgroundColor: '#F9FAFB',
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 20,
                                }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 12,
                                    }}>
                                        <Text style={{
                                            fontFamily: 'Inter_600SemiBold',
                                            fontSize: 14,
                                            color: '#6B7280',
                                        }}>
                                            Sort by
                                        </Text>
                                        <TouchableOpacity onPress={() => setShowSortDropdown(false)}>
                                            <X size={18} color="#9CA3AF" strokeWidth={2} />
                                        </TouchableOpacity>
                                    </View>
                                    {SORT_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingVertical: 12,
                                                gap: 12,
                                            }}
                                            onPress={() => {
                                                setSelectedSort(option.value);
                                                setShowSortDropdown(false);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: 10,
                                                borderWidth: 2,
                                                borderColor: selectedSort === option.value ? '#22C55E' : '#D1D5DB',
                                                backgroundColor: selectedSort === option.value ? '#22C55E' : '#FFFFFF',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}>
                                                {selectedSort === option.value && (
                                                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                                                )}
                                            </View>
                                            <Text style={{
                                                fontFamily: 'Inter_500Medium',
                                                fontSize: 15,
                                                color: '#111827',
                                            }}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Club Membership */}
                            <View style={{ marginBottom: 24 }}>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 16,
                                }}>
                                    <Text style={{
                                        fontFamily: 'Inter_700Bold',
                                        fontSize: 16,
                                        color: '#111827',
                                    }}>
                                        Club Membership
                                    </Text>
                                    {selectedClubs.length > 0 && (
                                        <View style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: '#22C55E',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}>
                                            <Text style={{
                                                fontFamily: 'Inter_700Bold',
                                                fontSize: 12,
                                                color: '#FFFFFF',
                                            }}>
                                                {selectedClubs.length}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                }}>
                                    {availableClubs.length > 0 ? availableClubs.map((club) => (
                                        <TouchableOpacity
                                            key={club}
                                            style={{
                                                paddingVertical: 10,
                                                paddingHorizontal: 16,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: selectedClubs.includes(club) ? '#22C55E' : '#E5E7EB',
                                                backgroundColor: selectedClubs.includes(club) ? '#22C55E' : '#FFFFFF',
                                            }}
                                            onPress={() => toggleClub(club)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={{
                                                fontFamily: 'Inter_600SemiBold',
                                                fontSize: 14,
                                                color: selectedClubs.includes(club) ? '#FFFFFF' : '#6B7280',
                                            }}>
                                                {club}
                                            </Text>
                                        </TouchableOpacity>
                                    )) : (
                                        <Text style={{
                                            fontFamily: 'Inter_400Regular',
                                            fontSize: 14,
                                            color: '#9CA3AF',
                                            textAlign: 'center',
                                            paddingVertical: 20,
                                        }}>
                                            No club memberships found in roster
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Indicated Available Toggle */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 24,
                            }}>
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#111827',
                                }}>
                                    Indicated available
                                </Text>
                                <TouchableOpacity
                                    style={{
                                        width: 51,
                                        height: 31,
                                        borderRadius: 16,
                                        backgroundColor: indicatedAvailable ? '#22C55E' : '#D1D5DB',
                                        justifyContent: 'center',
                                        paddingHorizontal: 2,
                                    }}
                                    onPress={() => setIndicatedAvailable(!indicatedAvailable)}
                                    activeOpacity={0.8}
                                >
                                    <View style={{
                                        width: 27,
                                        height: 27,
                                        borderRadius: 14,
                                        backgroundColor: '#FFFFFF',
                                        alignSelf: indicatedAvailable ? 'flex-end' : 'flex-start',
                                    }} />
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={{
                            flexDirection: 'row',
                            gap: 12,
                            paddingHorizontal: 20,
                            paddingTop: 20,
                        }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: '#E5E7EB',
                                    backgroundColor: '#FFFFFF',
                                    alignItems: 'center',
                                }}
                                onPress={saveSearch}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#6B7280',
                                }}>
                                    Save search
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    backgroundColor: '#22C55E',
                                    alignItems: 'center',
                                }}
                                onPress={applyFilters}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_600SemiBold',
                                    fontSize: 16,
                                    color: '#FFFFFF',
                                }}>
                                    See results
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const rosterStyles = StyleSheet.create({
    sectionTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 15,
        color: FIGMA_YOUR_PLAYERS.nameColor,
        marginBottom: 12,
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderRadius: FIGMA_YOUR_PLAYERS.inputBorderRadius,
        borderWidth: 1,
        borderColor: FIGMA_YOUR_PLAYERS.inputBorderColor,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontFamily: "Inter_400Regular",
        fontSize: 16,
        color: "#111827",
        padding: 0,
    },
});
