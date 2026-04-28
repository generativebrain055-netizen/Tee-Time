/**
 * Renders a single ad slot (loading_screen, banner_1, banner_2, or banner_3)
 * when the admin has configured it.
 */
import React, { useEffect, useState } from "react";
import { View, Image, ImageBackground, TouchableOpacity, Linking, StyleSheet, Dimensions, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  fetchAdSlots,
  getCachedAdSlot,
  subscribeAdSlots,
  type AdSlotItem,
  AD_DESCRIPTION_MAX_LENGTH,
} from "../services/api/adSlotsApi";

const { width } = Dimensions.get("window");
export const BANNER_AD_HEIGHT = 52;
export const BANNER_AD_WIDTH = width - 32;

function truncateDescription(text: string | null | undefined): string {
  if (text == null || text === "") return "";
  if (text.length <= AD_DESCRIPTION_MAX_LENGTH) return text;
  return text.slice(0, AD_DESCRIPTION_MAX_LENGTH) + "…";
}

type BannerSlotKey = "loading_screen" | "banner_1" | "banner_2" | "banner_3";

interface BannerAdProps {
  slotKey: BannerSlotKey;
  style?: object;
}

export function BannerAd({ slotKey, style }: BannerAdProps): React.ReactElement | null {
  const [slot, setSlot] = useState<AdSlotItem | null>(() => getCachedAdSlot(slotKey));
  const [loading, setLoading] = useState(!getCachedAdSlot(slotKey));

  useEffect(() => {
    let alive = true;
    const unsubscribe = subscribeAdSlots((payload) => {
      if (!alive) return;
      const liveSlot = payload.data.find((x) => x.slot_key === slotKey && x.image_url);
      if (liveSlot) {
        setSlot(liveSlot);
      }
    });

    fetchAdSlots().then(async (res) => {
      if (!alive) return;
      if (res.success && res.data?.length) {
        const s = res.data.find((x) => x.slot_key === slotKey && x.image_url);
        if (s?.image_url) {
          try {
            await Image.prefetch(s.image_url);
          } catch {
            // Non-fatal: still render ad if prefetch fails.
          }
          if (!alive) return;
          setSlot(s);
        }
      }
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [slotKey]);

  if (!slot?.image_url) {
    if (loading) {
      // Keep a stable reserved area while ad data resolves, preventing layout flicker.
      return <View style={[styles.wrapper, styles.placeholder, style]} />;
    }
    return null;
  }

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
    width: BANNER_AD_WIDTH,
    maxWidth: "100%",
    height: BANNER_AD_HEIGHT,
    alignSelf: "center",
    marginVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  placeholder: {
    backgroundColor: "#f3f4f6",
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
