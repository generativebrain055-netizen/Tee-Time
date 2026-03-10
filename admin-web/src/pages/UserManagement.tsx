import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers, PAGE_SIZE_OPTIONS, type AdminUser } from '../api/client';
import { useNotification } from '../context/NotificationContext';

const SEARCH_DEBOUNCE_MS = 300;

export function UserManagement() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setSearchQuery(query.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    searchUsers(searchQuery, pageSize, page * pageSize).then((res) => {
      setLoading(false);
      if (res.success) {
        setUsers(res.data);
        setTotal(res.total);
      } else {
        const msg = res.message || 'Failed to load users';
        setError(msg);
        notify.error(msg);
      }
    });
  }, [searchQuery, page, pageSize, notify]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const openUser = (id: string) => navigate(`/users/${id}`);

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>User management</h2>
      <p style={styles.subtitle}>All users are listed below. Search by phone number or name to filter.</p>
      <div style={styles.toolbar}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Phone number or name..."
          style={styles.input}
        />
        <div style={styles.toolbarRight}>
          <label style={styles.pageSizeLabel}>
            Per page
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} style={styles.select}>
              {PAGE_SIZE_OPTIONS.map((n: number) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          {!loading && users.length > 0 && totalPages > 1 && (
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
          )}
        </div>
      </div>
      {error && <div style={styles.error}>{error}</div>}
      {loading && <p style={styles.muted}>Loading…</p>}
      {!loading && (
        <div style={styles.tableWrap}>
          {users.length === 0 ? (
            <p style={styles.muted}>{query.trim() ? 'No users found.' : 'No users yet.'}</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Username</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Social rate</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td style={styles.td}>{u.username || '—'}</td>
                    <td style={styles.td}>{u.phone_number || '—'}</td>
                    <td style={styles.td}>{u.email || '—'}</td>
                    <td style={styles.td}>{u.social_rate ?? '—'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...(u.is_active ? styles.badgeActive : styles.badgeSuspended) }}>
                        {u.is_locked ? 'Banned' : u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button type="button" onClick={() => openUser(u.id)} style={styles.linkBtn}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { fontFamily: 'var(--font-family)' },
  title: { fontSize: 'var(--font-size-2xl)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' },
  subtitle: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' },
  toolbar: { display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginLeft: 'auto', flexWrap: 'wrap' },
  searchRow: { display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' },
  pageSizeLabel: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' },
  pageJumpLabel: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' },
  select: { padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' },
  pagination: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)' },
  smallBtn: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--font-size-sm)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--color-surface)' },
  pageInfo: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' },
  input: {
    flex: '1 1 200px',
    minWidth: 200,
    padding: 'var(--space-md) var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: 'var(--font-size-base)',
  },
  button: {
    padding: 'var(--space-md) var(--space-xl)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: { padding: 'var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-lg)' },
  muted: { color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' },
  tableWrap: { overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' },
  th: { textAlign: 'left', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: 'var(--space-md) var(--space-lg)' },
  badge: { padding: '2px 8px', borderRadius: 'var(--radius-xs)', fontSize: 'var(--font-size-xs)' },
  badgeActive: { background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' },
  badgeSuspended: { background: 'var(--color-warning-container)', color: 'var(--color-pending-text)' },
  linkBtn: { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0 },
};
