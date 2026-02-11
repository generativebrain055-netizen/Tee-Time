/**
 * ToastProvider — global snackbar/toast system.
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
} from 'react';
import { Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radii, spacing } from '../theme/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = 'info' | 'success' | 'error' | 'warning';

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

// ---------------------------------------------------------------------------
// Color map — derived from token palette
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<ToastType, { bg: string; text: string }> = {
  info: { bg: '#1E40AF', text: '#FFFFFF' },
  success: { bg: '#166534', text: '#FFFFFF' },
  error: { bg: '#991B1B', text: '#FFFFFF' },
  warning: { bg: '#92400E', text: '#FFFFFF' },
};

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
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<Toast>({ message: '' });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dismiss = useCallback(() => setVisible(false), []);

  const show = useCallback((toast: Toast | string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const t: Toast = typeof toast === 'string' ? { message: toast } : toast;
    setCurrent(t);
    setVisible(true);
  }, []);

  const style = TYPE_STYLES[current.type || 'info'];

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={dismiss}
        duration={current.duration ?? 3000}
        action={current.action ?? { label: 'OK', onPress: dismiss }}
        style={{
          backgroundColor: style.bg,
          marginBottom: insets.bottom + spacing.sm,
          borderRadius: radii.md,
          marginHorizontal: spacing.lg,
        }}
        theme={{
          colors: {
            inversePrimary: style.text,
            inverseOnSurface: style.text,
          },
        }}
      >
        {current.message}
      </Snackbar>
    </ToastContext.Provider>
  );
}

export const ToastProvider = memo(ToastProviderInner);
ToastProvider.displayName = 'ToastProvider';
