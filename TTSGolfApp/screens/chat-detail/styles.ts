import { palette } from "../../ui/theme/tokens";

/** Figma Tee Time Social – Chat (node 1404-586, 266-3367) */
export const COLORS = {
  primary: "#5EBC68",
  primaryLight: "#DCFCE7",
  secondary: palette.gray100,
  textMain: "#1F2937",
  textSub: "#6B7280",
  divider: "#E5E7EB",
  white: "#FFFFFF",
  bg: "#F9FAFB",
  myMessageBg: "#DCFCE7",
  otherMessageBg: "#FFFFFF",
  timeSent: "#707070",
  timeOther: "#878787",
  inputPlaceholder: "#747474",
  inputBg: "#F3F4F6",
};

export const FIGMA = {
  headerHeight: 120,
  headerShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleSentRadius: { borderTopLeftRadius: 16, borderTopRightRadius: 2, borderBottomRightRadius: 16, borderBottomLeftRadius: 16 },
  bubbleOtherRadius: { borderTopLeftRadius: 2, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 16 },
  inputBarHeight: 105,
  inputRowHeight: 44,
  inputBorderRadius: 16,
  avatarSize: 32,
  avatarSizeHeader: 32.4,
  /** Figma 1379-5818 Chat - Expanded field: group avatar stack in header */
  headerGroupStackSize: 47,
  headerGroupStackBadgeSize: 22,
};
