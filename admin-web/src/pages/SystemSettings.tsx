import { useState, useEffect } from 'react';
import { getSystemSettings, sendTwilioTestSms, updateTwilioSettings, type SystemSettings } from '../api/client';
import { useNotification } from '../context/NotificationContext';

const FIREBASE_CONSOLE_URL = 'https://console.firebase.google.com/';
const TWILIO_CONSOLE_URL = 'https://console.twilio.com/';

export function SystemSettings() {
  const notify = useNotification();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [twilioTestTo, setTwilioTestTo] = useState('');
  const [twilioTestLoading, setTwilioTestLoading] = useState(false);
  const [twilioFirestore, setTwilioFirestore] = useState({
    accountSid: '',
    authToken: '',
    fromNumber: '',
    apiKeySid: '',
    apiKeySecret: '',
    verifyServiceSid: '',
  });
  const [twilioSaveLoading, setTwilioSaveLoading] = useState(false);

  useEffect(() => {
    getSystemSettings()
      .then((res) => {
        if (res.success && res.data) setSettings(res.data);
        else {
          const msg = !res.success && 'message' in res ? res.message : 'Failed to load';
          setError(msg);
          notify.error(msg);
        }
      })
      .catch(() => {
        setError('Failed to load');
        notify.error('Failed to load');
      })
      .finally(() => setLoading(false));
  }, [notify]);

  const twilioCanTest = settings ? (settings.twilio.configured || settings.twilio.availableForTest) : false;

  const handleTwilioTest = async () => {
    const to = twilioTestTo.trim();
    if (!to) {
      notify.error('Enter a phone number in E.164 format (e.g. +15551234567).');
      return;
    }
    if (!/^\+[1-9]\d{1,14}$/.test(to)) {
      notify.error('Invalid format. Use E.164 (e.g. +15551234567).');
      return;
    }
    setTwilioTestLoading(true);
    const res = await sendTwilioTestSms(to);
    setTwilioTestLoading(false);
    if (res.success) {
      notify.success('Test SMS sent.');
    } else {
      notify.error(res.message || 'Failed to send test SMS.');
    }
  };

  const handleSaveTwilioToFirestore = async () => {
    const config = {
      accountSid: twilioFirestore.accountSid.trim() || undefined,
      authToken: twilioFirestore.authToken.trim() || undefined,
      fromNumber: twilioFirestore.fromNumber.trim() || undefined,
      apiKeySid: twilioFirestore.apiKeySid.trim() || undefined,
      apiKeySecret: twilioFirestore.apiKeySecret.trim() || undefined,
      verifyServiceSid: twilioFirestore.verifyServiceSid.trim() || undefined,
    };
    const hasAny = Object.values(config).some((v) => v && v.length > 0);
    if (!hasAny) {
      notify.error('Enter at least one field (e.g. Account SID, Auth Token, From number).');
      return;
    }
    setTwilioSaveLoading(true);
    const res = await updateTwilioSettings(config);
    setTwilioSaveLoading(false);
    if (res.success) {
      notify.success('Twilio credentials saved to Firestore. Backend will use them.');
      setTwilioFirestore({ accountSid: '', authToken: '', fromNumber: '', apiKeySid: '', apiKeySecret: '', verifyServiceSid: '' });
      getSystemSettings().then((r) => {
        if (r.success && r.data) setSettings(r.data);
      });
    } else {
      notify.error(res.message || 'Failed to save to Firestore.');
    }
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>System settings</h2>
      <p style={styles.subtitle}>
        Configuration status for Firebase (push notifications) and Twilio (SMS). Twilio is managed in Firestore from this page; Firebase uses backend <code style={styles.code}>.env</code>.
      </p>

      {loading && <p style={styles.muted}>Loading…</p>}
      {error && <div style={styles.error}>{error}</div>}
      {!loading && !error && !settings && <p style={styles.muted}>Unable to load settings.</p>}

      {!loading && !error && settings && (
      <>
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
            For text invites and SMS magic links to work, store your Twilio credentials in Firestore using the form below.
          </p>
          <ol style={styles.stepsList}>
            <li>In Twilio Console, copy your <strong>Account SID</strong> and <strong>Auth Token</strong> (Account → API keys and tokens). Use the primary SID that starts with <code style={styles.code}>AC</code>.</li>
            <li>Get a Twilio phone number (Phone Numbers → Manage → Buy a number) or use an existing one. This will be the From number for all SMS.</li>
            <li>Enter Account SID, Auth Token, and From number below and click <strong>Save to Firestore</strong>. The backend reads Twilio only from Firestore.</li>
          </ol>
          <p style={styles.desc}>
            Without Twilio configured, SMS magic links and text invites may only be logged in development and not sent. The status above shows whether the backend has valid credentials from Firestore.
          </p>
        </div>
        {settings.twilio.envVars.length > 0 && (
          <>
            <p style={styles.envLabel}>Environment variables:</p>
            <ul style={styles.envList}>
              {settings.twilio.envVars.map((v) => (
                <li key={v} style={styles.envItem}><code style={styles.code}>{v}</code></li>
              ))}
            </ul>
          </>
        )}

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Store credentials in Firestore</h4>
          <p style={styles.desc}>
            Save Twilio secrets in Firestore (document <code style={styles.code}>config/twilio</code>). The backend reads Firestore first, then falls back to <code style={styles.code}>.env</code>. Only the server uses these; they are not exposed to the client. Provide at least one field to save.
          </p>
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>
              Account SID (starts with AC)
              <input
                type="text"
                value={twilioFirestore.accountSid}
                onChange={(e) => setTwilioFirestore((p) => ({ ...p, accountSid: e.target.value }))}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                style={styles.fieldInput}
                autoComplete="off"
              />
            </label>
            <label style={styles.fieldLabel}>
              Auth Token
              <input
                type="password"
                value={twilioFirestore.authToken}
                onChange={(e) => setTwilioFirestore((p) => ({ ...p, authToken: e.target.value }))}
                placeholder="••••••••"
                style={styles.fieldInput}
                autoComplete="new-password"
              />
            </label>
            <label style={styles.fieldLabel}>
              From number (E.164)
              <input
                type="tel"
                value={twilioFirestore.fromNumber}
                onChange={(e) => setTwilioFirestore((p) => ({ ...p, fromNumber: e.target.value }))}
                placeholder="+15551234567"
                style={styles.fieldInput}
                autoComplete="off"
              />
            </label>
            <label style={styles.fieldLabel}>
              API Key SID (optional)
              <input
                type="text"
                value={twilioFirestore.apiKeySid}
                onChange={(e) => setTwilioFirestore((p) => ({ ...p, apiKeySid: e.target.value }))}
                placeholder="SK..."
                style={styles.fieldInput}
                autoComplete="off"
              />
            </label>
            <label style={styles.fieldLabel}>
              API Key Secret (optional)
              <input
                type="password"
                value={twilioFirestore.apiKeySecret}
                onChange={(e) => setTwilioFirestore((p) => ({ ...p, apiKeySecret: e.target.value }))}
                placeholder="••••••••"
                style={styles.fieldInput}
                autoComplete="new-password"
              />
            </label>
            <label style={styles.fieldLabel}>
              Verify Service SID (optional)
              <input
                type="text"
                value={twilioFirestore.verifyServiceSid}
                onChange={(e) => setTwilioFirestore((p) => ({ ...p, verifyServiceSid: e.target.value }))}
                placeholder="VA..."
                style={styles.fieldInput}
                autoComplete="off"
              />
            </label>
          </div>
          <button type="button" onClick={handleSaveTwilioToFirestore} style={styles.saveBtn} disabled={twilioSaveLoading}>
            {twilioSaveLoading ? 'Saving…' : 'Save to Firestore'}
          </button>
        </div>

        {twilioCanTest && (
          <div style={styles.testSection}>
            <h4 style={styles.sectionTitle}>Test Twilio (testing / trial account)</h4>
            <p style={styles.desc}>
              Send a test SMS to verify Twilio is working. Use E.164 format (e.g. +15551234567). With a Twilio trial account, the number must be verified in Twilio Console.
            </p>
            <div style={styles.testRow}>
              <input
                type="tel"
                value={twilioTestTo}
                onChange={(e) => setTwilioTestTo(e.target.value)}
                placeholder="+15551234567"
                style={styles.testInput}
                disabled={twilioTestLoading}
              />
              <button type="button" onClick={handleTwilioTest} style={styles.testBtn} disabled={twilioTestLoading}>
                {twilioTestLoading ? 'Sending…' : 'Send test SMS'}
              </button>
            </div>
          </div>
        )}
        <a href={TWILIO_CONSOLE_URL} target="_blank" rel="noopener noreferrer" style={styles.link}>
          Open Twilio Console →
        </a>
      </div>
      </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { fontFamily: 'var(--font-family)', maxWidth: 800 },
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
  testSection: { marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)' },
  testRow: { display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' },
  testInput: { padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-base)', minWidth: 160 },
  testBtn: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500 },
  formGrid: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-primary)' },
  fieldInput: { padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-base)', maxWidth: 360 },
  saveBtn: { padding: 'var(--space-md) var(--space-xl)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500 },
};
