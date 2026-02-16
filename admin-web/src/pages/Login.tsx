import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    } else {
      setError(result.error || 'Invalid credentials.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoText}>Tee Time</span>
          <span style={styles.logoSub}>Admin</span>
        </div>
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
    marginBottom: 'var(--space-2xl)',
  },
  logoText: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 700,
    color: 'var(--color-primary)',
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
};
