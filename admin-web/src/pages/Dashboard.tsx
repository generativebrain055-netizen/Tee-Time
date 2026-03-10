import { useEffect, useState } from 'react';
import {
  fetchDashboardStats,
  fetchCourseUsage,
  type DashboardStats,
  type CourseUsageEntry,
} from '../api/client';
import { useNotification } from '../context/NotificationContext';

export function Dashboard() {
  const notify = useNotification();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [courseUsage, setCourseUsage] = useState<CourseUsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

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
          const msg = !res.success && 'message' in res ? res.message || 'Failed to load dashboard.' : 'Failed to load dashboard.';
          setError(msg);
          notify.error(msg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load dashboard.');
          notify.error('Failed to load dashboard.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [notify]);

  useEffect(() => {
    let cancelled = false;
    setUsageLoading(true);
    setUsageError(null);
    fetchCourseUsage(50)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setCourseUsage(res.data);
        } else {
          const msg = !res.success && 'message' in res ? res.message || 'Failed to load course usage.' : 'Failed to load course usage.';
          setUsageError(msg);
          notify.error(msg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUsageError('Failed to load course usage.');
          notify.error('Failed to load course usage.');
        }
      })
      .finally(() => {
        if (!cancelled) setUsageLoading(false);
      });
    return () => { cancelled = true; };
  }, [notify]);

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

      <h3 style={styles.sectionTitle}>Most used courses</h3>
      <p style={styles.sectionSubtitle}>
        Courses ranked by number of tee times (platform usage).
      </p>
      {usageLoading && <p style={styles.muted}>Loading course usage…</p>}
      {usageError && <div style={styles.errorBox}>{usageError}</div>}
      {!usageLoading && !usageError && courseUsage.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Course</th>
                <th style={styles.th}>Location</th>
                <th style={styles.thRight}>Tee times</th>
              </tr>
            </thead>
            <tbody>
              {courseUsage.map((row, i) => (
                <tr key={`${row.course_name}-${row.course_location}-${i}`}>
                  <td style={styles.td}>{row.course_name || '—'}</td>
                  <td style={styles.td}>{row.course_location || '—'}</td>
                  <td style={styles.tdRight}>{row.tee_time_count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!usageLoading && !usageError && courseUsage.length === 0 && (
        <p style={styles.muted}>No tee time data yet.</p>
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
  sectionTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginTop: 'var(--space-2xl)',
    marginBottom: 'var(--space-sm)',
  },
  sectionSubtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-lg)',
  },
  tableWrap: {
    overflowX: 'auto',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-surface)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'var(--font-size-sm)',
  },
  th: {
    textAlign: 'left',
    padding: 'var(--space-md) var(--space-lg)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-secondary)',
    fontWeight: 600,
  },
  thRight: {
    textAlign: 'right',
    padding: 'var(--space-md) var(--space-lg)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-secondary)',
    fontWeight: 600,
  },
  td: {
    padding: 'var(--space-md) var(--space-lg)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  },
  tdRight: {
    padding: 'var(--space-md) var(--space-lg)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    textAlign: 'right',
  },
};
