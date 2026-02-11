import React, { memo, RefObject } from "react";
import { View, Text, TouchableOpacity, TextInput as RNTextInput, StyleSheet } from "react-native";
import { X } from "lucide-react-native";
import { LOGIN_COLORS } from "../constants";
import { formatPhoneDisplay } from "../utils";
import CountryPicker, { Country, COUNTRIES } from "../../../components/CountryPicker";

interface Props {
    value: string;
    onChange: (text: string) => void;
    inputRef: RefObject<RNTextInput>;
    focused: boolean;
    onFocus: () => void;
    onBlur: () => void;
    hasError: boolean;
    onClear: () => void;
    selectedCountry?: Country;
    onCountryChange?: (country: Country) => void;
    /** When set, shows this message instead of generic "Please enter a valid phone number" */
    errorMessage?: string;
}

const PhoneInput = memo(({
    value,
    onChange,
    inputRef,
    focused,
    onFocus,
    onBlur,
    hasError,
    onClear,
    selectedCountry = COUNTRIES[0], // Default to US
    onCountryChange,
    errorMessage,
}: Props) => (
    <View style={styles.container}>
        <View
            style={[
                styles.inputContainer,
                focused && styles.inputContainerFocused,
                hasError && styles.inputContainerError,
            ]}
        >
            <CountryPicker
                selectedCountry={selectedCountry}
                onSelect={onCountryChange || (() => { })}
            />
            <RNTextInput
                ref={inputRef}
                style={[styles.input, hasError && styles.inputError]}
                placeholder={selectedCountry.placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={value}
                onChangeText={(text) => onChange(text.replace(/\D/g, ""))}
                maxLength={selectedCountry.maxLength}
                onFocus={onFocus}
                onBlur={onBlur}
            />
            {value.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={onClear}>
                    <View style={styles.clearButtonInner}>
                        <X size={12} color="#6B7280" strokeWidth={2} />
                    </View>
                </TouchableOpacity>
            )}
        </View>
        {hasError && (
            <Text style={styles.errorText}>
                {errorMessage || "Please enter a valid phone number"}
            </Text>
        )}
    </View>
));

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        height: 56,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: 16,
    },
    inputContainerFocused: {
        borderColor: "#16A34A",
        borderWidth: 2,
    },
    inputContainerError: {
        borderColor: "#EF4444",
        backgroundColor: "#FEF2F2",
    },
    input: {
        flex: 1,
        height: "100%",
        fontSize: 16,
        color: "#111827",
        fontWeight: "400",
    },
    inputError: {
        color: "#EF4444",
    },
    clearButton: {
        padding: 4,
    },
    clearButtonInner: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        fontSize: 13,
        color: "#EF4444",
        marginTop: 8,
        marginLeft: 4,
    },
});

export default PhoneInput;
