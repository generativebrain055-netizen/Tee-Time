import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Admin app error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={styles.page}>
          <div style={styles.card}>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.message}>{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={styles.button}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: '#f8f9fa',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#fff',
    padding: 32,
    borderRadius: 12,
    maxWidth: 480,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  title: { fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#1c1c1e' },
  message: { fontSize: 14, color: '#6b7280', marginBottom: 24, wordBreak: 'break-word' as const },
  button: {
    padding: '12px 24px',
    background: '#5EBC68',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
