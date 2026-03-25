import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  listReports,
  updateReport,
  PAGE_SIZE_OPTIONS,
  type UserReport,
} from '../api/client';
import { useNotification } from '../context/NotificationContext';

const ADMIN_NOTES_MAX = 2000;

const REPORT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

type MainTab = 'user_reports' | 'app_support';

function categoryLabel(c: string): string {
  const m: Record<string, string> = {
    bug_report: 'Bug report',
    feedback: 'Feedback',
    support: 'Support / contact',
  };
  return m[c] || c;
}

/** Pre-migration 012 rows store category in reason as app_support:<category> */
function appSupportCategoryDisplay(f: UserReport): string | null {
  if (f.support_category) return f.support_category;
  if (f.reason?.startsWith('app_support:')) return f.reason.slice('app_support:'.length);
  return null;
}

function appSupportSubjectDisplay(f: UserReport): string {
  if (f.support_subject) return f.support_subject;
  const d = f.description || '';
  const m = d.match(/^Subject:\s*(.+?)(?:\n\n|\n*$)/s);
  return m ? m[1].trim() : '—';
}

export function ReportedIssues() {
  const notify = useNotification();
  const [mainTab, setMainTab] = useState<MainTab>('user_reports');

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
  const [notesError, setNotesError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<UserReport[]>([]);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackPage, setFeedbackPage] = useState(0);
  const [feedbackPageSize, setFeedbackPageSize] = useState(20);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>('');
  const [feedbackUpdatingId, setFeedbackUpdatingId] = useState<string | null>(null);
  const [feedbackEditNotesId, setFeedbackEditNotesId] = useState<string | null>(null);
  const [feedbackNotesValue, setFeedbackNotesValue] = useState('');
  const [feedbackNotesError, setFeedbackNotesError] = useState<string | null>(null);

  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearchDebounced, setUserSearchDebounced] = useState('');
  const [feedbackSearchInput, setFeedbackSearchInput] = useState('');
  const [feedbackSearchDebounced, setFeedbackSearchDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setUserSearchDebounced(userSearchInput.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [userSearchInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFeedbackSearchDebounced(feedbackSearchInput.trim());
      setFeedbackPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [feedbackSearchInput]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listReports(
      statusFilter || undefined,
      pageSize,
      page * pageSize,
      'user_vs_user',
      userSearchDebounced || undefined,
    );
    setLoading(false);
    if (res.success) {
      setReports(res.data);
      setTotal(res.total);
    } else {
      const msg = res.message || 'Failed to load reports';
      setError(msg);
      notify.error(msg);
    }
  }, [statusFilter, page, pageSize, userSearchDebounced, notify]);

  const loadFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    const res = await listReports(
      feedbackStatusFilter || undefined,
      feedbackPageSize,
      feedbackPage * feedbackPageSize,
      'app_support',
      feedbackSearchDebounced || undefined,
    );
    setFeedbackLoading(false);
    if (res.success) {
      setFeedback(res.data);
      setFeedbackTotal(res.total);
    } else {
      const msg = res.message || 'Failed to load app feedback';
      setFeedbackError(msg);
      notify.error(msg);
    }
  }, [feedbackStatusFilter, feedbackPage, feedbackPageSize, feedbackSearchDebounced, notify]);

  useEffect(() => {
    if (mainTab === 'user_reports') loadReports();
  }, [mainTab, loadReports]);

  useEffect(() => {
    if (mainTab === 'app_support') loadFeedback();
  }, [mainTab, loadFeedback]);

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    setUpdatingId(reportId);
    const res = await updateReport(reportId, { status: newStatus });
    setUpdatingId(null);
    if (res.success) {
      loadReports();
      notify.success(`Report marked as ${newStatus}.`);
    } else notify.error(res.message || 'Failed to update status');
  };

  const handleSaveNotes = async (reportId: string) => {
    setUpdatingId(reportId);
    const res = await updateReport(reportId, { admin_notes: notesValue });
    setUpdatingId(null);
    setEditNotesId(null);
    setNotesValue('');
    if (res.success) {
      loadReports();
      notify.success('Notes saved.');
    } else notify.error(res.message || 'Failed to save notes');
  };

  const handleFeedbackStatusChange = async (id: string, newStatus: string) => {
    setFeedbackUpdatingId(id);
    const res = await updateReport(id, { status: newStatus });
    setFeedbackUpdatingId(null);
    if (res.success) {
      loadFeedback();
      notify.success(`Submission marked as ${newStatus}.`);
    } else notify.error(res.message || 'Failed to update status');
  };

  const handleFeedbackSaveNotes = async (id: string) => {
    setFeedbackUpdatingId(id);
    const res = await updateReport(id, { admin_notes: feedbackNotesValue });
    setFeedbackUpdatingId(null);
    setFeedbackEditNotesId(null);
    setFeedbackNotesValue('');
    if (res.success) {
      loadFeedback();
      notify.success('Notes saved.');
    } else notify.error(res.message || 'Failed to save notes');
  };

  const name = (u: UserReport['reporter']) =>
    u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.phone_number || '—' : '—';

  const feedbackUserName = (u: UserReport['reporter']) =>
    u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.phone_number || u.email || '—' : '—';

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Reported issues</h2>
      <p style={styles.subtitle}>
        Mediate user-vs-user reports and triage Help &amp; Support messages from the mobile app.
      </p>

      <div style={styles.mainTabs}>
        <button
          type="button"
          style={mainTab === 'user_reports' ? styles.mainTabActive : styles.mainTab}
          onClick={() => { setMainTab('user_reports'); setPage(0); }}
        >
          User vs user reports
        </button>
        <button
          type="button"
          style={mainTab === 'app_support' ? styles.mainTabActive : styles.mainTab}
          onClick={() => { setMainTab('app_support'); setFeedbackPage(0); }}
        >
          App support (mobile)
        </button>
      </div>

      {mainTab === 'user_reports' && (
        <>
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
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
              <label style={styles.searchLabel}>
                Search
                <input
                  type="search"
                  value={userSearchInput}
                  onChange={(e) => setUserSearchInput(e.target.value)}
                  placeholder="Reason, description, admin notes (text in the report)…"
                  style={styles.searchInput}
                  autoComplete="off"
                />
              </label>
            </div>
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
            <p style={styles.muted}>
              {userSearchDebounced
                ? 'No reports match your search.'
                : 'No reports found. If the user_reports table is not created yet, run the migration 006_user_reports.sql.'}
            </p>
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
                    {r.reported_user_id ? (
                      <>
                        <Link to={`/users/${r.reported_user_id}`} style={styles.link}>{name(r.reported_user)}</Link>
                        {r.reported_user?.phone_number ? ` (${r.reported_user.phone_number})` : ''}
                      </>
                    ) : (
                      '—'
                    )}
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
                      <textarea
                        value={notesValue}
                        onChange={(e) => { setNotesValue(e.target.value); setNotesError(null); }}
                        style={{ ...styles.textarea, ...(notesError ? styles.textareaError : {}) }}
                        rows={2}
                        placeholder="Admin notes"
                      />
                      <div style={styles.notesMeta}>
                        <span style={notesValue.length > ADMIN_NOTES_MAX ? styles.notesCountError : styles.notesCount}>
                          {notesValue.length} / {ADMIN_NOTES_MAX}
                        </span>
                        {notesError && <span style={styles.fieldError}>{notesError}</span>}
                      </div>
                      <div style={styles.notesActions}>
                        <button type="button" onClick={() => handleSaveNotes(r.id)} style={styles.primaryBtn} disabled={updatingId === r.id || notesValue.length > ADMIN_NOTES_MAX}>Save</button>
                        <button type="button" onClick={() => { setEditNotesId(null); setNotesValue(''); setNotesError(null); }} style={styles.secondaryBtn}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setEditNotesId(r.id); setNotesValue(r.admin_notes || ''); setNotesError(null); }} style={styles.smallBtn}>
                      {r.admin_notes ? 'Edit notes' : 'Add notes'}
                    </button>
                  )}
                  <div style={styles.actions}>
                    <label style={styles.statusLabel}>
                      <span style={styles.statusLabelText}>Status</span>
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        disabled={updatingId === r.id}
                        style={styles.select}
                      >
                        {REPORT_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {mainTab === 'app_support' && (
        <>
          <p style={styles.hint}>
            Submissions from Help &amp; Support in the app. Email is sent from <code>SENDGRID_FROM_EMAIL</code> to{' '}
            <code>SENDGRID_TO_EMAIL</code>; each row is also stored here for triage.
          </p>
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <label style={styles.label}>
                Status
                <select value={feedbackStatusFilter} onChange={(e) => { setFeedbackStatusFilter(e.target.value); setFeedbackPage(0); }} style={styles.select}>
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </label>
              <label style={styles.searchLabel}>
                Search
                <input
                  type="search"
                  value={feedbackSearchInput}
                  onChange={(e) => setFeedbackSearchInput(e.target.value)}
                  placeholder="Subject, message body, category, notes (text in the report)…"
                  style={styles.searchInput}
                  autoComplete="off"
                />
              </label>
            </div>
            <div style={styles.toolbarRight}>
              <label style={styles.label}>
                Per page
                <select value={feedbackPageSize} onChange={(e) => { setFeedbackPageSize(Number(e.target.value)); setFeedbackPage(0); }} style={styles.select}>
                  {PAGE_SIZE_OPTIONS.map((n: number) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              {!feedbackLoading && feedback.length > 0 && feedbackTotal > feedbackPageSize && (() => {
                const totalPages = Math.max(1, Math.ceil(feedbackTotal / feedbackPageSize));
                return (
                  <div style={styles.pagination}>
                    <button type="button" onClick={() => setFeedbackPage((p) => Math.max(0, p - 1))} disabled={feedbackPage === 0} style={styles.smallBtn}>Previous</button>
                    <span style={styles.pageInfo}>Page {feedbackPage + 1} of {totalPages} ({feedbackTotal} total)</span>
                    <label style={styles.pageJumpLabel}>
                      Go to page
                      <select value={feedbackPage + 1} onChange={(e) => setFeedbackPage(Number((e.target as HTMLSelectElement).value) - 1)} style={styles.select}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <button type="button" onClick={() => setFeedbackPage((p) => Math.min(totalPages - 1, p + 1))} disabled={feedbackPage >= totalPages - 1} style={styles.smallBtn}>Next</button>
                  </div>
                );
              })()}
            </div>
          </div>
          {feedbackError && <div style={styles.error}>{feedbackError}</div>}
          {feedbackLoading ? (
            <p style={styles.muted}>Loading…</p>
          ) : feedback.length === 0 ? (
            <p style={styles.muted}>
              {feedbackSearchDebounced
                ? 'No submissions match your search.'
                : (
                  <>
                    No app support submissions yet. Run migration <code>012_user_reports_app_support.sql</code> if the new columns are missing.
                  </>
                )}
            </p>
          ) : (
            <div style={styles.list}>
              {feedback.map((f) => (
                <div key={f.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={reportBadge(f.status)}>{f.status}</span>
                    <span style={styles.date}>{new Date(f.created_at).toLocaleString()}</span>
                  </div>
                  <div style={styles.row}>
                    <strong>Category</strong>{' '}
                    <span style={styles.badgeMuted}>
                      {(() => {
                        const cat = appSupportCategoryDisplay(f);
                        return cat ? categoryLabel(cat) : '—';
                      })()}
                    </span>
                  </div>
                  <div style={styles.row}>
                    <strong>Subject</strong> {appSupportSubjectDisplay(f)}
                  </div>
                  <div style={styles.row}>
                    <strong>From</strong>{' '}
                    <Link to={`/users/${f.reporter_id}`} style={styles.link}>{feedbackUserName(f.reporter)}</Link>
                    {f.reporter?.email ? ` · ${f.reporter.email}` : ''}
                    {f.reporter?.phone_number ? ` · ${f.reporter.phone_number}` : ''}
                  </div>
                  <div style={styles.row}>
                    <strong>Email to team</strong>{' '}
                    {f.email_delivered ? <span style={styles.ok}>Delivered</span> : <span style={styles.warn}>Not confirmed{f.email_error ? `: ${f.email_error}` : ''}</span>}
                  </div>
                  <div style={styles.messageBlock}>
                    <strong>Message</strong>
                    <div style={styles.messageBody}>{f.description || ''}</div>
                  </div>
                  {f.admin_notes && feedbackEditNotesId !== f.id && (
                    <div style={styles.row}>
                      <strong>Admin notes</strong> {f.admin_notes}
                    </div>
                  )}
                  {feedbackEditNotesId === f.id ? (
                    <div style={styles.notesSection}>
                      <textarea
                        value={feedbackNotesValue}
                        onChange={(e) => { setFeedbackNotesValue(e.target.value); setFeedbackNotesError(null); }}
                        style={{ ...styles.textarea, ...(feedbackNotesError ? styles.textareaError : {}) }}
                        rows={2}
                        placeholder="Admin notes"
                      />
                      <div style={styles.notesMeta}>
                        <span style={feedbackNotesValue.length > ADMIN_NOTES_MAX ? styles.notesCountError : styles.notesCount}>
                          {feedbackNotesValue.length} / {ADMIN_NOTES_MAX}
                        </span>
                        {feedbackNotesError && <span style={styles.fieldError}>{feedbackNotesError}</span>}
                      </div>
                      <div style={styles.notesActions}>
                        <button type="button" onClick={() => handleFeedbackSaveNotes(f.id)} style={styles.primaryBtn} disabled={feedbackUpdatingId === f.id || feedbackNotesValue.length > ADMIN_NOTES_MAX}>Save</button>
                        <button type="button" onClick={() => { setFeedbackEditNotesId(null); setFeedbackNotesValue(''); setFeedbackNotesError(null); }} style={styles.secondaryBtn}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setFeedbackEditNotesId(f.id); setFeedbackNotesValue(f.admin_notes || ''); setFeedbackNotesError(null); }} style={styles.smallBtn}>
                      {f.admin_notes ? 'Edit notes' : 'Add notes'}
                    </button>
                  )}
                  <div style={styles.actions}>
                    <label style={styles.statusLabel}>
                      <span style={styles.statusLabelText}>Status</span>
                      <select
                        value={f.status}
                        onChange={(e) => handleFeedbackStatusChange(f.id, e.target.value)}
                        disabled={feedbackUpdatingId === f.id}
                        style={styles.select}
                      >
                        {REPORT_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const reportBadge = (status: string): React.CSSProperties => ({
  padding: '10px 18px',
  borderRadius: 'var(--radius-md)',
  fontSize: '1.125rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'capitalize',
  background: status === 'resolved' ? 'var(--color-success-container)' : status === 'dismissed' ? 'var(--color-text-muted)' : 'var(--color-warning-container)',
  color: status === 'resolved' ? 'var(--color-on-success-container)' : 'var(--color-text-primary)',
  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
});

const styles: Record<string, React.CSSProperties> = {
  wrapper: { fontFamily: 'var(--font-family)' },
  title: { fontSize: 'var(--font-size-2xl)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' },
  subtitle: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' },
  mainTabs: { display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' },
  mainTab: {
    padding: 'var(--space-sm) var(--space-lg)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 500,
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)',
    cursor: 'pointer',
    color: 'var(--color-text-primary)',
  },
  mainTabActive: {
    padding: 'var(--space-sm) var(--space-lg)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    border: '1px solid var(--color-primary)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-primary-container)',
    cursor: 'pointer',
    color: 'var(--color-on-primary-container)',
  },
  hint: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 },
  toolbar: { display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)', alignItems: 'flex-end', justifyContent: 'space-between' },
  toolbarLeft: { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', alignItems: 'flex-end', flex: '1 1 240px' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginLeft: 'auto', flexWrap: 'wrap' },
  label: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' },
  searchLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
    fontSize: 'var(--font-size-sm)',
    minWidth: 'min(100%, 280px)',
    flex: '1 1 220px',
  },
  searchInput: {
    padding: 'var(--space-sm) var(--space-md)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    width: '100%',
    maxWidth: '420px',
  },
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
  badgeMuted: { fontWeight: 500, color: 'var(--color-text-secondary)' },
  ok: { color: 'var(--color-success, #0d7a3e)', fontWeight: 500 },
  warn: { color: 'var(--color-warning, #b45309)', fontWeight: 500 },
  messageBlock: { marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' },
  messageBody: {
    marginTop: 'var(--space-xs)',
    padding: 'var(--space-md)',
    background: 'var(--color-surface-tertiary, #f3f4f6)',
    borderRadius: 'var(--radius-sm)',
    whiteSpace: 'pre-wrap',
    fontSize: 'var(--font-size-sm)',
  },
  notesSection: { marginTop: 'var(--space-md)' },
  notesMeta: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' },
  notesCount: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' },
  notesCountError: { fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' },
  fieldError: { fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' },
  textarea: { width: '100%', padding: 'var(--space-sm)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-sm)' },
  textareaError: { borderColor: 'var(--color-error)' },
  notesActions: { display: 'flex', gap: 'var(--space-sm)' },
  smallBtn: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--font-size-sm)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginTop: 'var(--space-sm)' },
  actions: { display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginTop: 'var(--space-lg)', alignItems: 'center' },
  statusLabel: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' },
  statusLabelText: { fontWeight: 500 },
  primaryBtn: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500 },
  secondaryBtn: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-surface-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' },
};
