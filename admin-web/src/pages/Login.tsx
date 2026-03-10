import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyMfa, isAuthenticated } = useAuth();
  const notify = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [temporaryToken, setTemporaryToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email?.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.ok) {
      navigate(from, { replace: true });
    } else if (result.needsMfa && result.temporaryToken) {
      setTemporaryToken(result.temporaryToken);
      setMfaStep(true);
      setMfaCode('');
    } else {
      const msg = result.error || 'Invalid credentials.';
      setError(msg);
      notify.error(msg);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = mfaCode.trim().replace(/\s/g, '');
    if (!temporaryToken || code.length !== 6) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    const result = await verifyMfa(temporaryToken, code);
    setLoading(false);
    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      const msg = result.error || 'Invalid code.';
      setError(msg);
      notify.error(msg);
    }
  };

  const handleBackToPassword = () => {
    setMfaStep(false);
    setTemporaryToken(null);
    setMfaCode('');
    setError('');
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <img src="/logo.png" alt="Tee Time" style={styles.logoImg} />
          <span style={styles.logoSub}>Admin</span>
        </div>
        {!mfaStep ? (
          <>
            <h1 style={styles.title}>Sign in</h1>
            <p style={styles.subtitle}>
              Use your super admin credentials to access the dashboard.
            </p>
            <form onSubmit={handleSubmit} style={styles.form}>
              {error && (
                <div style={styles.errorBox}>{error}</div>
              )}
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                style={styles.input}
                autoComplete="email"
                disabled={loading}
              />
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
                autoComplete="current-password"
                disabled={loading}
              />
              <button type="submit" style={{ ...styles.button, opacity: loading ? 0.8 : 1 }} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Two-factor authentication</h1>
            <p style={styles.subtitle}>
              Enter the 6-digit code from your authenticator app.
            </p>
            <form onSubmit={handleMfaSubmit} style={styles.form}>
              {error && (
                <div style={styles.errorBox}>{error}</div>
              )}
              <label style={styles.label}>Authentication code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={styles.input}
                disabled={loading}
                maxLength={6}
              />
              <button type="submit" style={{ ...styles.button, opacity: loading ? 0.8 : 1 }} disabled={loading || mfaCode.replace(/\D/g, '').length !== 6}>
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button
                type="button"
                style={styles.backButton}
                onClick={handleBackToPassword}
                disabled={loading}
              >
                ← Back to sign in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))`,
    padding: 'var(--space-lg)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-3xl)',
    boxShadow: 'var(--shadow-lg)',
  },
  logo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 'var(--space-2xl)',
  },
  logoImg: {
    height: 56,
    width: 'auto',
    objectFit: 'contain',
  },
  logoSub: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
    marginTop: 4,
  },
  title: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-sm)',
  },
  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-2xl)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-lg)',
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
  },
  input: {
    padding: 'var(--space-md) var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text-primary)',
    background: 'var(--color-background)',
  },
  errorBox: {
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-error-container)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
  button: {
    padding: 'var(--space-md) var(--space-xl)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 600,
    boxShadow: 'var(--shadow-primary)',
    marginTop: 'var(--space-sm)',
  },
  backButton: {
    marginTop: 'var(--space-md)',
    padding: 'var(--space-sm)',
    border: 'none',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
};
