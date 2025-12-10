import { StyleSheet, Platform } from "react-native";
import { colors } from "./colors";
import {
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
} from "./metrics";

/**
 * Shared Styles - Reusable style definitions
 * These styles are used across multiple screens
 */

// Header styles for gradient headers
export const headerStyles = StyleSheet.create({
  headerGradient: {
    paddingTop: Platform.OS === "android" ? 40 : 0,
    paddingBottom: spacing.xxxl,
  },
  headerContent: {
    alignItems: "center",
    paddingTop: spacing.xxl,
  },
  appName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extraBold,
    color: colors.white,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
  tagline: {
    fontSize: fontSize.lg,
    color: colors.textLight,
    fontWeight: fontWeight.medium,
  },
});

// Card styles for white card containers
export const cardStyles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    marginTop: -spacing.xl,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.massive,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    ...shadows.large,
  },
  cardContent: {
    flex: 1,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  cardSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
});

// Form/Input related styles
export const formStyles = StyleSheet.create({
  inputSpacer: {
    height: spacing.md,
  },
  inputGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  form: {
    marginBottom: spacing.xl,
  },
});

// Button related styles
export const buttonStyles = StyleSheet.create({
  continueButton: {
    marginTop: spacing.xl,
    width: "100%",
  },
  resendButton: {
    marginTop: spacing.lg,
  },
  resendText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  resendTextDisabled: {
    color: colors.textTertiary,
  },
  switchButton: {
    marginTop: spacing.lg,
  },
  switchText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

// Message/feedback styles
export const messageStyles = StyleSheet.create({
  errorText: {
    marginTop: spacing.lg,
    color: colors.error,
    textAlign: "center",
    fontSize: fontSize.sm,
  },
  statusText: {
    marginTop: spacing.md,
    color: colors.success,
    textAlign: "center",
    fontSize: fontSize.sm,
  },
});

// Text link styles
export const linkStyles = StyleSheet.create({
  termsText: {
    marginTop: spacing.xl,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  signupContainer: {
    flexDirection: "row",
    marginTop: spacing.xl,
  },
  signupText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  signupLink: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  loginLink: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  loginLinkBold: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
});

// Footer styles
export const footerStyles = StyleSheet.create({
  footer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  footerText: {
    color: colors.textLight,
    fontSize: fontSize.xs,
  },
});

// Phone input styles
export const phoneInputStyles = StyleSheet.create({
  phoneInputContainer: {
    flexDirection: "row",
    height: 58,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  countryCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceDark,
    minWidth: 110,
    gap: spacing.xs,
  },
  flagText: {
    fontSize: 24,
  },
  countryCodeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  phoneInputField: {
    flex: 1,
    marginBottom: 0,
  },
});

// OTP related styles
export const otpStyles = StyleSheet.create({
  otpInfo: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: "center",
    lineHeight: 22,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E1",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  timerText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.bold,
  },
  expiredContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEBEE",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  expiredText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.bold,
  },
});

export default {
  headerStyles,
  cardStyles,
  formStyles,
  buttonStyles,
  messageStyles,
  linkStyles,
  footerStyles,
  phoneInputStyles,
  otpStyles,
};
