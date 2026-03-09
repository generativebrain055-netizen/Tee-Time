/**
 * Renders a single banner ad slot (banner_1, banner_2, or banner_3) when the admin has configured it.
 * Used on key app pages for revenue.
 */
import React, { useEffect, useState } from "react";
import { View, Image, TouchableOpacity, Linking, StyleSheet, Dimensions } from "react-native";
import { fetchAdSlots, type AdSlotItem } from "../services/api/adSlotsApi";

const { width } = Dimensions.get("window");
const BANNER_HEIGHT = 52;

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

  return (
    <View style={[styles.wrapper, style]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (slot.link_url) Linking.openURL(slot.link_url);
        }}
        style={styles.touchable}
      >
        <Image
          source={{ uri: slot.image_url }}
          style={styles.image}
          resizeMode="contain"
        />
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
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
