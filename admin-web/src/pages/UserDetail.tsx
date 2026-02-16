import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getUserProfile,
  updateUser,
  suspendUser,
  unsuspendUser,
  banUser,
  type UserProfileResponse,
  type AdminUser,
} from '../api/client';

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | number>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const res = await getUserProfile(id);
    setLoading(false);
    if (res.success) {
      setData(res.data);
      const u = res.data.user as Record<string, unknown>;
      setEditForm({
        first_name: (u.first_name as string) ?? '',
        last_name: (u.last_name as string) ?? '',
        email: (u.email as string) ?? '',
        username: (u.username as string) ?? '',
        phone_number: (u.phone_number as string) ?? '',
        handicap: (u.handicap as number) ?? '',
        location: (u.location as string) ?? '',
        home_course: (u.home_course as string) ?? '',
        bio: (u.bio as string) ?? '',
      });
    } else setError(res.message || 'Failed to load user');
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveEdit = async () => {
    if (!id) return;
    setSaving(true);
    setActionError(null);
    const res = await updateUser(id, {
      first_name: editForm.first_name || undefined,
      last_name: editForm.last_name || undefined,
      email: editForm.email || undefined,
      username: editForm.username || undefined,
      phone_number: editForm.phone_number || undefined,
      handicap: editForm.handicap === '' ? undefined : Number(editForm.handicap),
      location: editForm.location || undefined,
      home_course: editForm.home_course || undefined,
      bio: editForm.bio || undefined,
    });
    setSaving(false);
    if (res.success) {
      setEditOpen(false);
      load();
    } else setActionError(res.message || 'Update failed');
  };

  const handleSuspend = async () => {
    if (!id || !confirm('Suspend this user? They will not be able to sign in.')) return;
    setActionError(null);
    const res = await suspendUser(id);
    if (res.success) load();
    else setActionError(res.message || 'Suspend failed');
  };

  const handleUnsuspend = async () => {
    if (!id || !confirm('Restore this user\'s access?')) return;
    setActionError(null);
    const res = await unsuspendUser(id);
    if (res.success) load();
    else setActionError(res.message || 'Unsuspend failed');
  };

  const handleBan = async () => {
    if (!id || !confirm('Ban this user? They will be locked out. This can be reversed by unsuspending.')) return;
    setActionError(null);
    const res = await banUser(id);
    if (res.success) load();
    else setActionError(res.message || 'Ban failed');
  };

  if (loading) return <p style={styles.muted}>Loading…</p>;
  if (error || !data) return <div style={styles.error}>{error || 'User not found'}</div>;

  const u = data.user as AdminUser & Record<string, unknown>;
  const { activity } = data;

  const avatarUrl = typeof u.avatar_url === 'string' ? u.avatar_url : null;
  const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'User';

  return (
    <div style={styles.wrapper}>
      <div style={styles.headerRow}>
        <button type="button" onClick={() => navigate('/users')} style={styles.backBtn}>
          ← Users
        </button>
      </div>
      {actionError && <div style={styles.actionError}>{actionError}</div>}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          Full profile
          <button type="button" onClick={() => setEditOpen(true)} style={styles.smallBtn}>
            Edit details
          </button>
        </div>
        <div style={styles.profileHeader}>
          <div style={styles.avatarWrap}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} style={styles.avatar} />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {(u.first_name?.[0] || u.last_name?.[0] || u.username?.[0] || '?').toString().toUpperCase()}
              </div>
            )}
          </div>
          <div style={styles.profileHeaderInfo}>
            <h2 style={styles.title}>{displayName}</h2>
            <span style={{ ...styles.badge, ...(u.is_active ? styles.badgeActive : styles.badgeSuspended) }}>
              {u.is_locked ? 'Banned' : u.is_active ? 'Active' : 'Suspended'}
            </span>
          </div>
        </div>
        <div style={styles.grid}>
          <div><strong>Phone</strong> {String(u.phone_number ?? '') || '—'}</div>
          <div><strong>Email</strong> {String(u.email ?? '') || '—'}</div>
          <div><strong>Username</strong> {String(u.username ?? '') || '—'}</div>
          <div><strong>Social rate</strong> {u.social_rate ?? '—'}</div>
          <div><strong>Handicap</strong> {u.handicap ?? '—'}</div>
          <div><strong>Location</strong> {String(u.location ?? '') || '—'}</div>
          <div><strong>Home course</strong> {String(u.home_course ?? '') || '—'}</div>
          <div><strong>Zip code</strong> {String(u.zip_code ?? '') || '—'}</div>
          <div><strong>Preferred tee time</strong> {String(u.preferred_tee_time ?? '') || '—'}</div>
          <div><strong>Walk or ride</strong> {String(u.walk_or_ride ?? '') || '—'}</div>
          <div><strong>Rounds played</strong> {u.rounds_played != null ? String(u.rounds_played) : '—'}</div>
          <div><strong>Average score</strong> {u.average_score != null ? String(u.average_score) : '—'}</div>
          <div><strong>Member since</strong> {u.created_at ? new Date(u.created_at as string).toLocaleDateString() : '—'}</div>
        </div>
        {(u.bio != null && String(u.bio).trim() !== '') && (
          <div style={styles.bioSection}>
            <strong>Bio</strong>
            <p style={styles.bioText}>{String(u.bio)}</p>
          </div>
        )}
        <div style={styles.actions}>
          {u.is_active ? (
            <button type="button" onClick={handleSuspend} style={styles.dangerBtn}>Suspend</button>
          ) : (
            <button type="button" onClick={handleUnsuspend} style={styles.primaryBtn}>Unsuspend</button>
          )}
          {!u.is_locked && (
            <button type="button" onClick={handleBan} style={styles.dangerBtn}>Ban</button>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Activity history</div>
        <div style={styles.section}>
          <strong>Recent logins</strong>
          {activity.loginLogs.length === 0 ? (
            <p style={styles.muted}>No login logs.</p>
          ) : (
            <table style={styles.smallTable}>
              <thead>
                <tr><th style={styles.th}>Method</th><th style={styles.th}>Status</th><th style={styles.th}>Date</th></tr>
              </thead>
              <tbody>
                {activity.loginLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={styles.td}>{log.login_method}</td>
                    <td style={styles.td}>{log.status}</td>
                    <td style={styles.td}>{log.attempted_at ? new Date(log.attempted_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={styles.section}>
          <strong>Social rate history</strong>
          {activity.socialRateLogs.length === 0 ? (
            <p style={styles.muted}>No social rate changes.</p>
          ) : (
            <table style={styles.smallTable}>
              <thead>
                <tr><th style={styles.th}>Reason</th><th style={styles.th}>Delta</th><th style={styles.th}>New score</th><th style={styles.th}>Date</th></tr>
              </thead>
              <tbody>
                {activity.socialRateLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={styles.td}>{log.reason} {log.reason_details ? `(${log.reason_details})` : ''}</td>
                    <td style={styles.td}>{log.delta > 0 ? '+' : ''}{log.delta}</td>
                    <td style={styles.td}>{log.new_score}</td>
                    <td style={styles.td}>{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editOpen && (
        <div style={styles.modalOverlay} onClick={() => !saving && setEditOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Edit user</h3>
            <div style={styles.form}>
              {(['first_name', 'last_name', 'username', 'phone_number', 'email', 'handicap', 'location', 'home_course'] as const).map((key) => (
                <label key={key} style={styles.label}>
                  {key.replace(/_/g, ' ')}
                  <input
                    type={key === 'email' ? 'email' : 'text'}
                    value={String(editForm[key] ?? '')}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={styles.input}
                  />
                </label>
              ))}
              <label style={styles.label}>
                bio
                <textarea value={String(editForm.bio ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))} style={styles.textarea} rows={3} />
              </label>
            </div>
            <div style={styles.modalActions}>
              <button type="button" onClick={() => !saving && setEditOpen(false)} style={styles.secondaryBtn}>Cancel</button>
              <button type="button" onClick={handleSaveEdit} style={styles.primaryBtn} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { fontFamily: 'var(--font-family)' },
  headerRow: { marginBottom: 'var(--space-lg)' },
  backBtn: { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline' },
  title: { fontSize: 'var(--font-size-2xl)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 0 },
  error: { padding: 'var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)' },
  actionError: { padding: 'var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-lg)' },
  muted: { color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' },
  card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' },
  cardTitle: { fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  smallBtn: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--font-size-sm)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  profileHeader: { display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)' },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: '50%', background: 'var(--color-primary-container)', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-2xl)', fontWeight: 600 },
  profileHeaderInfo: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' },
  bioSection: { marginTop: 'var(--space-md)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)' },
  bioText: { marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' },
  badge: { padding: '2px 8px', borderRadius: 'var(--radius-xs)', fontSize: 'var(--font-size-xs)' },
  badgeActive: { background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' },
  badgeSuspended: { background: 'var(--color-warning-container)', color: 'var(--color-pending-text)' },
  actions: { display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' },
  primaryBtn: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500 },
  dangerBtn: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500 },
  secondaryBtn: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-surface-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' },
  section: { marginTop: 'var(--space-xl)' },
  smallTable: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)' },
  th: { textAlign: 'left', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' },
  td: { padding: 'var(--space-sm)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-2xl)', maxWidth: 480, width: '90%', maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { marginBottom: 'var(--space-lg)' },
  form: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' },
  input: { padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' },
  textarea: { padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', resize: 'vertical' },
  modalActions: { display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-xl)' },
};
