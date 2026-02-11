/**
 * Theme Provider and Hooks
 * 
 * Provides consistent dark/light theme support across the app
 * Integrates with NativeWind's class-based dark mode
 * 
 * @example
 * // In App.tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * 
 * // In components
 * const { theme, toggleTheme, isDark } = useTheme();
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** Current theme setting (light/dark/system) */
  theme: Theme;
  /** Resolved theme (what's actually displayed) */
  resolvedTheme: ResolvedTheme;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Set the theme */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = "@tts_golf_theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme if none is stored */
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const systemColorScheme = useSystemColorScheme();
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored && (stored === "light" || stored === "dark" || stored === "system")) {
        setThemeState(stored as Theme);
      }
      setIsLoaded(true);
    });
  }, []);

  // Resolve the actual theme to use
  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (theme === "system") {
      return systemColorScheme === "dark" ? "dark" : "light";
    }
    return theme;
  }, [theme, systemColorScheme]);

  const isDark = resolvedTheme === "dark";

  // Persist and update theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
  }, [isDark, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      isDark,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, isDark, setTheme, toggleTheme]
  );

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Hook for theme-aware colors
 * Returns colors based on current theme
 * 
 * @example
 * const colors = useThemeColors();
 * <View style={{ backgroundColor: colors.background }}>
 */
export function useThemeColors() {
  const { isDark } = useTheme();
  
  return useMemo(() => ({
    // Backgrounds
    background: isDark ? "#121212" : "#F6F6F6",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    elevated: isDark ? "#2D2D2D" : "#FFFFFF",
    muted: isDark ? "#2A2A2A" : "#F9FAFB",
    
    // Text
    textPrimary: isDark ? "#FFFFFF" : "#1C1C1E",
    textSecondary: isDark ? "#A1A1AA" : "#6B7280",
    textMuted: isDark ? "#71717A" : "#9CA3AF",
    
    // Borders
    border: isDark ? "#374151" : "#E5E7EB",
    borderLight: isDark ? "#4B5563" : "#F3F4F6",
    
    // Primary (same for both)
    primary: "#5EBC68",
    primaryDark: "#4BA85A",
    primaryLight: "#D1FAE5",
    
    // Semantic (same for both)
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",
  }), [isDark]);
}

/**
 * Hook to get className for dark mode with NativeWind
 * 
 * @example
 * const darkClass = useDarkClass();
 * <View className={darkClass("bg-white", "bg-gray-900")}>
 */
export function useDarkClass() {
  const { isDark } = useTheme();
  
  return useCallback((lightClass: string, darkClass: string) => {
    return isDark ? darkClass : lightClass;
  }, [isDark]);
}

export default ThemeProvider;
