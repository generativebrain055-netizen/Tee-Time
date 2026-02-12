/**
 * Login flow state and logic hook
 * Uses magic link (not OTP) for phone sign-in - link sent via SMS, user taps to verify
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Animated, Keyboard, TextInput as RNTextInput } from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestSmsMagicLinkForLogin, verifySmsMagicLink } from "../../../utils/smsMagicLink";
import { LoginStep } from "../constants";
import { Country, COUNTRIES } from "../../../components/CountryPicker";
import { logger } from "../../../utils/logger";

export const useLoginFlow = (navigation: any) => {
    // State
    const [phoneNumber, setPhoneNumber] = useState("");
    const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default to US
    const [currentStep, setCurrentStep] = useState<LoginStep>("phone");
    const [resendTimer, setResendTimer] = useState(0);
    const [inputFocused, setInputFocused] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Refs
    const phoneInputRef = useRef<RNTextInput>(null);

    // Animations
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Derived values - combine country code with phone number
    const fullPhoneNumber = `${selectedCountry.dialCode}${phoneNumber}`;
    const isPhoneValid = phoneNumber.length >= selectedCountry.minLength && phoneNumber.length <= selectedCountry.maxLength;

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
        if (phoneNumber) setHasError(false);
    }, [phoneNumber]);

    // Deep link listener - when user taps magic link, verify and navigate to Home
    const handleMagicLinkUrl = useCallback(
        async (url: string) => {
            if (!url.includes("auth/magic-link") || !url.includes("token=")) return;
            try {
                const parsed = Linking.parse(url);
                const tokenRaw = parsed.queryParams?.token;
                const token = typeof tokenRaw === "string" ? tokenRaw : Array.isArray(tokenRaw) ? tokenRaw[0] : null;
                if (!token || typeof token !== "string") {
                    logger.warn("[LoginFlow] Invalid magic link token format", { url });
                    return;
                }

                logger.debug("[LoginFlow] Verifying magic link token");
                setLoading(true);
                const result = await verifySmsMagicLink(token);
                setLoading(false);

                if (result.success && result.accessToken && result.refreshToken && result.user) {
                    logger.info("[LoginFlow] Magic link verified successfully, saving session");
                    await AsyncStorage.setItem("accessToken", result.accessToken);
                    await AsyncStorage.setItem("refreshToken", result.refreshToken);
                    await AsyncStorage.setItem("user", JSON.stringify(result.user));
                    navigation?.navigate("Home", { user: result.user });
                } else if (!result.success) {
                    logger.error("[LoginFlow] Magic link verification failed", { error: result.error });
                    setHasError(true);
                    setError(result.error || "Verification failed.");
                }
            } catch (err) {
                logger.error("[LoginFlow] Error verifying magic link", err);
                setLoading(false);
                setHasError(true);
                setError(err instanceof Error ? err.message : "Verification failed.");
            }
        },
        [navigation]
    );

    useEffect(() => {
        const sub = Linking.addEventListener("url", ({ url }) => handleMagicLinkUrl(url));
        return () => sub.remove();
    }, [handleMagicLinkUrl]);

    useEffect(() => {
        Linking.getInitialURL().then((url) => {
            if (url) handleMagicLinkUrl(url);
        });
    }, [handleMagicLinkUrl]);

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
    const handleRequestMagicLink = useCallback(async (isResend = false) => {
        if (!isPhoneValid || loading) {
            setHasError(true);
            return;
        }
        setLoading(true);
        setError("");
        logger.debug("[LoginFlow] Requesting magic link", { phoneNumber: fullPhoneNumber, isResend });
        const result = await requestSmsMagicLinkForLogin(fullPhoneNumber);
        setLoading(false);
        if (result.success) {
            logger.info("[LoginFlow] Magic link sent successfully", { isResend });
            if (!isResend) animateStepChange(() => setCurrentStep("magicLinkSent"));
            setResendTimer(60); // 60s before resend
        } else {
            logger.error("[LoginFlow] Failed to send magic link", { error: result.error });
            setHasError(true);
            setError(result.error || "Failed to send sign-in link.");
        }
    }, [isPhoneValid, loading, fullPhoneNumber, animateStepChange]);

    const handlePrimaryAction = useCallback(() => {
        Keyboard.dismiss();
        if (currentStep === "phone") handleRequestMagicLink();
    }, [currentStep, handleRequestMagicLink]);

    const handleResendMagicLink = useCallback(() => {
        if (resendTimer > 0 || loading) return;
        handleRequestMagicLink(true);
    }, [resendTimer, loading, handleRequestMagicLink]);

    const clearMessages = useCallback(() => {
        setError("");
        setHasError(false);
    }, []);

    const handleBack = useCallback(() => {
        if (currentStep === "magicLinkSent") {
            animateStepChange(() => {
                setCurrentStep("phone");
                clearMessages();
            });
        } else {
            // Login w/SSO: back goes to Gateway (Welcome) screen
            navigation.replace("Welcome");
        }
    }, [currentStep, animateStepChange, clearMessages, navigation]);

    const clearPhoneInput = useCallback(() => {
        setPhoneNumber("");
        setHasError(false);
        phoneInputRef.current?.focus();
    }, []);

    const isButtonDisabled = loading || (currentStep === "phone" ? !isPhoneValid : true);

    return {
        // State
        phoneNumber,
        setPhoneNumber,
        selectedCountry,
        setSelectedCountry,
        currentStep,
        resendTimer,
        inputFocused,
        setInputFocused,
        hasError,
        loading,
        error,
        isButtonDisabled,
        fullPhoneNumber,
        // Refs
        phoneInputRef,
        // Animations
        fadeAnim,
        slideAnim,
        // Handlers
        handlePrimaryAction,
        handleResendMagicLink,
        handleBack,
        clearPhoneInput,
    };
};
