import React, { memo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import AdCard, { AdCardProps } from "./AdCard";
import { spacing, fontSize, fontFamily } from "../../../ui/theme/tokens";
import { colorTokens } from "../../../theme/tokens";

/**
 * Section of ad units matching Figma 1349-4110, 1349-4189, 1349-4138, 1349-4451.
 * Renders a horizontal list of AdCards.
 */
export interface AdSlot extends Omit<AdCardProps, "onPress"> {
  id: string;
  onPress?: () => void;
}

interface AdsSectionProps {
  /** Section title (e.g. "Sponsored" or hidden) */
  title?: string;
  /** Ad slots to display */
  slots: AdSlot[];
}

function AdsSection({ title, slots }: AdsSectionProps) {
  if (!slots.length) return null;

  return (
    <View style={styles.section}>
      {title ? (
        <Text style={styles.sectionTitle}>{title}</Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {slots.map((slot) => (
          <View key={slot.id} style={styles.cardWrap}>
            <AdCard
              adLabel={slot.adLabel}
              title={slot.title}
              description={slot.description}
              imageSource={slot.imageSource}
              ctaText={slot.ctaText}
              onPress={slot.onPress}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: spacing.lg,
    backgroundColor: colorTokens.neutral.surface,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colorTokens.text.secondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing["2xl"],
  },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingRight: spacing["2xl"],
  },
  cardWrap: {
    marginRight: spacing.md,
  },
});

export default memo(AdsSection);
