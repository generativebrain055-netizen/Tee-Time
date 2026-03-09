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
          <h3 style={styles.cardTitle}>Firebase (OAuth and push notifications)</h3>
          <span style={{ ...styles.badge, ...(settings.firebase.configured ? styles.badgeOk : styles.badgeWarn) }}>
            {settings.firebase.configured ? 'Configured' : 'Not configured'}
          </span>
        </div>
        <p style={styles.desc}>{settings.firebase.description}</p>
        {settings.firebase.configured && settings.firebase.projectIdMasked && (
          <p style={styles.masked}>Project ID: <code style={styles.code}>{settings.firebase.projectIdMasked}</code></p>
        )}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Push notifications</h4>
          <p style={styles.desc}>
            For mobile push to be delivered correctly, configure the backend and ensure the app is set up with the same Firebase project.
          </p>
          <ol style={styles.stepsList}>
            <li>Set <code style={styles.code}>FIREBASE_PROJECT_ID</code> in the backend <code style={styles.code}>.env</code> to your Firebase project ID.</li>
            <li>In Firebase Console → Project settings → Cloud Messaging: enable the API if you use FCM (e.g. for Android with Expo).</li>
            <li>In your Expo/mobile app, use the same Firebase project (e.g. <code style={styles.code}>googleServicesFile</code> / Firebase config) so device push tokens are valid.</li>
          </ol>
          <p style={styles.desc}>
            The backend sends push via Expo Push API; Expo delivers to FCM (Android) and APNs (iOS). A valid <code style={styles.code}>FIREBASE_PROJECT_ID</code> ensures OAuth and app push registration stay in sync.
          </p>
        </div>
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
          <h3 style={styles.cardTitle}>Twilio (SMS and text invites)</h3>
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
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>SMS messaging and text invites</h4>
          <p style={styles.desc}>
            For text invites and SMS magic links to work, configure the backend with your Twilio credentials and a sending number.
          </p>
          <ol style={styles.stepsList}>
            <li>In Twilio Console, copy your <strong>Account SID</strong> and <strong>Auth Token</strong> (Account → API keys and tokens). Use the primary SID that starts with <code style={styles.code}>AC</code>.</li>
            <li>Get a Twilio phone number (Phone Numbers → Manage → Buy a number) or use an existing one. This will be the From number for all SMS.</li>
            <li>In the backend <code style={styles.code}>.env</code>, set <code style={styles.code}>TWILIO_ACCOUNT_SID</code>, <code style={styles.code}>TWILIO_AUTH_TOKEN</code>, and <code style={styles.code}>TWILIO_FROM_NUMBER</code> (e.g. <code style={styles.code}>+15551234567</code>).</li>
            <li>Restart the backend server so the new values are loaded.</li>
          </ol>
          <p style={styles.desc}>
            Without Twilio configured, SMS magic links and text invites may only be logged in development and not sent. The status above shows whether the backend has valid credentials.
          </p>
        </div>
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
  section: { marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)' },
  sectionTitle: { fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-sm)' },
  stepsList: { margin: '0 0 var(--space-md)', paddingLeft: 'var(--space-xl)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' },
  link: { fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', textDecoration: 'none' },
  error: { padding: 'var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)' },
  muted: { color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' },
};
