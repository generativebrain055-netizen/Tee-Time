import { Outlet } from 'react-router-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/users', label: 'Users' },
  { to: '/reports', label: 'Reported issues' },
  { to: '/courses', label: 'Golf courses' },
  { to: '/ad-slots', label: 'Ad slots' },
  { to: '/broadcast', label: 'Broadcast' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <img src="/logo.png" alt="Tee Time" style={styles.logoImg} />
          <span style={styles.logoSub}>Admin</span>
        </div>
        <nav style={styles.nav}>
          {navItems.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{
                ...styles.navLink,
                ...((to === '/' ? location.pathname === '/' : location.pathname === to || location.pathname.startsWith(to + '/')) ? styles.navLinkActive : {}),
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <button type="button" onClick={handleSignOut} style={styles.logoutButton}>
            Sign out
          </button>
        </div>
      </aside>
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>Admin</h1>
        </header>
        <div style={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: 'var(--font-family)',
  },
  sidebar: {
    width: 240,
    background: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--space-2xl) var(--space-lg)',
  },
  logo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 'var(--space-3xl)',
  },
  logoImg: {
    height: 40,
    width: 'auto',
    objectFit: 'contain',
  },
  logoSub: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
    marginTop: 4,
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  navLink: {
    padding: 'var(--space-md) var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
  },
  navLinkActive: {
    background: 'var(--color-primary-container)',
    color: 'var(--color-primary-dark)',
    fontWeight: 600,
  },
  sidebarFooter: {
    paddingTop: 'var(--space-lg)',
    borderTop: '1px solid var(--color-divider)',
  },
  logoutButton: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-background-secondary)',
  },
  header: {
    height: 56,
    padding: '0 var(--space-2xl)',
    background: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  content: {
    flex: 1,
    padding: 'var(--space-2xl)',
    overflow: 'auto',
  },
};
