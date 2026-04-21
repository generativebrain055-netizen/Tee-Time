/**
 * ToastProvider — global top-right toast/snackbar system.
 *
 * Wrap your app in <ToastProvider> and call useToast() anywhere.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.show({ message: 'Saved!', type: 'success' });
 *   toast.show('Quick info');
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  memo,
  type ReactNode,
  useEffect,
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  Calendar,
  CheckCircle2,
  CircleX,
  Info,
  MessageCircle,
  TriangleAlert,
  User,
  Users,
  X,
} from "lucide-react-native";
import {
  borderWidth,
  fontFamily,
  fontSize,
  lineHeight,
  palette,
  radii,
  shadows,
  spacing,
  zIndex,
} from "../theme/tokens";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = "info" | "success" | "error" | "warning";
type ToastPlacement = "top" | "bottom";
type ToastAlign = "left" | "center" | "right";

/** Line-art icon in the mint icon well (matches in-app notification list). */
export type ToastLeadingIcon = "calendar" | "user" | "users" | "message" | "bell";

interface Toast {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
  placement?: ToastPlacement;
  align?: ToastAlign;
  action?: { label: string; onPress: () => void };
  /** Optional right-side time label (e.g. "Today", "1m ago"). */
  timestamp?: string;
  /** Override default icon in the leading well; falls back to type-based icon. */
  leadingIcon?: ToastLeadingIcon;
}

interface ToastContextValue {
  show: (toast: Toast | string) => void;
  dismiss: () => void;
}

// ---------------------------------------------------------------------------
// Semantics — white card + tinted icon well (Tee Time Social list style)
// ---------------------------------------------------------------------------

const TYPE_SEMANTICS: Record<
  ToastType,
  { iconWell: string; iconColor: string }
> = {
  info: { iconWell: palette.green100, iconColor: palette.green700 },
  success: { iconWell: palette.green100, iconColor: palette.green700 },
  error: { iconWell: palette.red50, iconColor: palette.red600 },
  warning: { iconWell: palette.amber100, iconColor: palette.amber700 },
};

const LEADING_ICON_MAP: Record<
  ToastLeadingIcon,
  React.ComponentType<{ size: number; color: string }>
> = {
  calendar: Calendar,
  user: User,
  users: Users,
  message: MessageCircle,
  bell: Bell,
};

function iconForType(
  type: ToastType,
  leading?: ToastLeadingIcon,
): React.ComponentType<{ size: number; color: string }> {
  if (leading && LEADING_ICON_MAP[leading]) return LEADING_ICON_MAP[leading];
  if (type === "success") return CheckCircle2;
  if (type === "error") return CircleX;
  if (type === "warning") return TriangleAlert;
  return Info;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue>({
  show: () => {},
  dismiss: () => {},
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function ToastProviderInner({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  const queueRef = useRef<Toast[]>([]);
  const showingRef = useRef(false);
  const epochRef = useRef(0);

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<Toast>({ message: "" });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      showingRef.current = false;
      return;
    }

    const next = queueRef.current.shift()!;
    showingRef.current = true;

    const myEpoch = ++epochRef.current;
    const isBottom = (next.placement ?? "top") === "bottom";

    translateY.stopAnimation();
    opacityAnim.stopAnimation();
    translateY.setValue(isBottom ? 80 : -80);
    opacityAnim.setValue(0);

    setCurrent(next);
    setVisible(true);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 200,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      dismissEpoch(myEpoch);
    }, next.duration ?? 3500);
  }, [translateY, opacityAnim]);

  const dismissEpoch = useCallback(
    (epoch: number) => {
      if (epochRef.current !== epoch) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const isBottom = (queueRef.current[0]?.placement ?? "top") === "bottom";
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: isBottom ? 80 : -80,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        if (epochRef.current !== epoch) return;
        setVisible(false);
        showingRef.current = false;
        if (queueRef.current.length > 0) {
          startNext();
        }
      });
    },
    [translateY, opacityAnim, startNext],
  );

  const show = useCallback(
    (toast: Toast | string) => {
      const next: Toast = typeof toast === "string" ? { message: toast } : toast;
      queueRef.current.push(next);

      if (!showingRef.current) {
        startNext();
      }
    },
    [startNext],
  );

  const dismiss = useCallback(() => {
    dismissEpoch(epochRef.current);
  }, [dismissEpoch]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const semantics = TYPE_SEMANTICS[current.type ?? "info"];
  const placement: ToastPlacement = current.placement ?? "top";
  const align: ToastAlign = current.align ?? "right";

  const [firstLine, ...restLines] = (current.message || "").split("\n");
  const displayTitle = current.title?.trim() || firstLine || "Notification";
  const displayBody = restLines.join("\n").trim();

  const IconComponent = iconForType(current.type ?? "info", current.leadingIcon);

  const horizontalPos: ViewStyle =
    align === "right"
      ? { right: spacing.lg, width: 340, maxWidth: "90%" as unknown as number }
      : align === "left"
        ? { left: spacing.lg, width: 340, maxWidth: "90%" as unknown as number }
        : { left: spacing.lg, right: spacing.lg };

  const positionStyle: ViewStyle =
    placement === "bottom"
      ? { bottom: insets.bottom + spacing.lg, ...horizontalPos }
      : { top: insets.top + spacing.sm, ...horizontalPos };

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {visible ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.toast,
              shadows.md,
              positionStyle,
              {
                backgroundColor: palette.white,
                borderColor: palette.gray200,
                transform: [{ translateY }],
                opacity: opacityAnim,
              },
            ]}
          >
            <View style={styles.row}>
              <View
                style={[
                  styles.iconWell,
                  { backgroundColor: semantics.iconWell },
                ]}
              >
                <IconComponent size={20} color={semantics.iconColor} />
              </View>

              <View style={styles.textBlock}>
                <Text
                  style={styles.title}
                  numberOfLines={2}
                >
                  {displayTitle}
                </Text>
                {displayBody ? (
                  <Text
                    style={styles.body}
                    numberOfLines={3}
                  >
                    {displayBody}
                  </Text>
                ) : null}
                {current.action ? (
                  <Pressable
                    onPress={() => {
                      const fn = current.action?.onPress;
                      dismiss();
                      fn?.();
                    }}
                    hitSlop={6}
                    style={styles.actionPress}
                  >
                    <Text style={styles.actionText}>{current.action.label}</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.metaCol}>
                {current.timestamp ? (
                  <Text style={styles.timestamp} numberOfLines={1}>
                    {current.timestamp}
                  </Text>
                ) : null}
                <Pressable onPress={dismiss} hitSlop={10} style={styles.closeBtn}>
                  <X size={16} color={palette.gray400} />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const ToastProvider = memo(ToastProviderInner);
ToastProvider.displayName = "ToastProvider";

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    borderRadius: radii.lg,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    zIndex: zIndex.toast,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: palette.gray800,
  },
  body: {
    marginTop: spacing.xs,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    color: palette.gray600,
  },
  actionPress: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingVertical: spacing["2xs"],
  },
  actionText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    color: palette.green600,
  },
  metaCol: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: spacing.sm,
  },
  timestamp: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize["2xs"],
    lineHeight: lineHeight["2xs"],
    color: palette.gray400,
  },
  closeBtn: {
    padding: spacing["2xs"],
  },
});
