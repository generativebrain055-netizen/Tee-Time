import React from "react";
import {
  Modal,
  View,
  Image,
  Pressable,
  Text,
  StyleSheet,
  Share,
  Platform,
  Linking,
} from "react-native";
import { X, Share2, ExternalLink } from "lucide-react-native";

interface ChatImagePreviewModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

/**
 * Full-screen image preview with share (link) and open in browser — works on iOS and Android without extra native modules.
 */
export function ChatImagePreviewModal({
  visible,
  imageUrl,
  onClose,
}: ChatImagePreviewModalProps): React.ReactElement | null {
  const share = async () => {
    if (!imageUrl) return;
    try {
      await Share.share({
        title: "Image",
        message: Platform.OS === "android" ? imageUrl : undefined,
        url: Platform.OS === "ios" ? imageUrl : undefined,
      });
    } catch {
      // user dismissed share sheet
    }
  };

  const openBrowser = () => {
    if (imageUrl) {
      Linking.openURL(imageUrl).catch(() => {});
    }
  };

  if (!imageUrl) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.toolbar} pointerEvents="box-none">
          <Pressable onPress={onClose} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Close">
            <X color="#FFFFFF" size={26} strokeWidth={2} />
          </Pressable>
          <View style={styles.toolbarRight}>
            <Pressable onPress={share} style={styles.actionBtn}>
              <Share2 color="#FFFFFF" size={22} strokeWidth={2} />
              <Text style={styles.actionLabel}>Share</Text>
            </Pressable>
            <Pressable onPress={openBrowser} style={styles.actionBtn}>
              <ExternalLink color="#FFFFFF" size={22} strokeWidth={2} />
              <Text style={styles.actionLabel}>Open</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.imageBox} pointerEvents="box-none">
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
  },
  toolbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  iconBtn: {
    padding: 4,
  },
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
  },
  actionLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },
  imageBox: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 24,
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    minHeight: 200,
  },
});
