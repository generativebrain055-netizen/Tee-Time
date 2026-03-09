import { useState, useEffect, useCallback, useRef } from 'react';
import { listAdSlots, updateAdSlot, uploadAdSlotAsset, removeAdSlotAsset, type AdSlot } from '../api/client';

const SLOT_LABELS: Record<string, string> = {
  loading_screen: 'Loading screen sponsorship',
  banner_1: 'Banner slot 1 (e.g. Home)',
  banner_2: 'Banner slot 2 (e.g. Calendar)',
  banner_3: 'Banner slot 3 (e.g. Create tee time)',
};

export function AdSlots() {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdSlot | null>(null);
  const [form, setForm] = useState<{ label: string; image_url: string; link_url: string; active: boolean }>({
    label: '',
    image_url: '',
    link_url: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listAdSlots();
    setLoading(false);
    if (res.success) setSlots(res.data);
    else setError(res.message || 'Failed to load ad slots');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (slot: AdSlot) => {
    setEditing(slot);
    setForm({
      label: slot.label || '',
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
      label: form.label.trim() || undefined,
      image_url: form.image_url.trim() || null,
      link_url: form.link_url.trim() || null,
      active: form.active,
    });
    setSaving(false);
    if (res.success) {
      setSlots((prev) => prev.map((s) => (s.id === res.data.id ? res.data : s)));
      setEditing(res.data);
      setForm((f) => ({ ...f, image_url: res.data.image_url || '' }));
    } else {
      setActionError(res.message || 'Failed to update');
    }
  };

  const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editing || !e.target.files?.length) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      setActionError('Please select an image (JPEG, PNG, WebP, or GIF).');
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
    e.target.value = '';
    if (res.success) {
      setSlots((prev) => prev.map((s) => (s.id === res.data.id ? res.data : s)));
      setEditing(res.data);
      setForm((f) => ({ ...f, image_url: res.data.image_url || '' }));
    } else {
      setActionError(res.message || 'Upload failed');
    }
  };

  const handleRemoveAsset = async () => {
    if (!editing) return;
    setRemoving(true);
    setActionError(null);
    const res = await removeAdSlotAsset(editing.slot_key);
    setRemoving(false);
    if (res.success) {
      setSlots((prev) => prev.map((s) => (s.id === res.data.id ? res.data : s)));
      setEditing(res.data);
      setForm((f) => ({ ...f, image_url: '' }));
    } else {
      setActionError(res.message || 'Failed to remove creative');
    }
  };

  if (loading) return <p style={styles.muted}>Loading…</p>;
  if (error) return <div style={styles.errorBox}>{error}</div>;

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Ad slots</h2>
      <p style={styles.subtitle}>
        Manage 4 advertisement placements: 1 loading-screen sponsorship and 3 banner slots. Upload a custom image for each slot or paste an image URL; set link URL and active to control what appears in the app.
      </p>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Placement</th>
              <th style={styles.th}>Label</th>
              <th style={styles.th}>Creative</th>
              <th style={styles.th}>Link URL</th>
              <th style={styles.th}>Active</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td style={styles.td}>
                  <code style={styles.code}>{slot.slot_key}</code>
                </td>
                <td style={styles.td}>{slot.label || '—'}</td>
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
              <label style={styles.label}>Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                style={styles.input}
                placeholder="e.g. Loading screen sponsorship"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Creative asset</label>
              <p style={styles.hint}>Upload an image (JPEG, PNG, WebP, GIF; max 2MB) or paste an image URL below.</p>
              {form.image_url ? (
                <div style={styles.previewRow}>
                  <img src={form.image_url} alt="Current creative" style={styles.previewImg} />
                  <div>
                    <button type="button" style={styles.btnDanger} onClick={handleRemoveAsset} disabled={removing}>
                      {removing ? 'Removing…' : 'Remove creative'}
                    </button>
                  </div>
                </div>
              ) : null}
              <div style={styles.uploadRow}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleUploadAsset}
                  style={styles.fileInput}
                />
                <button type="button" style={styles.btnSecondary} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload image'}
                </button>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Image URL (optional – use if not uploading)</label>
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                style={styles.input}
                placeholder="https://…"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Link URL (tap-through)</label>
              <input
                type="url"
                value={form.link_url}
                onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                style={styles.input}
                placeholder="https://…"
              />
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
  modal: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', maxWidth: 480, width: '90%', boxShadow: 'var(--shadow-lg)' },
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
  previewRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' },
  previewImg: { width: 120, height: 72, objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' },
  uploadRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' },
  fileInput: { display: 'none' },
};
