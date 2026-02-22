/**
 * Ad container placeholder for sign up / login screens.
 * Matches Figma design: designated area with correct spacing for ad content.
 * Replace this placeholder with your ad SDK view when integrating ads.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

/** Height per common mobile banner (50pt). Figma ad container area. */
export const AD_CONTAINER_HEIGHT = 50;

/** Horizontal padding to align with screen content (24px). */
export const AD_CONTAINER_PADDING_H = 24;

/** Vertical spacing above/below the ad area. */
export const AD_CONTAINER_MARGIN_TOP = 20;
export const AD_CONTAINER_MARGIN_BOTTOM = 8;

export function AdContainerPlaceholder(): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.label} numberOfLines={1}>
          Ad
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AD_CONTAINER_PADDING_H,
    marginTop: AD_CONTAINER_MARGIN_TOP,
    marginBottom: AD_CONTAINER_MARGIN_BOTTOM,
    alignSelf: "stretch",
  },
  placeholder: {
    height: AD_CONTAINER_HEIGHT,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});

export default AdContainerPlaceholder;
