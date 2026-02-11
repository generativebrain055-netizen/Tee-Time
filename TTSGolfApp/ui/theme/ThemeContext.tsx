/**
 * Theme Context — provides typed access to the active color palette
 * and dark/light mode state. Integrates with Paper + NativeWind.
 *
 * Usage:
 *   const { colors, isDark, toggleTheme } = useAppTheme();
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  colors as semanticColors, 
  type ThemeMode, 
  type SemanticColors,
  fontFamily,
  spacing,
  radii,
  shadows,
  fontSize,
  typeScale,
} from './tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ThemeSetting = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** User's setting (light / dark / system) */
  setting: ThemeSetting;
  /** Resolved mode actually displayed */
  mode: ThemeMode;
  /** Shorthand for `mode === 'dark'` */
  isDark: boolean;
  /** Active semantic color palette */
  colors: SemanticColors;
  /** Change the stored setting */
  setSetting: (s: ThemeSetting) => void;
  /** Quick toggle light ↔ dark */
  toggleTheme: () => void;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = '@tts_golf_theme';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ThemeProviderProps {
  children: ReactNode;
  defaultSetting?: ThemeSetting;
}

export function AppThemeProvider({
  children,
  defaultSetting = 'light',
}: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const [setting, setSettingState] = useState<ThemeSetting>(defaultSetting);
  const [loaded, setLoaded] = useState(false);

  // Hydrate persisted preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') {
          setSettingState(v);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const mode: ThemeMode = useMemo(() => {
    if (setting === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return setting;
  }, [setting, systemScheme]);

  const isDark = mode === 'dark';
  const activeColors = isDark ? semanticColors.dark : semanticColors.light;

  const setSetting = useCallback((s: ThemeSetting) => {
    setSettingState(s);
    AsyncStorage.setItem(STORAGE_KEY, s);
  }, []);

  const toggleTheme = useCallback(() => {
    setSetting(isDark ? 'light' : 'dark');
  }, [isDark, setSetting]);

  const value = useMemo<ThemeContextValue>(
    () => ({ setting, mode, isDark, colors: isDark ? semanticColors.dark : semanticColors.light, setSetting, toggleTheme }),
    [setting, mode, isDark, setSetting, toggleTheme],
  );

  // Prevent flash-of-wrong-theme — render nothing for 1 tick while loading
  // NOTE: The tree is still mounted; navigation never unmounts.
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Typed access to the active theme. */
export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside <AppThemeProvider>');
  return ctx;
}

/** Shorthand — returns only the active color palette. */
export function useColors(): SemanticColors {
  return useAppTheme().colors;
}

/** Returns the full theme including tokens (fontFamily, spacing, etc.) */
export function useTheme() {
  const { colors, isDark } = useAppTheme();
  return {
    colors,
    isDark,
    fontFamily,
    spacing,
    radii,
    shadows,
    fontSize,
    typeScale,
  };
}
