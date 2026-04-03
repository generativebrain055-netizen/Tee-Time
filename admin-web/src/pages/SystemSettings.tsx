import { useState, useEffect } from 'react';
import { getSystemSettings, sendTwilioTestSms, updateTwilioSettings, clearTwilioSettings, type SystemSettings } from '../api/client';
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
    messagingServiceSid: '',
  });
  const [twilioSaveLoading, setTwilioSaveLoading] = useState(false);
  const [twilioClearLoading, setTwilioClearLoading] = useState(false);

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

  const handleClearTwilioFirestore = async () => {
    if (!window.confirm('This will delete Twilio credentials from Firestore. The backend will fall back to .env TWILIO_* vars. Continue?')) return;
    setTwilioClearLoading(true);
    const res = await clearTwilioSettings();
    setTwilioClearLoading(false);
    if (res.success) {
      notify.success('Firestore Twilio credentials cleared. Backend is now using .env vars.');
      getSystemSettings().then((r) => { if (r.success && r.data) setSettings(r.data); });
    } else {
      notify.error(res.message || 'Failed to clear.');
    }
  };

  const handleSaveTwilioToFirestore = async () => {
    const config = {
      accountSid: twilioFirestore.accountSid.trim() || undefined,
      authToken: twilioFirestore.authToken.trim() || undefined,
      messagingServiceSid: twilioFirestore.messagingServiceSid.trim() || undefined,
    };
    const hasAny = Object.values(config).some((v) => v && v.length > 0);
    if (!hasAny) {
      notify.error('Enter at least one value (e.g. Account SID, Auth Token, or Messaging Service SID).');
      return;
    }
    setTwilioSaveLoading(true);
    const res = await updateTwilioSettings(config);
    setTwilioSaveLoading(false);
    if (res.success) {
      notify.success('Twilio credentials saved to Firestore. Backend will use them.');
      setTwilioFirestore({ accountSid: '', authToken: '', messagingServiceSid: '' });
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
        Firebase (push) is configured in the backend. Twilio (SMS) is configured here via Firestore.
      </p>

      {loading && <p style={styles.muted}>Loading…</p>}
      {error && <div style={styles.error}>{error}</div>}
      {!loading && !error && !settings && <p style={styles.muted}>Unable to load settings.</p>}

      {!loading && !error && settings && (
      <>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Firebase (push notifications)</h3>
          {settings.firebase && (
            <span style={{ ...styles.badge, ...(settings.firebase.configured ? styles.badgeOk : styles.badgeWarn) }}>
              {settings.firebase.configured ? 'Configured' : 'Not configured'}
            </span>
          )}
        </div>
        <p style={styles.desc}>
          So that <strong>Broadcast</strong> push notifications from this admin site reach the mobile app, configure the backend with your Firebase project. The backend sends via Expo Push API and, when configured, via Firebase Cloud Messaging (FCM).
        </p>
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Configuration steps</h4>
          <ol style={styles.stepsList}>
            <li>
              Open <a href={FIREBASE_CONSOLE_URL} target="_blank" rel="noopener noreferrer" style={styles.link}>Firebase Console</a> and select your project (or create one). Use the same project as your mobile app.
            </li>
            <li>
              In Firebase Console, go to <strong>Project settings</strong> (gear icon) → <strong>Service accounts</strong>. Click <strong>Generate new private key</strong> and download the JSON file. Place it in your backend (e.g. <code style={styles.code}>backend/config/firebase-service-account.json</code>).
            </li>
            <li>
              In the backend <code style={styles.code}>.env</code> file, set:
              <ul style={styles.envList}>
                <li style={styles.envItem}><code style={styles.code}>GOOGLE_APPLICATION_CREDENTIALS=./config/firebase-service-account.json</code> (or the path to your JSON file)</li>
                <li style={styles.envItem}><code style={styles.code}>FIREBASE_PROJECT_ID=your-project-id</code> (optional if the JSON already contains the project)</li>
              </ul>
            </li>
            <li>
              In Firebase Console → Project settings → <strong>Cloud Messaging</strong>, ensure the API is enabled (needed for FCM). The mobile app must use the same project (<code style={styles.code}>google-services.json</code> / app config) so push tokens are valid.
            </li>
          </ol>
        </div>
        {settings.firebase?.projectIdMasked && (
          <p style={styles.muted}>Backend project ID: <code style={styles.code}>{settings.firebase.projectIdMasked}</code></p>
        )}
        {settings.firebase?.configured === false && (
          <p style={styles.warn}>Backend is not configured for Firebase. Set the variables above in backend <code style={styles.code}>.env</code> and restart the backend. Until then, push is sent only via Expo Push API (no FCM).</p>
        )}
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
        {settings.twilio.configured ? (
          <div style={styles.maskedBlock}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ ...styles.badge, ...(settings.twilio.credentialSource === 'firestore' ? styles.badgeOk : styles.badgeInfo) }}>
                {settings.twilio.credentialSource === 'firestore' ? 'Firestore' : '.env'}
              </span>
              {settings.twilio.accountSidMasked && (
                <span style={styles.maskedInline}>Account SID <code style={styles.code}>{settings.twilio.accountSidMasked}</code></span>
              )}
              {settings.twilio.messagingServiceSidMasked && (
                <span style={styles.maskedInline}>Messaging Service <code style={styles.code}>{settings.twilio.messagingServiceSidMasked}</code></span>
              )}
              {settings.twilio.fromNumberMasked && (
                <span style={styles.maskedInline}>From <code style={styles.code}>{settings.twilio.fromNumberMasked}</code></span>
              )}
            </div>
            {settings.twilio.credentialSource === 'firestore' && (
              <button
                type="button"
                onClick={handleClearTwilioFirestore}
                style={styles.clearBtn}
                disabled={twilioClearLoading}
                title="Delete Firestore credentials — backend falls back to .env"
              >
                {twilioClearLoading ? 'Clearing…' : 'Clear Firestore credentials'}
              </button>
            )}
          </div>
        ) : (
          <p style={styles.warnInline}>Not configured. Save credentials below or set <code style={styles.code}>TWILIO_*</code> env vars.</p>
        )}

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Save credentials to Firestore</h4>
          <p style={styles.desc}>
            Credentials are read from Firestore first, then from <code style={styles.code}>.env</code> as a fallback. Fill in the fields below and click <strong>Save</strong>.
          </p>
          <ol style={styles.stepsList}>
            <li>In <a href={TWILIO_CONSOLE_URL} target="_blank" rel="noopener noreferrer" style={styles.link}>Twilio Console</a> → Account → API keys and tokens, copy your <strong>Account SID</strong> and <strong>Auth Token</strong>.</li>
            <li>Copy the <strong>Messaging Service SID</strong> (<code style={styles.code}>MG…</code>) linked to your A2P/10DLC campaign. This is what the backend uses to send SMS — not the Campaign SID (<code style={styles.code}>CM…</code>).</li>
            <li>Paste below and click <strong>Save to Firestore</strong>. Only the fields you fill will be updated.</li>
          </ol>
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>
              Account SID
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
                placeholder="Your auth token"
                style={styles.fieldInput}
                autoComplete="new-password"
              />
            </label>
            <label style={styles.fieldLabel}>
              Messaging Service SID (A2P / 10DLC)
              <input
                type="text"
                value={twilioFirestore.messagingServiceSid}
                onChange={(e) => setTwilioFirestore((p) => ({ ...p, messagingServiceSid: e.target.value }))}
                placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
            <h4 style={styles.sectionTitle}>Send a test SMS</h4>
            <p style={styles.desc}>
              Enter a phone number in E.164 format to confirm SMS is working. Trial accounts can only send to verified numbers in Twilio Console.
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
        <a href={TWILIO_CONSOLE_URL} target="_blank" rel="noopener noreferrer" style={{ ...styles.link, display: 'inline-block', marginTop: 'var(--space-md)' }}>
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
  badgeInfo: { background: 'var(--color-surface-tertiary)', color: 'var(--color-text-secondary)' },
  clearBtn: { padding: '3px 10px', background: 'transparent', color: 'var(--color-error, #dc2626)', border: '1px solid var(--color-error, #dc2626)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 500 },
  desc: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' },
  masked: { fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xs)' },
  maskedInline: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' },
  maskedBlock: { marginBottom: 'var(--space-md)', padding: '12px 14px', background: 'var(--color-surface-secondary, #f9fafb)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' },
  warnInline: { fontSize: 'var(--font-size-sm)', color: 'var(--color-pending-text, #92400e)', background: 'var(--color-warning-container, #fef3c7)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' },
  envLabel: { fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--space-xs)' },
  envList: { margin: 0, paddingLeft: 'var(--space-xl)', marginBottom: 'var(--space-md)' },
  envItem: { marginBottom: 4 },
  section: { marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)' },
  sectionTitle: { fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-sm)' },
  stepsList: { margin: '0 0 var(--space-md)', paddingLeft: 'var(--space-xl)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' },
  link: { fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', textDecoration: 'none' },
  error: { padding: 'var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)' },
  warn: { padding: 'var(--space-md)', background: 'var(--color-warning-container, #fef3c7)', color: 'var(--color-on-warning-container, #92400e)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-md)' },
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
