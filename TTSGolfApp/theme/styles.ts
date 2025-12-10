import { StyleSheet, Platform, ViewStyle, TextStyle } from "react-native";
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
  } as ViewStyle,
  headerContent: {
    alignItems: "center",
    paddingTop: spacing.xxl,
  } as ViewStyle,
  appName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extrabold as TextStyle["fontWeight"],
    color: colors.white,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  } as TextStyle,
  tagline: {
    fontSize: fontSize.lg,
    color: colors.textLight,
    fontWeight: fontWeight.medium as TextStyle["fontWeight"],
  } as TextStyle,
});

// Card styles for white card containers
export const cardStyles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    marginTop: -spacing.xl,
  } as ViewStyle,
  cardWrapper: {
    flex: 1,
  } as ViewStyle,
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
  } as ViewStyle,
  cardContent: {
    flex: 1,
    alignItems: "center",
  } as ViewStyle,
  cardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  } as TextStyle,
  cardSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  } as TextStyle,
});

// Form/Input related styles
export const formStyles = StyleSheet.create({
  inputSpacer: {
    height: spacing.md,
  } as ViewStyle,
  inputGroup: {
    marginBottom: 0,
  } as ViewStyle,
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  } as TextStyle,
  form: {
    marginBottom: spacing.xl,
  } as ViewStyle,
});

// Button related styles
export const buttonStyles = StyleSheet.create({
  continueButton: {
    marginTop: spacing.xl,
    width: "100%",
  } as ViewStyle,
  resendButton: {
    marginTop: spacing.lg,
  } as ViewStyle,
  resendText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold as TextStyle["fontWeight"],
    fontSize: fontSize.sm,
  } as TextStyle,
  resendTextDisabled: {
    color: colors.textTertiary,
  } as TextStyle,
  switchButton: {
    marginTop: spacing.lg,
  } as ViewStyle,
  switchText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as TextStyle["fontWeight"],
  } as TextStyle,
});

// Message/feedback styles
export const messageStyles = StyleSheet.create({
  errorText: {
    marginTop: spacing.lg,
    color: colors.error,
    textAlign: "center",
    fontSize: fontSize.sm,
  } as TextStyle,
  statusText: {
    marginTop: spacing.md,
    color: colors.success,
    textAlign: "center",
    fontSize: fontSize.sm,
  } as TextStyle,
});

// Text link styles
export const linkStyles = StyleSheet.create({
  termsText: {
    marginTop: spacing.xl,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 18,
  } as TextStyle,
  termsLink: {
    color: colors.primary,
    fontWeight: fontWeight.semibold as TextStyle["fontWeight"],
  } as TextStyle,
  signupContainer: {
    flexDirection: "row",
    marginTop: spacing.xl,
  } as ViewStyle,
  signupText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  } as TextStyle,
  signupLink: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
  } as TextStyle,
  loginLink: {
    marginTop: spacing.xl,
    alignItems: "center",
  } as ViewStyle,
  loginLinkText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  } as TextStyle,
  loginLinkBold: {
    color: colors.primary,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
  } as TextStyle,
});

// Footer styles
export const footerStyles = StyleSheet.create({
  footer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  } as ViewStyle,
  footerText: {
    color: colors.textLight,
    fontSize: fontSize.xs,
  } as TextStyle,
});

// Phone input styles
export const phoneInputStyles = StyleSheet.create({
  phoneInputContainer: {
    flexDirection: "row",
    height: 58,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  } as ViewStyle,
  countryCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceDark,
    minWidth: 110,
    gap: spacing.xs,
  } as ViewStyle,
  flagText: {
    fontSize: 24,
  } as TextStyle,
  countryCodeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
    color: colors.textPrimary,
  } as TextStyle,
  phoneInputField: {
    flex: 1,
    marginBottom: 0,
  } as ViewStyle,
});

// OTP related styles
export const otpStyles = StyleSheet.create({
  otpInfo: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: "center",
    lineHeight: 22,
  } as TextStyle,
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E1",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  } as ViewStyle,
  timerText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
  } as TextStyle,
  expiredContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEBEE",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  } as ViewStyle,
  expiredText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.bold as TextStyle["fontWeight"],
  } as TextStyle,
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
