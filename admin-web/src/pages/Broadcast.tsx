import { useState } from 'react';
import { previewBroadcast, sendBroadcast, type BroadcastPreview } from '../api/client';
import { useNotification } from '../context/NotificationContext';

export function Broadcast() {
  const notify = useNotification();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number; message: string } | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handlePreview = async () => {
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    const res = await previewBroadcast(title, body);
    setPreviewLoading(false);
    if (res.success && res.data) {
      setPreview(res.data);
      notify.success('Preview ready.');
    } else {
      const msg = !res.success && 'message' in res ? res.message : 'Preview failed';
      setPreviewError(msg);
      notify.error(msg);
    }
  };

  const handleSend = async () => {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      setSendError('Title and message are required.');
      return;
    }
    if (!confirm(`Send this notification to all users?\n\nTitle: ${t}\n\nMessage: ${b}`)) return;
    setSendResult(null);
    setSendError(null);
    setSendLoading(true);
    const res = await sendBroadcast(t, b);
    setSendLoading(false);
    if (res.success && res.data) {
      setSendResult(res.data);
      notify.success(`Broadcast sent to ${res.data.total} user(s).`);
    } else {
      const msg = !res.success && 'message' in res ? res.message : 'Send failed';
      setSendError(msg);
      notify.error(msg);
    }
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Broadcast push notifications</h2>
      <p style={styles.subtitle}>
        Send push notifications to all users for platform-wide updates or announcements.
      </p>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Compose</h3>
        <label style={styles.label}>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Platform update"
            style={styles.input}
            maxLength={255}
          />
        </label>
        <label style={styles.label}>
          Message
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Your announcement..."
            style={styles.textarea}
            rows={4}
          />
        </label>
        <div style={styles.actions}>
          <button type="button" onClick={handlePreview} style={styles.secondaryBtn} disabled={previewLoading}>
            {previewLoading ? 'Loading preview…' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={handleSend}
            style={styles.primaryBtn}
            disabled={sendLoading || !title.trim() || !body.trim()}
          >
            {sendLoading ? 'Sending…' : 'Send to all users'}
          </button>
        </div>
      </div>

      {previewError && <div style={styles.error}>{previewError}</div>}
      {preview && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Preview</h3>
          <p style={styles.previewHint}>This is how the notification will appear. Verify content and formatting before sending.</p>
          <div style={styles.previewBox}>
            <div style={styles.previewTitle}>{preview.title || '(No title)'}</div>
            <div style={styles.previewBody}>{preview.body || '(No message)'}</div>
          </div>
          <p style={styles.recipientCount}>{preview.message}</p>
        </div>
      )}

      {sendError && <div style={styles.error}>{sendError}</div>}
      {sendResult && (
        <div style={styles.success}>
          <strong>Broadcast sent</strong>
          <p>{sendResult.message}</p>
          <p style={styles.muted}>Delivered: {sendResult.sent} · Failed: {sendResult.failed} · Total: {sendResult.total}</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { fontFamily: 'var(--font-family)' },
  title: { fontSize: 'var(--font-size-2xl)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' },
  subtitle: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' },
  card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' },
  cardTitle: { fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-lg)' },
  label: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-sm)' },
  input: { padding: 'var(--space-md) var(--space-lg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-base)' },
  textarea: { padding: 'var(--space-md) var(--space-lg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-base)', resize: 'vertical' },
  actions: { display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' },
  primaryBtn: { padding: 'var(--space-md) var(--space-xl)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { padding: 'var(--space-md) var(--space-xl)', background: 'var(--color-surface-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' },
  error: { padding: 'var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-lg)' },
  success: { padding: 'var(--space-lg)', background: 'var(--color-success-container)', color: 'var(--color-on-success-container)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' },
  previewHint: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' },
  previewBox: { border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', background: 'var(--color-background-secondary)', marginBottom: 'var(--space-md)' },
  previewTitle: { fontWeight: 600, fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-sm)' },
  previewBody: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' },
  recipientCount: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' },
  muted: { fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-sm)', opacity: 0.9 },
};
