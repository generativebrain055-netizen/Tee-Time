/**
 * Login screen utility functions
 */

export const formatPhoneDisplay = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 0) return "";
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

export const getDigitsOnly = (phone: string): string => {
    return phone.replace(/\D/g, "");
};

export const toE164 = (phone: string, dialCode: string = '+1'): string => {
    const digits = getDigitsOnly(phone);
    // Strip leading zero for international format
    const normalized = digits.startsWith('0') ? digits.slice(1) : digits;
    return `${dialCode}${normalized}`;
};

export const isValidPhone = (phone: string, minLength: number = 10, maxLength: number = 10): boolean => {
    const digits = getDigitsOnly(phone);
    const normalized = digits.startsWith('0') ? digits.slice(1) : digits;
    return normalized.length >= minLength && normalized.length <= maxLength;
};

export const isValidOtp = (otp: string): boolean => {
    return otp.length === 6;
};
