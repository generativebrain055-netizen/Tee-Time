import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    TextInput,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';

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

export default function CountryPicker({ selectedCountry, onSelect, disabled }: CountryPickerProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCountries = COUNTRIES.filter(
        (country) =>
            country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            country.dialCode.includes(searchQuery) ||
            country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (country: Country) => {
        onSelect(country);
        setModalVisible(false);
        setSearchQuery('');
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.trigger, disabled && styles.triggerDisabled]}
                onPress={() => !disabled && setModalVisible(true)}
                disabled={disabled}
            >
                <Text style={styles.flag}>{selectedCountry.flag}</Text>
                <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
                <ChevronDown size={16} color="#6B7280" />
            </TouchableOpacity>

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
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                style={styles.modalContainer}
                            >
                                <View style={styles.modalContent}>
                                    {/* Drag Handle */}
                                    <View style={styles.dragHandle} />

                                    {/* Header */}
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>Select Country</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setModalVisible(false);
                                                setSearchQuery('');
                                            }}
                                            style={styles.closeButton}
                                        >
                                            <X size={24} color="#1F2937" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Search */}
                                    <View style={styles.searchContainer}>
                                        <Search size={20} color="#6B7280" style={styles.searchIcon} />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search country or code..."
                                            placeholderTextColor="#9CA3AF"
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            returnKeyType="search"
                                        />
                                        {searchQuery.length > 0 && (
                                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                                <X size={20} color="#6B7280" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Results Count */}
                                    {searchQuery.length > 0 && (
                                        <View style={styles.resultsCount}>
                                            <Text style={styles.resultsCountText}>
                                                {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'} found
                                            </Text>
                                        </View>
                                    )}

                                    {/* Country List */}
                                    <FlatList
                                        data={filteredCountries}
                                        keyExtractor={(item) => item.code}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[
                                                    styles.countryItem,
                                                    item.code === selectedCountry.code && styles.countryItemSelected,
                                                ]}
                                                onPress={() => handleSelect(item)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.countryFlag}>{item.flag}</Text>
                                                <View style={styles.countryInfo}>
                                                    <Text style={styles.countryName}>{item.name}</Text>
                                                    <Text style={styles.countryDialCode}>{item.dialCode}</Text>
                                                </View>
                                                {item.code === selectedCountry.code && (
                                                    <View style={styles.checkmark}>
                                                        <Text style={styles.checkmarkText}>✓</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                                        showsVerticalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled"
                                        contentContainerStyle={styles.listContent}
                                        ListEmptyComponent={
                                            <View style={styles.emptyState}>
                                                <Text style={styles.emptyStateText}>No countries found</Text>
                                                <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
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

const styles = StyleSheet.create({
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        marginRight: 12,
        gap: 6,
    },
    triggerDisabled: {
        opacity: 0.5,
    },
    flag: {
        fontSize: 24,
        lineHeight: 24,
    },
    dialCode: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        maxHeight: '85%',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: 600, // Fixed height
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#D1D5DB',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        letterSpacing: -0.5,
    },
    closeButton: {
        padding: 4,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        padding: 0,
    },
    clearButton: {
        padding: 4,
    },
    resultsCount: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    resultsCountText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    listContent: {
        flexGrow: 1,
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
    },
    countryItemSelected: {
        backgroundColor: '#EFF6FF',
    },
    countryFlag: {
        fontSize: 28,
        marginRight: 16,
        width: 32,
        textAlign: 'center',
    },
    countryInfo: {
        flex: 1,
    },
    countryName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 3,
    },
    countryDialCode: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '400',
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 68,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
    },
});

export { COUNTRIES };
