/**
 * Login flow state and logic hook
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Animated, Keyboard, TextInput as RNTextInput } from "react-native";
import { useAuth } from "../../../hooks";
import { LoginStep } from "../constants";
import { toE164, isValidPhone, isValidOtp } from "../utils";

export const useLoginFlow = (navigation: any) => {
    // State
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [currentStep, setCurrentStep] = useState<LoginStep>("phone");
    const [resendTimer, setResendTimer] = useState(0);
    const [inputFocused, setInputFocused] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Refs
    const phoneInputRef = useRef<RNTextInput>(null);
    const otpInputRefs = useRef<(RNTextInput | null)[]>([]);

    // Auth hook
    const { requestOtp, verifyOtp, loading, error, clearMessages } = useAuth();

    // Animations
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Derived values
    const e164Phone = toE164(phoneNumber);
    const isPhoneValid = isValidPhone(phoneNumber);
    const isOtpValid = isValidOtp(otpCode);

    // Resend timer effect
    useEffect(() => {
        if (!resendTimer) return;
        const timerId = setInterval(() => {
            setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timerId);
    }, [resendTimer]);

    // Clear error when typing
    useEffect(() => {
        if (phoneNumber || otpCode) setHasError(false);
    }, [phoneNumber, otpCode]);

    // Animate step transitions
    const animateStepChange = useCallback((callback: () => void) => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: -50, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            callback();
            slideAnim.setValue(50);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        });
    }, [fadeAnim, slideAnim]);

    // Handlers
    const handleRequestOtp = useCallback(async (isResend = false) => {
        if (!isPhoneValid || loading) {
            setHasError(true);
            return;
        }

        const result = await requestOtp(e164Phone, "login");
        if (result.success) {
            if (!isResend) animateStepChange(() => setCurrentStep("otp"));
            setOtpCode("");
            setResendTimer(result.resendAfterSeconds || 30);
        } else {
            setHasError(true);
        }
    }, [isPhoneValid, loading, e164Phone, requestOtp, animateStepChange]);

    const handleVerifyOtp = useCallback(async () => {
        if (!isOtpValid || loading) return;

        const result = await verifyOtp(e164Phone, otpCode.trim());
        if (result.success) {
            setTimeout(() => {
                navigation?.navigate("Home", { user: result.user });
            }, 500);
        } else {
            setHasError(true);
        }
    }, [isOtpValid, loading, e164Phone, otpCode, verifyOtp, navigation]);

    const handlePrimaryAction = useCallback(() => {
        Keyboard.dismiss();
        if (currentStep === "phone") handleRequestOtp();
        else if (currentStep === "otp") handleVerifyOtp();
    }, [currentStep, handleRequestOtp, handleVerifyOtp]);

    const handleResendOtp = useCallback(() => {
        if (resendTimer > 0 || loading) return;
        handleRequestOtp(true);
    }, [resendTimer, loading, handleRequestOtp]);

    const handleBack = useCallback(() => {
        if (currentStep === "otp") {
            animateStepChange(() => {
                setCurrentStep("phone");
                clearMessages();
                setOtpCode("");
                setHasError(false);
            });
        } else {
            navigation.goBack();
        }
    }, [currentStep, animateStepChange, clearMessages, navigation]);

    const clearPhoneInput = useCallback(() => {
        setPhoneNumber("");
        setHasError(false);
        phoneInputRef.current?.focus();
    }, []);

    const handleOtpChange = useCallback((text: string, index: number) => {
        const newOtp = otpCode.split("");
        newOtp[index] = text;
        const newOtpString = newOtp.join("").slice(0, 6);
        setOtpCode(newOtpString);

        if (text && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
    }, [otpCode]);

    const handleOtpKeyPress = useCallback((key: string, index: number) => {
        if (key === "Backspace" && !otpCode[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    }, [otpCode]);

    const isButtonDisabled = loading || (currentStep === "phone" ? !isPhoneValid : !isOtpValid);

    return {
        // State
        phoneNumber,
        setPhoneNumber,
        otpCode,
        currentStep,
        resendTimer,
        inputFocused,
        setInputFocused,
        hasError,
        loading,
        error,
        isButtonDisabled,
        // Refs
        phoneInputRef,
        otpInputRefs,
        // Animations
        fadeAnim,
        slideAnim,
        // Handlers
        handlePrimaryAction,
        handleResendOtp,
        handleBack,
        clearPhoneInput,
        handleOtpChange,
        handleOtpKeyPress,
    };
};
