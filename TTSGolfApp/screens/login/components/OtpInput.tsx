import React, { memo, MutableRefObject } from "react";
import { View, Text, TouchableOpacity, TextInput as RNTextInput, StyleSheet } from "react-native";
import { LOGIN_COLORS } from "../constants";

interface Props {
    value: string;
    inputRefs: MutableRefObject<(RNTextInput | null)[]>;
    hasError: boolean;
    error?: string | null;
    resendTimer: number;
    loading: boolean;
    onChange: (text: string, index: number) => void;
    onKeyPress: (key: string, index: number) => void;
    onResend: () => void;
}

const OtpInput = memo(({
    value,
    inputRefs,
    hasError,
    error,
    resendTimer,
    loading,
    onChange,
    onKeyPress,
    onResend,
}: Props) => (
    <View style={styles.container}>
        <View style={styles.otpContainer}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
                <View
                    key={index}
                    style={[
                        styles.otpBox,
                        value[index] && styles.otpBoxFilled,
                        hasError && styles.otpBoxError,
                    ]}
                >
                    <RNTextInput
                        ref={(ref) => {
                            inputRefs.current[index] = ref;
                        }}
                        style={[styles.otpInput, hasError && styles.otpInputError]}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={value[index] || ""}
                        onChangeText={(text) => onChange(text, index)}
                        onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, index)}
                        autoFocus={index === 0}
                    />
                </View>
            ))}
        </View>

        {hasError && error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
            style={styles.resendButton}
            onPress={onResend}
            disabled={resendTimer > 0 || loading}
        >
            <Text style={[styles.resendText, (resendTimer > 0 || loading) && styles.resendTextDisabled]}>
                {resendTimer > 0 ? `Resend link in ${resendTimer}s` : "Resend link"}
            </Text>
        </TouchableOpacity>
    </View>
));

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    otpContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    otpBox: {
        flex: 1,
        height: 56,
        backgroundColor: LOGIN_COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: LOGIN_COLORS.border,
        justifyContent: "center",
        alignItems: "center",
    },
    otpBoxFilled: {
        borderColor: LOGIN_COLORS.primary,
        backgroundColor: LOGIN_COLORS.primaryLight,
    },
    otpBoxError: {
        borderColor: LOGIN_COLORS.error,
        backgroundColor: LOGIN_COLORS.errorContainer,
    },
    otpInput: {
        width: "100%",
        height: "100%",
        fontSize: 24,
        fontWeight: "600",
        color: LOGIN_COLORS.textMain,
        textAlign: "center",
    },
    otpInputError: {
        color: LOGIN_COLORS.error,
    },
    errorText: {
        fontSize: 13,
        color: LOGIN_COLORS.error,
        marginTop: 8,
        marginLeft: 4,
    },
    resendButton: {
        alignSelf: "center",
        marginTop: 24,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    resendText: {
        fontSize: 14,
        fontWeight: "500",
        color: LOGIN_COLORS.primary,
    },
    resendTextDisabled: {
        color: LOGIN_COLORS.textSub,
    },
});

export default OtpInput;
