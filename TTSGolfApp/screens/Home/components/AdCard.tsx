import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { spacing, fontSize, radii, fontFamily } from "../../../ui/theme/tokens";
import { colorTokens } from "../../../theme/tokens";
import { palette } from "../../../ui/theme/tokens";

/**
 * Ad unit card matching Figma nodes 1349-4110, 1349-4189, 1349-4138, 1349-4451.
 * Supports image, title, description, and CTA.
 */
export interface AdCardProps {
  /** Small "Ad" or sponsor label */
  adLabel?: string;
  /** Headline */
  title: string;
  /** Optional body copy */
  description?: string;
  /** Optional image (URI or require()) */
  imageSource?: ImageSourcePropType | null;
  /** CTA text, e.g. "Learn more" */
  ctaText?: string;
  /** Called when the card or CTA is pressed */
  onPress?: () => void;
  /** Optional style override for the card container */
  style?: object;
}

function AdCard({
  adLabel = "Ad",
  title,
  description,
  imageSource,
  ctaText = "Learn more",
  onPress,
  style,
}: AdCardProps) {
  const content = (
    <View style={[styles.card, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.adLabel}>{adLabel}</Text>
      </View>
      {imageSource ? (
        <View style={styles.imageWrap}>
          <Image
            source={imageSource}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      ) : null}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {description ? (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      {ctaText ? (
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>{ctaText}</Text>
          <ChevronRight size={16} color={palette.green600} strokeWidth={2} />
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorTokens.surface ?? "#FFFFFF",
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colorTokens.border ?? palette.gray200,
    minWidth: 280,
    maxWidth: 340,
  },
  labelRow: {
    marginBottom: spacing.sm,
  },
  adLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize["2xs"],
    color: colorTokens.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radii.sm,
    backgroundColor: palette.gray100,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colorTokens.text.primary,
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colorTokens.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing["2xs"],
  },
  ctaText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: palette.green600,
  },
});

export default memo(AdCard);
