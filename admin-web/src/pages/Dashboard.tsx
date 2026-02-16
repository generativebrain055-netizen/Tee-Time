import { useEffect, useState } from 'react';
import { fetchDashboardStats, type DashboardStats } from '../api/client';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDashboardStats()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setStats(res.data);
        } else {
          setError(!res.success && 'message' in res ? res.message || 'Failed to load dashboard.' : 'Failed to load dashboard.');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load dashboard.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Dashboard</h2>
      <p style={styles.subtitle}>
        Key metrics to monitor platform health.
      </p>
      {loading && <p style={styles.muted}>Loading…</p>}
      {error && <div style={styles.errorBox}>{error}</div>}
      {!loading && !error && stats && (
        <div style={styles.cards}>
          <div style={styles.card}>
            <span style={styles.cardLabel}>Total users</span>
            <span style={styles.cardValue}>{stats.totalUsers.toLocaleString()}</span>
          </div>
          <div style={styles.card}>
            <span style={styles.cardLabel}>Active users</span>
            <span style={styles.cardValue}>{stats.activeUsers.toLocaleString()}</span>
          </div>
          <div style={styles.card}>
            <span style={styles.cardLabel}>Tee times booked</span>
            <span style={styles.cardValue}>{stats.teeTimesBooked.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    fontFamily: 'var(--font-family)',
  },
  title: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-sm)',
  },
  subtitle: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-2xl)',
  },
  muted: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  errorBox: {
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-error-container)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
    marginBottom: 'var(--space-lg)',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 'var(--space-lg)',
  },
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    boxShadow: 'var(--shadow-sm)',
  },
  cardLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
  },
  cardValue: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
};
