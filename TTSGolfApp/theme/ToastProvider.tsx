/**
 * ToastProvider – Global toast/snackbar system using Paper's Snackbar.
 * Wrap your app in <ToastProvider> and call useToast() from any component.
 */
import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { Snackbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "info" | "success" | "error" | "warning";

interface Toast {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

interface ToastContextValue {
  show: (toast: Toast | string) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => {},
  dismiss: () => {},
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const TYPE_STYLES: Record<ToastType, { bg: string; text: string }> = {
  info: { bg: "#1E40AF", text: "#FFFFFF" },
  success: { bg: "#166534", text: "#FFFFFF" },
  error: { bg: "#991B1B", text: "#FFFFFF" },
  warning: { bg: "#92400E", text: "#FFFFFF" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<Toast>({ message: "" });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dismiss = useCallback(() => setVisible(false), []);

  const show = useCallback((toast: Toast | string) => {
    // Clear any existing timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const t: Toast = typeof toast === "string" ? { message: toast } : toast;
    setCurrent(t);
    setVisible(true);
  }, []);

  const style = TYPE_STYLES[current.type || "info"];

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={dismiss}
        duration={current.duration ?? 3000}
        action={current.action ?? { label: "OK", onPress: dismiss }}
        style={{
          backgroundColor: style.bg,
          marginBottom: insets.bottom + 8,
          borderRadius: 12,
          marginHorizontal: 16,
        }}
        theme={{ colors: { inversePrimary: style.text, inverseOnSurface: style.text } }}
      >
        {current.message}
      </Snackbar>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
