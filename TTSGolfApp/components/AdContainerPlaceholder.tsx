/**
 * Sign-up/sign-in ad container.
 * Uses the Sign up / Sign in ad slot (`loading_screen`).
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd } from "./BannerAd";

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
      <BannerAd slotKey="loading_screen" style={styles.banner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    marginTop: AD_CONTAINER_MARGIN_TOP,
    marginBottom: AD_CONTAINER_MARGIN_BOTTOM,
    alignSelf: "stretch",
  },
  banner: {
    marginVertical: 0,
  },
});

export default AdContainerPlaceholder;
