/**
 * Theme exports — mirrors TTSGolfApp semantic colors for admin.
 */
export const theme = {
  colors: {
    primary: 'var(--color-primary)',
    primaryDark: 'var(--color-primary-dark)',
    primaryLight: 'var(--color-primary-light)',
    background: 'var(--color-background)',
    backgroundSecondary: 'var(--color-background-secondary)',
    surface: 'var(--color-surface)',
    surfaceSecondary: 'var(--color-surface-secondary)',
    textPrimary: 'var(--color-text-primary)',
    textSecondary: 'var(--color-text-secondary)',
    textMuted: 'var(--color-text-muted)',
    border: 'var(--color-border)',
    divider: 'var(--color-divider)',
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    warning: 'var(--color-warning)',
    info: 'var(--color-info)',
  },
  spacing: {
    xs: 'var(--space-xs)',
    sm: 'var(--space-sm)',
    md: 'var(--space-md)',
    lg: 'var(--space-lg)',
    xl: 'var(--space-xl)',
    '2xl': 'var(--space-2xl)',
    '3xl': 'var(--space-3xl)',
    '4xl': 'var(--space-4xl)',
  },
  radii: {
    xs: 'var(--radius-xs)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
  },
  fontFamily: 'var(--font-family)',
  fontSize: {
    xs: 'var(--font-size-xs)',
    sm: 'var(--font-size-sm)',
    base: 'var(--font-size-base)',
    lg: 'var(--font-size-lg)',
    xl: 'var(--font-size-xl)',
    '2xl': 'var(--font-size-2xl)',
  },
} as const;
