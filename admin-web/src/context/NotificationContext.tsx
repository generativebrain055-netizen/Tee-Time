import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: NotificationType;
}

type NotificationContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timeoutRefs.current.get(id);
    if (t) {
      clearTimeout(t);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const add = useCallback(
    (message: string, type: NotificationType) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timeoutId = setTimeout(() => remove(id), AUTO_DISMISS_MS);
      timeoutRefs.current.set(id, timeoutId);
    },
    [remove]
  );

  const success = useCallback((message: string) => add(message, 'success'), [add]);
  const error = useCallback((message: string) => add(message, 'error'), [add]);
  const info = useCallback((message: string) => add(message, 'info'), [add]);

  return (
    <NotificationContext.Provider value={{ success, error, info }}>
      {children}
      <div style={containerStyle} aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            style={{
              ...toastStyle,
              ...(t.type === 'success' ? toastSuccess : t.type === 'error' ? toastError : toastInfo),
            }}
          >
            <span style={toastMessage}>{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              style={dismissBtn}
              onClick={() => remove(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 'var(--space-md, 16px)',
  right: 'var(--space-md, 16px)',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm, 8px)',
  maxWidth: 'min(400px, calc(100vw - 32px))',
  pointerEvents: 'none',
};

const toastStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--space-md)',
  padding: 'var(--space-md) var(--space-lg)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.15))',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 1.4,
};

const toastSuccess: React.CSSProperties = {
  background: 'var(--color-success-container, #d4edda)',
  color: 'var(--color-on-success-container, #155724)',
};

const toastError: React.CSSProperties = {
  background: 'var(--color-error-container, #f8d7da)',
  color: 'var(--color-error, #721c24)',
};

const toastInfo: React.CSSProperties = {
  background: 'var(--color-surface-elevated, #e7f1ff)',
  color: 'var(--color-text-primary, #1a1a1a)',
};

const toastMessage: React.CSSProperties = {
  flex: 1,
  wordBreak: 'break-word' as const,
};

const dismissBtn: React.CSSProperties = {
  flexShrink: 0,
  background: 'none',
  border: 'none',
  color: 'inherit',
  fontSize: '1.25rem',
  lineHeight: 1,
  cursor: 'pointer',
  opacity: 0.8,
  padding: 0,
  marginLeft: 'var(--space-xs)',
};
