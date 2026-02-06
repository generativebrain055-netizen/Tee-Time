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
                placeholderTextColor={LOGIN_COLORS.textPlaceholder}
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
                        <X size={12} color={LOGIN_COLORS.textSub} strokeWidth={2} />
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
        backgroundColor: LOGIN_COLORS.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: LOGIN_COLORS.border,
        paddingHorizontal: 16,
    },
    inputContainerFocused: {
        borderColor: LOGIN_COLORS.textMain,
        borderWidth: 1.5,
    },
    inputContainerError: {
        borderColor: LOGIN_COLORS.error,
        backgroundColor: LOGIN_COLORS.errorLight,
    },
    input: {
        flex: 1,
        height: "100%",
        fontSize: 16,
        color: LOGIN_COLORS.textMain,
        fontWeight: "400",
    },
    inputError: {
        color: LOGIN_COLORS.error,
    },
    clearButton: {
        padding: 4,
    },
    clearButtonInner: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: LOGIN_COLORS.border,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        fontSize: 13,
        color: LOGIN_COLORS.error,
        marginTop: 8,
        marginLeft: 4,
    },
});

export default PhoneInput;
