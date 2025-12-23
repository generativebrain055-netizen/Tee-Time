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

export const toE164 = (phone: string): string => {
    return `+1${getDigitsOnly(phone)}`;
};

export const isValidPhone = (phone: string): boolean => {
    return getDigitsOnly(phone).length >= 10;
};

export const isValidOtp = (otp: string): boolean => {
    return otp.length === 6;
};
