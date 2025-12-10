import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, fontSize, fontWeight } from "../theme";
import { COUNTRY_CODES } from "../constants/countryCodes";
import type { CountryCode } from "../types";

const { height } = Dimensions.get("window");

interface CountryCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: CountryCode) => void;
  selectedCountry?: CountryCode;
}

interface Styles {
  overlay: ViewStyle;
  content: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  closeButton: ViewStyle;
  searchContainer: ViewStyle;
  searchInput: TextStyle;
  list: ViewStyle;
  countryItem: ViewStyle;
  selectedItem: ViewStyle;
  flag: TextStyle;
  countryName: TextStyle;
  countryCode: TextStyle;
  noResults: ViewStyle;
  noResultsText: TextStyle;
}

/**
 * Country Code Picker Modal
 * Reusable component for selecting country codes
 */
export const CountryCodeModal: React.FC<CountryCodeModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedCountry,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredCountries = useMemo((): CountryCode[] => {
    if (!searchQuery) return COUNTRY_CODES;
    const query = searchQuery.toLowerCase();
    return COUNTRY_CODES.filter(
      (country) =>
        country.country.toLowerCase().includes(query) ||
        country.code.includes(searchQuery)
    );
  }, [searchQuery]);

  const handleSelect = (country: CountryCode): void => {
    onSelect(country);
    setSearchQuery("");
    onClose();
  };

  const handleClose = (): void => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Country</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Country List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => (
                <TouchableOpacity
                  key={`${country.code}-${index}`}
                  style={[
                    styles.countryItem,
                    selectedCountry?.code === country.code &&
                      styles.selectedItem,
                  ]}
                  onPress={() => handleSelect(country)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.flag}>{country.flag}</Text>
                  <Text style={styles.countryName}>{country.country}</Text>
                  <Text style={styles.countryCode}>{country.code}</Text>
                  {selectedCountry?.code === country.code && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResults}>
                <Ionicons name="search" size={48} color={colors.border} />
                <Text style={styles.noResultsText}>No country found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create<Styles>({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    height: height * 0.75,
    paddingBottom: Platform.OS === "ios" ? spacing.xl : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 50,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  list: {
    flex: 1,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  selectedItem: {
    backgroundColor: colors.primaryLight,
  },
  flag: {
    fontSize: 28,
    marginRight: spacing.lg,
  },
  countryName: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium as TextStyle["fontWeight"],
  },
  countryCode: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as TextStyle["fontWeight"],
    color: colors.primary,
    marginRight: spacing.sm,
  },
  noResults: {
    padding: spacing.massive,
    alignItems: "center",
  },
  noResultsText: {
    marginTop: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.textTertiary,
  },
});

export default CountryCodeModal;
