/**
 * Renders a single banner ad slot (banner_1, banner_2, or banner_3) when the admin has configured it.
 * Same content as admin "Ads preview": image as background with description overlay.
 */
import React, { useEffect, useState } from "react";
import { View, ImageBackground, TouchableOpacity, Linking, StyleSheet, Dimensions, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { fetchAdSlots, type AdSlotItem, AD_DESCRIPTION_MAX_LENGTH } from "../services/api/adSlotsApi";

const { width } = Dimensions.get("window");
const BANNER_HEIGHT = 52;

function truncateDescription(text: string | null | undefined): string {
  if (text == null || text === "") return "";
  if (text.length <= AD_DESCRIPTION_MAX_LENGTH) return text;
  return text.slice(0, AD_DESCRIPTION_MAX_LENGTH) + "…";
}

type BannerSlotKey = "banner_1" | "banner_2" | "banner_3";

interface BannerAdProps {
  slotKey: BannerSlotKey;
  style?: object;
}

export function BannerAd({ slotKey, style }: BannerAdProps): React.ReactElement | null {
  const [slot, setSlot] = useState<AdSlotItem | null>(null);

  useEffect(() => {
    fetchAdSlots().then((res) => {
      if (res.success && res.data?.length) {
        const s = res.data.find((x) => x.slot_key === slotKey && x.image_url);
        if (s) setSlot(s);
      }
    });
  }, [slotKey]);

  if (!slot?.image_url) return null;

  const description = truncateDescription(slot.description);

  return (
    <View style={[styles.wrapper, style]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (slot.link_url) Linking.openURL(slot.link_url);
        }}
        style={styles.touchable}
      >
        <ImageBackground
          source={{ uri: slot.image_url }}
          style={styles.image}
          resizeMode="cover"
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.75)"]}
            style={styles.overlay}
          >
            <Text style={styles.overlayText} numberOfLines={3}>
              {description || "— No description —"}
            </Text>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: width - 32,
    maxWidth: "100%",
    height: BANNER_HEIGHT,
    alignSelf: "center",
    marginVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  touchable: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
    borderRadius: 8,
  },
  imageStyle: {
    borderRadius: 8,
  },
  overlay: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "flex-end",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  overlayText: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 16,
    maxHeight: 40,
  },
});
