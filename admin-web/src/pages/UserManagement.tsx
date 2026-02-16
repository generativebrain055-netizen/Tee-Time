import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers, type AdminUser } from '../api/client';

const SEARCH_DEBOUNCE_MS = 300;

export function UserManagement() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [searchResults, setSearchResults] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all users on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchUsers('').then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) setAllUsers(res.data);
      else setError(res.message || 'Failed to load users');
    });
    return () => { cancelled = true; };
  }, []);

  // When query changes: if empty show all users; if non-empty debounce and search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setSearchLoading(true);
      searchUsers(q).then((res) => {
        setSearchLoading(false);
        if (res.success) setSearchResults(res.data);
        else setSearchResults([]);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const displayList = query.trim() ? (searchResults ?? []) : allUsers;
  const showLoading = loading || (query.trim() && searchLoading);
  const openUser = (id: string) => navigate(`/users/${id}`);

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>User management</h2>
      <p style={styles.subtitle}>All users are listed below. Search by phone number or name to filter.</p>
      <div style={styles.searchRow}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Phone number or name..."
          style={styles.input}
        />
      </div>
      {error && <div style={styles.error}>{error}</div>}
      {showLoading && <p style={styles.muted}>Loading…</p>}
      {!showLoading && (
        <div style={styles.tableWrap}>
          {displayList.length === 0 ? (
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
                {displayList.map((u) => (
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
  searchRow: { display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' },
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
