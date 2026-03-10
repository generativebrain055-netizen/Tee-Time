import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listReports, updateReport, PAGE_SIZE_OPTIONS, type UserReport } from '../api/client';

export function ReportedIssues() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editNotesId, setEditNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listReports(statusFilter || undefined, pageSize, page * pageSize);
    setLoading(false);
    if (res.success) {
      setReports(res.data);
      setTotal(res.total);
    } else setError(res.message || 'Failed to load reports');
  }, [statusFilter, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    setUpdatingId(reportId);
    const res = await updateReport(reportId, { status: newStatus });
    setUpdatingId(null);
    if (res.success) load();
  };

  const handleSaveNotes = async (reportId: string) => {
    setUpdatingId(reportId);
    const res = await updateReport(reportId, { admin_notes: notesValue });
    setUpdatingId(null);
    setEditNotesId(null);
    setNotesValue('');
    if (res.success) load();
  };

  const name = (u: UserReport['reporter']) =>
    u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.phone_number || '—' : '—';

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>User-reported issues</h2>
      <p style={styles.subtitle}>View and mediate conflicts reported by users.</p>
      <div style={styles.toolbar}>
        <label style={styles.label}>
          Status
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} style={styles.select}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </label>
        <div style={styles.toolbarRight}>
          <label style={styles.label}>
            Per page
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} style={styles.select}>
              {PAGE_SIZE_OPTIONS.map((n: number) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          {!loading && reports.length > 0 && total > pageSize && (() => {
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            return (
              <div style={styles.pagination}>
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={styles.smallBtn}>Previous</button>
                <span style={styles.pageInfo}>Page {page + 1} of {totalPages} ({total} total)</span>
                <label style={styles.pageJumpLabel}>
                  Go to page
                  <select value={page + 1} onChange={(e) => setPage(Number((e.target as HTMLSelectElement).value) - 1)} style={styles.select}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={styles.smallBtn}>Next</button>
              </div>
            );
          })()}
        </div>
      </div>
      {error && <div style={styles.error}>{error}</div>}
      {loading ? (
        <p style={styles.muted}>Loading…</p>
      ) : reports.length === 0 ? (
        <p style={styles.muted}>No reports found. If the user_reports table is not created yet, run the migration 006_user_reports.sql.</p>
      ) : (
        <div style={styles.list}>
          {reports.map((r) => (
            <div key={r.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={reportBadge(r.status)}>{r.status}</span>
                <span style={styles.date}>{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div style={styles.row}>
                <strong>Reporter</strong> {name(r.reporter)} {r.reporter?.phone_number ? `(${r.reporter.phone_number})` : ''}
              </div>
              <div style={styles.row}>
                <strong>Reported user</strong>{' '}
                <Link to={`/users/${r.reported_user_id}`} style={styles.link}>{name(r.reported_user)}</Link>
                {r.reported_user?.phone_number ? ` (${r.reported_user.phone_number})` : ''}
              </div>
              <div style={styles.row}>
                <strong>Reason</strong> {r.reason}
              </div>
              {r.description && (
                <div style={styles.row}>
                  <strong>Description</strong> {r.description}
                </div>
              )}
              {r.admin_notes && editNotesId !== r.id && (
                <div style={styles.row}>
                  <strong>Admin notes</strong> {r.admin_notes}
                </div>
              )}
              {editNotesId === r.id ? (
                <div style={styles.notesSection}>
                  <textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} style={styles.textarea} rows={2} placeholder="Admin notes" />
                  <div style={styles.notesActions}>
                    <button type="button" onClick={() => handleSaveNotes(r.id)} style={styles.primaryBtn} disabled={updatingId === r.id}>Save</button>
                    <button type="button" onClick={() => { setEditNotesId(null); setNotesValue(''); }} style={styles.secondaryBtn}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => { setEditNotesId(r.id); setNotesValue(r.admin_notes || ''); }} style={styles.smallBtn}>
                  {r.admin_notes ? 'Edit notes' : 'Add notes'}
                </button>
              )}
              <div style={styles.actions}>
                {r.status === 'pending' && (
                  <button type="button" onClick={() => handleStatusChange(r.id, 'reviewing')} style={styles.secondaryBtn} disabled={updatingId === r.id}>
                    Mark reviewing
                  </button>
                )}
                {(r.status === 'pending' || r.status === 'reviewing') && (
                  <>
                    <button type="button" onClick={() => handleStatusChange(r.id, 'resolved')} style={styles.primaryBtn} disabled={updatingId === r.id}>
                      Resolve
                    </button>
                    <button type="button" onClick={() => handleStatusChange(r.id, 'dismissed')} style={styles.secondaryBtn} disabled={updatingId === r.id}>
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const reportBadge = (status: string): React.CSSProperties => ({
  padding: '2px 8px',
  borderRadius: 'var(--radius-xs)',
  fontSize: 'var(--font-size-xs)',
  background: status === 'resolved' ? 'var(--color-success-container)' : status === 'dismissed' ? 'var(--color-text-muted)' : 'var(--color-warning-container)',
  color: status === 'resolved' ? 'var(--color-on-success-container)' : 'var(--color-text-primary)',
});

const styles: Record<string, React.CSSProperties> = {
  wrapper: { fontFamily: 'var(--font-family)' },
  title: { fontSize: 'var(--font-size-2xl)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' },
  subtitle: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' },
  toolbar: { display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)', alignItems: 'center', justifyContent: 'space-between' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginLeft: 'auto', flexWrap: 'wrap' },
  label: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' },
  pageJumpLabel: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' },
  pagination: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)' },
  pageInfo: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' },
  select: { padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' },
  error: { padding: 'var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-lg)' },
  muted: { color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' },
  list: { display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' },
  card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' },
  date: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' },
  row: { marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' },
  link: { color: 'var(--color-primary)', textDecoration: 'underline' },
  notesSection: { marginTop: 'var(--space-md)' },
  textarea: { width: '100%', padding: 'var(--space-sm)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-sm)' },
  notesActions: { display: 'flex', gap: 'var(--space-sm)' },
  smallBtn: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--font-size-sm)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginTop: 'var(--space-sm)' },
  actions: { display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginTop: 'var(--space-lg)' },
  primaryBtn: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500 },
  secondaryBtn: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-surface-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' },
};
