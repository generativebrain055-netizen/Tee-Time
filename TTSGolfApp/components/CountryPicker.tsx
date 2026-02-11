import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    Keyboard,
    TouchableWithoutFeedback,
    Dimensions,
} from 'react-native';
import { ChevronDown, Search, X, Check, Globe } from 'lucide-react-native';

export interface Country {
    code: string;
    name: string;
    dialCode: string;
    flag: string;
    minLength: number;
    maxLength: number;
    placeholder: string;
}

const COUNTRIES: Country[] = [
    // North America
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', minLength: 10, maxLength: 10, placeholder: '201 555 0123' },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', minLength: 10, maxLength: 10, placeholder: '204 555 0123' },
    { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', minLength: 10, maxLength: 10, placeholder: '222 123 4567' },

    // South Asia
    { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', minLength: 10, maxLength: 10, placeholder: '300 1234567' },
    { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', minLength: 10, maxLength: 10, placeholder: '81234 56789' },
    { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', minLength: 10, maxLength: 10, placeholder: '1812 345678' },
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', minLength: 9, maxLength: 9, placeholder: '71 234 5678' },
    { code: 'AF', name: 'Afghanistan', dialCode: '+93', flag: '🇦🇫', minLength: 9, maxLength: 9, placeholder: '70 123 4567' },
    { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', minLength: 10, maxLength: 10, placeholder: '984 1234567' },
    { code: 'MV', name: 'Maldives', dialCode: '+960', flag: '🇲🇻', minLength: 7, maxLength: 7, placeholder: '771 2345' },

    // Middle East
    { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', minLength: 9, maxLength: 9, placeholder: '50 123 4567' },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', minLength: 9, maxLength: 9, placeholder: '50 123 4567' },
    { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', minLength: 8, maxLength: 8, placeholder: '3312 3456' },
    { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', minLength: 8, maxLength: 8, placeholder: '5012 3456' },
    { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', minLength: 8, maxLength: 8, placeholder: '3600 1234' },
    { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', minLength: 8, maxLength: 8, placeholder: '9212 3456' },
    { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', minLength: 10, maxLength: 10, placeholder: '501 234 5678' },
    { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱', minLength: 9, maxLength: 9, placeholder: '50 123 4567' },
    { code: 'IQ', name: 'Iraq', dialCode: '+964', flag: '🇮🇶', minLength: 10, maxLength: 10, placeholder: '791 234 5678' },
    { code: 'IR', name: 'Iran', dialCode: '+98', flag: '🇮🇷', minLength: 10, maxLength: 10, placeholder: '912 345 6789' },
    { code: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴', minLength: 9, maxLength: 9, placeholder: '79 123 4567' },
    { code: 'LB', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧', minLength: 7, maxLength: 8, placeholder: '71 123 456' },
    { code: 'SY', name: 'Syria', dialCode: '+963', flag: '🇸🇾', minLength: 9, maxLength: 9, placeholder: '944 567 890' },
    { code: 'YE', name: 'Yemen', dialCode: '+967', flag: '🇾🇪', minLength: 9, maxLength: 9, placeholder: '712 345 678' },

    // Europe
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', minLength: 10, maxLength: 10, placeholder: '7400 123456' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', minLength: 10, maxLength: 11, placeholder: '151 23456789' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', minLength: 9, maxLength: 9, placeholder: '6 12 34 56 78' },
    { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', minLength: 9, maxLength: 10, placeholder: '312 345 6789' },
    { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', minLength: 9, maxLength: 9, placeholder: '612 34 56 78' },
    { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', minLength: 9, maxLength: 9, placeholder: '6 12345678' },
    { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪', minLength: 9, maxLength: 9, placeholder: '470 12 34 56' },
    { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', minLength: 9, maxLength: 9, placeholder: '78 123 45 67' },
    { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹', minLength: 10, maxLength: 11, placeholder: '664 123456' },
    { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', minLength: 9, maxLength: 9, placeholder: '70 123 45 67' },
    { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', minLength: 8, maxLength: 8, placeholder: '406 12 345' },
    { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', minLength: 8, maxLength: 8, placeholder: '32 12 34 56' },
    { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮', minLength: 9, maxLength: 10, placeholder: '41 2345678' },
    { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱', minLength: 9, maxLength: 9, placeholder: '512 345 678' },
    { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷', minLength: 10, maxLength: 10, placeholder: '691 234 5678' },
    { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', minLength: 9, maxLength: 9, placeholder: '912 345 678' },
    { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', minLength: 9, maxLength: 9, placeholder: '85 123 4567' },
    { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺', minLength: 10, maxLength: 10, placeholder: '912 345 6789' },
    { code: 'UA', name: 'Ukraine', dialCode: '+380', flag: '🇺🇦', minLength: 9, maxLength: 9, placeholder: '50 123 4567' },
    { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿', minLength: 9, maxLength: 9, placeholder: '601 123 456' },
    { code: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴', minLength: 9, maxLength: 9, placeholder: '712 345 678' },
    { code: 'HU', name: 'Hungary', dialCode: '+36', flag: '🇭🇺', minLength: 9, maxLength: 9, placeholder: '20 123 4567' },

    // Asia Pacific
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', minLength: 9, maxLength: 9, placeholder: '412 345 678' },
    { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', minLength: 9, maxLength: 10, placeholder: '21 123 4567' },
    { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', minLength: 10, maxLength: 10, placeholder: '90 1234 5678' },
    { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', minLength: 11, maxLength: 11, placeholder: '131 2345 6789' },
    { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', minLength: 9, maxLength: 10, placeholder: '10 1234 5678' },
    { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', minLength: 8, maxLength: 8, placeholder: '8123 4567' },
    { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', minLength: 9, maxLength: 10, placeholder: '12 345 6789' },
    { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', minLength: 9, maxLength: 9, placeholder: '81 234 5678' },
    { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', minLength: 10, maxLength: 10, placeholder: '905 123 4567' },
    { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', minLength: 9, maxLength: 11, placeholder: '812 3456 7890' },
    { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', minLength: 9, maxLength: 10, placeholder: '91 234 56 78' },
    { code: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲', minLength: 9, maxLength: 10, placeholder: '9 123 456 789' },
    { code: 'KH', name: 'Cambodia', dialCode: '+855', flag: '🇰🇭', minLength: 8, maxLength: 9, placeholder: '12 345 678' },
    { code: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦', minLength: 9, maxLength: 10, placeholder: '20 1234 5678' },

    // South America
    { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', minLength: 10, maxLength: 11, placeholder: '11 91234 5678' },
    { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', minLength: 10, maxLength: 10, placeholder: '11 2345 6789' },
    { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', minLength: 9, maxLength: 9, placeholder: '9 1234 5678' },
    { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴', minLength: 10, maxLength: 10, placeholder: '321 1234567' },
    { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪', minLength: 9, maxLength: 9, placeholder: '912 345 678' },
    { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪', minLength: 10, maxLength: 10, placeholder: '412 1234567' },
    { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨', minLength: 9, maxLength: 9, placeholder: '99 123 4567' },
    { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾', minLength: 8, maxLength: 8, placeholder: '94 123 456' },

    // Africa
    { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', minLength: 9, maxLength: 9, placeholder: '71 123 4567' },
    { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', minLength: 10, maxLength: 10, placeholder: '802 123 4567' },
    { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', minLength: 10, maxLength: 10, placeholder: '100 123 4567' },
    { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', minLength: 9, maxLength: 9, placeholder: '712 123456' },
    { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭', minLength: 9, maxLength: 9, placeholder: '23 123 4567' },
    { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦', minLength: 9, maxLength: 9, placeholder: '612 345678' },
    { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿', minLength: 9, maxLength: 9, placeholder: '551 234 567' },
    { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳', minLength: 8, maxLength: 8, placeholder: '20 123 456' },
    { code: 'LY', name: 'Libya', dialCode: '+218', flag: '🇱🇾', minLength: 9, maxLength: 10, placeholder: '91 2345678' },
    { code: 'SD', name: 'Sudan', dialCode: '+249', flag: '🇸🇩', minLength: 9, maxLength: 9, placeholder: '91 123 4567' },
    { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹', minLength: 9, maxLength: 9, placeholder: '91 123 4567' },
    { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬', minLength: 9, maxLength: 9, placeholder: '712 345678' },
    { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿', minLength: 9, maxLength: 9, placeholder: '621 234 567' },
    { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼', minLength: 9, maxLength: 9, placeholder: '71 123 4567' },
];

interface CountryPickerProps {
    selectedCountry: Country;
    onSelect: (country: Country) => void;
    disabled?: boolean;
}

/**
 * Strips leading zero from phone digits.
 * Many countries use a leading 0 in domestic format (e.g. Pakistan 03001234567)
 * that must be removed for international E.164 format.
 */
export const stripLeadingZero = (digits: string): string => {
    return digits.startsWith('0') ? digits.slice(1) : digits;
};

export default function CountryPicker({ selectedCountry, onSelect, disabled }: CountryPickerProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Group countries by region for section headers
    const REGION_ORDER = [
        { key: 'popular', label: 'Popular', codes: ['US', 'CA', 'GB', 'AU', 'IN', 'PK'] },
    ];

    const filteredCountries = useMemo(() => {
        return COUNTRIES.filter(
            (country) =>
                country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                country.dialCode.includes(searchQuery) ||
                country.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    // Show popular countries at top when not searching
    const displayCountries = useMemo(() => {
        if (searchQuery.length > 0) return filteredCountries;
        
        const popularCodes = ['US', 'CA', 'GB', 'AU', 'IN', 'PK', 'AE', 'SA'];
        const popular = COUNTRIES.filter(c => popularCodes.includes(c.code));
        const rest = COUNTRIES.filter(c => !popularCodes.includes(c.code));
        return [...popular, ...rest];
    }, [searchQuery, filteredCountries]);

    const handleSelect = (country: Country) => {
        onSelect(country);
        setModalVisible(false);
        setSearchQuery('');
    };

    return (
        <>
            {/* Trigger Button - clean pill design */}
            <TouchableOpacity
                style={[
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRightWidth: 1,
                        borderRightColor: '#E5E7EB',
                        marginRight: 12,
                        gap: 6,
                    },
                    disabled && { opacity: 0.4 },
                ]}
                onPress={() => !disabled && setModalVisible(true)}
                disabled={disabled}
                activeOpacity={0.7}
            >
                <Text style={{ fontSize: 22, lineHeight: 26 }}>{selectedCountry.flag}</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937', letterSpacing: -0.2 }}>
                    {selectedCountry.dialCode}
                </Text>
                <ChevronDown size={14} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setModalVisible(false);
                    setSearchQuery('');
                }}
            >
                <TouchableWithoutFeedback onPress={() => {
                    Keyboard.dismiss();
                    setModalVisible(false);
                    setSearchQuery('');
                }}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                style={{ maxHeight: '85%' }}
                            >
                                <View 
                                    style={[
                                        {
                                            backgroundColor: '#FFFFFF',
                                            borderTopLeftRadius: 24,
                                            borderTopRightRadius: 24,
                                            height: Dimensions.get('window').height * 0.7,
                                        },
                                        Platform.OS === 'ios' ? { paddingBottom: 34 } : { paddingBottom: 16 },
                                        {
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: -8 },
                                            shadowOpacity: 0.12,
                                            shadowRadius: 16,
                                            elevation: 12,
                                        },
                                    ]}
                                >
                                    {/* Drag Handle */}
                                    <View style={{
                                        width: 36, height: 4, backgroundColor: '#D1D5DB',
                                        borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6,
                                    }} />

                                    {/* Header */}
                                    <View style={{
                                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
                                    }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <View style={{
                                                width: 36, height: 36, borderRadius: 18,
                                                backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
                                            }}>
                                                <Globe size={18} color="#3B82F6" />
                                            </View>
                                            <Text style={{
                                                fontSize: 18, fontWeight: '700', color: '#111827', letterSpacing: -0.3,
                                            }}>
                                                Select Country
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setModalVisible(false);
                                                setSearchQuery('');
                                            }}
                                            style={{
                                                width: 32, height: 32, borderRadius: 16,
                                                backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
                                            }}
                                        >
                                            <X size={18} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Search Input */}
                                    <View style={{
                                        flexDirection: 'row', alignItems: 'center',
                                        backgroundColor: '#F9FAFB', borderRadius: 14,
                                        paddingHorizontal: 14, height: 46,
                                        marginHorizontal: 20, marginBottom: 12,
                                        borderWidth: 1, borderColor: '#E5E7EB',
                                    }}>
                                        <Search size={18} color="#9CA3AF" />
                                        <TextInput
                                            style={{
                                                flex: 1, fontSize: 15, color: '#1F2937',
                                                paddingVertical: 0, paddingHorizontal: 10,
                                            }}
                                            placeholder="Search country or dial code..."
                                            placeholderTextColor="#9CA3AF"
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            returnKeyType="search"
                                        />
                                        {searchQuery.length > 0 && (
                                            <TouchableOpacity
                                                onPress={() => setSearchQuery('')}
                                                style={{
                                                    width: 24, height: 24, borderRadius: 12,
                                                    backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center',
                                                }}
                                            >
                                                <X size={12} color="#6B7280" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Results Count */}
                                    {searchQuery.length > 0 && (
                                        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                {filteredCountries.length} {filteredCountries.length === 1 ? 'result' : 'results'}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Section label for popular */}
                                    {searchQuery.length === 0 && (
                                        <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                                Popular
                                            </Text>
                                        </View>
                                    )}

                                    {/* Country List */}
                                    <FlatList
                                        data={displayCountries}
                                        keyExtractor={(item) => item.code}
                                        renderItem={({ item, index }) => {
                                            const isSelected = item.code === selectedCountry.code;
                                            const isPopular = searchQuery.length === 0 && index < 8;
                                            const showAllHeader = searchQuery.length === 0 && index === 8;

                                            return (
                                                <>
                                                    {showAllHeader && (
                                                        <View style={{
                                                            paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6,
                                                            borderTopWidth: 1, borderTopColor: '#F3F4F6',
                                                        }}>
                                                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                                                All Countries
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <TouchableOpacity
                                                        style={[
                                                            {
                                                                flexDirection: 'row', alignItems: 'center',
                                                                paddingHorizontal: 20, paddingVertical: 13,
                                                                backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                                            },
                                                        ]}
                                                        onPress={() => handleSelect(item)}
                                                        activeOpacity={0.6}
                                                    >
                                                        <Text style={{ fontSize: 28, width: 38, textAlign: 'center' }}>
                                                            {item.flag}
                                                        </Text>
                                                        <View style={{ flex: 1, marginLeft: 14 }}>
                                                            <Text style={{
                                                                fontSize: 15, fontWeight: isSelected ? '700' : '500',
                                                                color: isSelected ? '#2563EB' : '#111827',
                                                            }}>
                                                                {item.name}
                                                            </Text>
                                                            <Text style={{
                                                                fontSize: 13, color: isSelected ? '#60A5FA' : '#9CA3AF',
                                                                marginTop: 1,
                                                            }}>
                                                                {item.dialCode}
                                                            </Text>
                                                        </View>
                                                        {isSelected && (
                                                            <View style={{
                                                                width: 24, height: 24, borderRadius: 12,
                                                                backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center',
                                                            }}>
                                                                <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                                            </View>
                                                        )}
                                                    </TouchableOpacity>
                                                </>
                                            );
                                        }}
                                        ItemSeparatorComponent={() => (
                                            <View style={{ height: 1, backgroundColor: '#F9FAFB', marginLeft: 72 }} />
                                        )}
                                        showsVerticalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled"
                                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                                        ListEmptyComponent={
                                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
                                                <Globe size={40} color="#D1D5DB" />
                                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 }}>
                                                    No countries found
                                                </Text>
                                                <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 4 }}>
                                                    Try a different search term
                                                </Text>
                                            </View>
                                        }
                                    />
                                </View>
                            </KeyboardAvoidingView>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
}

export { COUNTRIES };
