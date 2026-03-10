import { useState, useEffect, useCallback, useRef } from 'react';
import { listAdSlots, updateAdSlot, uploadAdSlotAsset, removeAdSlotAsset, type AdSlot } from '../api/client';
import { useNotification } from '../context/NotificationContext';

/** Exactly 4 ad placements – all are editable in this page */
const AD_SLOT_KEYS = ['loading_screen', 'banner_1', 'banner_2', 'banner_3'] as const;

/** 4 ad placements: sign in, chatting, tee time type selection, calendar view */
const SLOT_LABELS: Record<string, string> = {
  loading_screen: 'Sign up / Sign in page',
  banner_1: 'Chatting page',
  banner_2: 'Tee time type selection',
  banner_3: 'Calendar view page',
};

/** Max length for ad description (preview and form) to avoid overflow */
const AD_DESCRIPTION_MAX_LENGTH = 80;

function truncateDescription(text: string | null | undefined): string {
  if (text == null || text === '') return '';
  if (text.length <= AD_DESCRIPTION_MAX_LENGTH) return text;
  return text.slice(0, AD_DESCRIPTION_MAX_LENGTH) + '…';
}

export function AdSlots() {
  const notify = useNotification();
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdSlot | null>(null);
  const [form, setForm] = useState<{ label: string; description: string; image_url: string; link_url: string; active: boolean }>({
    label: '',
    description: '',
    image_url: '',
    link_url: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listAdSlots();
    setLoading(false);
    if (res.success) {
      const byKey = new Map((res.data as AdSlot[]).map((s) => [s.slot_key, s]));
      const merged: AdSlot[] = AD_SLOT_KEYS.map((key) => byKey.get(key) ?? ({
        id: '',
        slot_key: key,
        label: SLOT_LABELS[key] ?? key,
        description: null,
        image_url: null,
        link_url: null,
        active: true,
        sort_order: AD_SLOT_KEYS.indexOf(key) + 1,
        created_at: '',
        updated_at: '',
      } as AdSlot));
      setSlots(merged);
    } else {
      const msg = res.message || 'Failed to load ad slots';
      setError(msg);
      notify.error(msg);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (slot: AdSlot) => {
    setEditing(slot);
    setForm({
      label: slot.label || '',
      description: (slot.description || '').slice(0, AD_DESCRIPTION_MAX_LENGTH),
      image_url: slot.image_url || '',
      link_url: slot.link_url || '',
      active: slot.active ?? true,
    });
    setActionError(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setActionError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setActionError(null);
    const res = await updateAdSlot(editing.slot_key, {
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      link_url: form.link_url.trim() || null,
      active: form.active,
    });
    setSaving(false);
    if (res.success) {
      setSlots((prev) => prev.map((s) => (s.slot_key === res.data.slot_key ? res.data : s)));
      setEditing(res.data);
      setForm((f) => ({ ...f, image_url: res.data.image_url || '', description: res.data.description || '' }));
      notify.success('Ad saved.');
    } else {
      const msg = res.message || 'Failed to update';
      setActionError(msg);
      notify.error(msg);
    }
  };

  const uploadImageFile = useCallback(async (file: File) => {
    if (!editing) return;
    if (!file.type.startsWith('image/')) {
      setActionError('Please use an image (JPEG, PNG, WebP, or GIF).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setActionError('Image must be 2MB or smaller.');
      return;
    }
    setUploading(true);
    setActionError(null);
    const res = await uploadAdSlotAsset(editing.slot_key, file);
    setUploading(false);
    if (res.success) {
      setSlots((prev) => prev.map((s) => (s.slot_key === res.data.slot_key ? res.data : s)));
      setEditing(res.data);
      setForm((f) => ({ ...f, image_url: res.data.image_url || '' }));
      notify.success('Image uploaded.');
    } else {
      const msg = res.message || 'Upload failed';
      setActionError(msg);
      notify.error(msg);
    }
  }, [editing, notify]);

  const handleUploadAsset = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    uploadImageFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!editing || uploading || !e.dataTransfer.files?.length) return;
    uploadImageFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemoveAsset = async () => {
    if (!editing) return;
    setRemoving(true);
    setActionError(null);
    const res = await removeAdSlotAsset(editing.slot_key);
    setRemoving(false);
    if (res.success) {
      setSlots((prev) => prev.map((s) => (s.slot_key === res.data.slot_key ? res.data : s)));
      setEditing(res.data);
      setForm((f) => ({ ...f, image_url: '' }));
      notify.success('Image removed.');
    } else {
      const msg = res.message || 'Failed to remove creative';
      setActionError(msg);
      notify.error(msg);
    }
  };

  if (loading) return <p style={styles.muted}>Loading…</p>;
  if (error) return <div style={styles.errorBox}>{error}</div>;

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Ad content management</h2>
      <p style={styles.subtitle}>
        Edit the 4 ads shown on: Sign up/Sign in page, Chatting page, Tee time type selection page, and Calendar view page. Each ad has an image, description, and URL.
      </p>

      <section style={styles.previewSection}>
        <h3 style={styles.previewTitle}>Ads preview</h3>
        <p style={styles.previewHint}>Image as background with text on top. Click the ad to open its URL in a new tab.</p>
        <div style={styles.previewGrid}>
          {slots.map((slot, index) => (
            <div key={slot.slot_key} style={styles.previewCard}>
              <div style={styles.previewCardLabel}>Ad {index + 1}: {SLOT_LABELS[slot.slot_key]}</div>
              <div
                role={slot.link_url ? 'button' : undefined}
                tabIndex={slot.link_url ? 0 : undefined}
                onClick={() => slot.link_url && window.open(slot.link_url, '_blank', 'noopener,noreferrer')}
                onKeyDown={(e) => { if (slot.link_url && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); window.open(slot.link_url!, '_blank', 'noopener,noreferrer'); } }}
                style={{
                  ...styles.previewCardBg,
                  ...(slot.image_url ? { backgroundImage: `url(${slot.image_url})` } : {}),
                  ...(slot.link_url ? styles.previewCardClickable : {}),
                }}
              >
                <div style={styles.previewCardTextOverlay}>
                  {truncateDescription(slot.description) || '— No description —'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Page</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Image</th>
              <th style={styles.th}>URL</th>
              <th style={styles.th}>Active</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, index) => (
              <tr key={slot.slot_key}>
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}>{slot.label || '—'}</td>
                <td style={styles.td}>
                  <span style={styles.descCell}>{slot.description ? (slot.description.slice(0, 50) + (slot.description.length > 50 ? '…' : '')) : '—'}</span>
                </td>
                <td style={styles.td}>
                  {slot.image_url ? (
                    <a href={slot.image_url} target="_blank" rel="noopener noreferrer" style={styles.creativeCell} title="View full size">
                      <img src={slot.image_url} alt="Creative" style={styles.thumbnail} />
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={styles.td}>
                  {slot.link_url ? (
                    <span style={styles.urlPreview} title={slot.link_url}>{slot.link_url.slice(0, 40)}…</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...(slot.active ? styles.badgeOk : styles.badgeOff) }}>
                    {slot.active ? 'On' : 'Off'}
                  </span>
                </td>
                <td style={styles.td}>
                  <button type="button" style={styles.btnSm} onClick={() => openEdit(slot)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={styles.modalOverlay} onClick={closeEdit}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Edit: {SLOT_LABELS[editing.slot_key] || editing.slot_key}</h3>
            {actionError && <div style={styles.errorBox}>{actionError}</div>}
            <div style={styles.field}>
              <label style={styles.label}>Description (shown with the ad)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, AD_DESCRIPTION_MAX_LENGTH) }))}
                style={styles.textarea}
                rows={2}
                maxLength={AD_DESCRIPTION_MAX_LENGTH}
                placeholder="Short ad copy or tagline"
              />
              <span style={styles.muted}>{form.description.length} / {AD_DESCRIPTION_MAX_LENGTH}</span>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Ad image (upload)</label>
              {form.image_url ? (
                <div style={styles.previewRow}>
                  <img src={form.image_url} alt="Current ad" style={styles.previewImg} />
                  <div style={styles.previewRowActions}>
                    <button type="button" style={styles.btnSecondary} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? 'Uploading…' : 'Replace image'}
                    </button>
                    <button type="button" style={styles.btnDanger} onClick={handleRemoveAsset} disabled={removing}>
                      {removing ? 'Removing…' : 'Remove image'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{ ...styles.uploadZone, ...(dragOver ? styles.uploadZoneActive : {}) }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleUploadAsset}
                    style={styles.fileInput}
                  />
                  {uploading ? (
                    <span style={styles.uploadZoneText}>Uploading…</span>
                  ) : (
                    <>
                      <span style={styles.uploadZoneText}>Drop image here or click to browse</span>
                      <span style={styles.uploadZoneHint}>JPEG, PNG, WebP, GIF · max 2MB</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Or paste image URL (optional)</label>
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                style={styles.input}
                placeholder="https://…"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>URL (tap-through link)</label>
              <input
                type="url"
                value={form.link_url}
                onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                style={styles.input}
                placeholder="https://…"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Preview (click opens URL in new tab)</label>
              <div
                role={form.link_url ? 'button' : undefined}
                tabIndex={form.link_url ? 0 : undefined}
                onClick={() => form.link_url && window.open(form.link_url, '_blank', 'noopener,noreferrer')}
                onKeyDown={(e) => { if (form.link_url && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); window.open(form.link_url!, '_blank', 'noopener,noreferrer'); } }}
                style={{
                  ...styles.livePreviewCard,
                  ...(form.image_url ? { backgroundImage: `url(${form.image_url})` } : {}),
                  ...(form.link_url ? styles.previewCardClickable : {}),
                }}
              >
                <div style={styles.previewCardTextOverlay}>
                  {truncateDescription(form.description) || 'Description will appear here'}
                </div>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                <span style={styles.checkText}>Active (show in app)</span>
              </label>
            </div>
            <div style={styles.modalActions}>
              <button type="button" style={styles.btnSecondary} onClick={closeEdit}>
                Cancel
              </button>
              <button type="button" style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { fontFamily: 'var(--font-family)' },
  title: { fontSize: 'var(--font-size-2xl)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' },
  subtitle: { fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' },
  previewSection: { marginBottom: 'var(--space-2xl)', padding: 'var(--space-lg)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' },
  previewTitle: { fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-xs)' },
  previewHint: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' },
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)', alignItems: 'stretch' },
  previewCard: { border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-background-secondary)', display: 'flex', flexDirection: 'column', height: 340 },
  previewCardLabel: { fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid var(--color-border)', minHeight: 40, maxHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  previewCardBg: { height: 220, flex: '0 0 220px', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'var(--color-surface-elevated)', position: 'relative', display: 'flex', alignItems: 'flex-end', borderRadius: 'var(--radius-sm)', margin: 'var(--space-md)' },
  previewCardClickable: { cursor: 'pointer' },
  previewCardTextOverlay: { width: '100%', padding: 'var(--space-sm) var(--space-md)', background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', color: '#fff', fontSize: 'var(--font-size-sm)', lineHeight: 1.4, borderRadius: '0 0 var(--radius-sm) var(--radius-sm)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', wordBreak: 'break-word', overflowWrap: 'break-word' },
  previewCardPlaceholder: { width: '100%', height: 100, background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' },
  livePreviewCard: { minHeight: 120, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'var(--color-surface-elevated)', position: 'relative', display: 'flex', alignItems: 'flex-end', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', maxWidth: 280 },
  descCell: { maxWidth: 160, fontSize: 'var(--font-size-sm)', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' },
  textarea: { width: '100%', padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-base)', resize: 'vertical', fontFamily: 'inherit' },
  muted: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' },
  errorBox: {
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-error-container)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
    marginBottom: 'var(--space-md)',
  },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' },
  th: { textAlign: 'left', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontWeight: 600 },
  td: { padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)' },
  code: { fontSize: 'var(--font-size-xs)', background: 'var(--color-surface-elevated)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' },
  urlPreview: { maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' },
  badge: { padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 },
  badgeOk: { background: 'var(--color-success-container)', color: 'var(--color-success)' },
  badgeOff: { background: 'var(--color-surface-elevated)', color: 'var(--color-text-muted)' },
  btnSm: { padding: '4px 12px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', maxWidth: 520, width: '90%', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' },
  modalTitle: { fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-lg)' },
  field: { marginBottom: 'var(--space-md)' },
  label: { display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xs)' },
  input: { width: '100%', padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-base)' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' },
  checkText: { fontSize: 'var(--font-size-sm)' },
  modalActions: { display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-xl)' },
  btnPrimary: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500 },
  btnSecondary: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  btnDanger: { padding: 'var(--space-sm) var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' },
  creativeCell: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'inherit', textDecoration: 'none' },
  thumbnail: { width: 40, height: 28, objectFit: 'cover', borderRadius: 4 },
  hint: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' },
  previewRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' },
  previewRowActions: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' },
  previewImg: { width: 120, height: 72, objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' },
  uploadZone: { border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-xl)', textAlign: 'center', cursor: 'pointer', background: 'var(--color-background-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  uploadZoneActive: { borderColor: 'var(--color-primary)', background: 'var(--color-primary-container)' },
  uploadZoneText: { fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-primary)' },
  uploadZoneHint: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' },
  uploadRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' },
  fileInput: { display: 'none' },
};
