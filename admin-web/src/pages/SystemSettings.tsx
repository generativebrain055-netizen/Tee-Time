import { useState, useEffect } from 'react';
import { getSystemSettings, type SystemSettings } from '../api/client';

const FIREBASE_CONSOLE_URL = 'https://console.firebase.google.com/';
const TWILIO_CONSOLE_URL = 'https://console.twilio.com/';

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSystemSettings()
      .then((res) => {
        if (res.success && res.data) setSettings(res.data);
        else setError(!res.success && 'message' in res ? res.message : 'Failed to load');
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={styles.muted}>Loading…</p>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!settings) return null;

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>System settings</h2>
      <p style={styles.subtitle}>
        Configuration status for Firebase (push notifications) and Twilio (SMS). Set values in the backend <code style={styles.code}>.env</code> file.
      </p>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Firebase</h3>
          <span style={{ ...styles.badge, ...(settings.firebase.configured ? styles.badgeOk : styles.badgeWarn) }}>
            {settings.firebase.configured ? 'Configured' : 'Not configured'}
          </span>
        </div>
        <p style={styles.desc}>{settings.firebase.description}</p>
        {settings.firebase.configured && settings.firebase.projectIdMasked && (
          <p style={styles.masked}>Project ID: <code style={styles.code}>{settings.firebase.projectIdMasked}</code></p>
        )}
        <p style={styles.envLabel}>Environment variables:</p>
        <ul style={styles.envList}>
          {settings.firebase.envVars.map((v) => (
            <li key={v} style={styles.envItem}><code style={styles.code}>{v}</code></li>
          ))}
        </ul>
        <a href={FIREBASE_CONSOLE_URL} target="_blank" rel="noopener noreferrer" style={styles.link}>
          Open Firebase Console →
        </a>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Twilio</h3>
          <span style={{ ...styles.badge, ...(settings.twilio.configured ? styles.badgeOk : styles.badgeWarn) }}>
            {settings.twilio.configured ? 'Configured' : 'Not configured'}
          </span>
        </div>
        <p style={styles.desc}>{settings.twilio.description}</p>
        {settings.twilio.configured && (
          <div style={styles.maskedBlock}>
            {settings.twilio.accountSidMasked && (
              <p style={styles.masked}>Account SID: <code style={styles.code}>{settings.twilio.accountSidMasked}</code></p>
            )}
            {settings.twilio.fromNumberMasked && (
              <p style={styles.masked}>From number: <code style={styles.code}>{settings.twilio.fromNumberMasked}</code></p>
            )}
          </div>
        )}
        <p style={styles.envLabel}>Environment variables:</p>
        <ul style={styles.envList}>
          {settings.twilio.envVars.map((v) => (
            <li key={v} style={styles.envItem}><code style={styles.code}>{v}</code></li>
          ))}
        </ul>
        <a href={TWILIO_CONSOLE_URL} target="_blank" rel="noopener noreferrer" style={styles.link}>
          Open Twilio Console →
        </a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { fontFamily: 'var(--font-family)' },
  title: { fontSize: 'var(--font-size-2xl)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' },
  subtitle: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' },
  code: { background: 'var(--color-surface-tertiary)', padding: '2px 6px', borderRadius: 'var(--radius-xs)', fontSize: 'var(--font-size-xs)' },
  card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' },
  cardTitle: { fontSize: 'var(--font-size-lg)', fontWeight: 600 },
  badge: { padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600 },
  badgeOk: { background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' },
  badgeWarn: { background: 'var(--color-warning-container)', color: 'var(--color-pending-text)' },
  desc: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' },
  masked: { fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xs)' },
  maskedBlock: { marginBottom: 'var(--space-md)' },
  envLabel: { fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--space-xs)' },
  envList: { margin: 0, paddingLeft: 'var(--space-xl)', marginBottom: 'var(--space-md)' },
  envItem: { marginBottom: 4 },
  link: { fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', textDecoration: 'none' },
  error: { padding: 'var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)' },
  muted: { color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' },
};
