/**
 * useAppTheme – provides typed access to the active Paper MD3 theme
 * and exposes dark/light mode helpers.
 */
import { useTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";

/** Typed shortcut for `useTheme()` that always returns MD3Theme */
export function useAppTheme(): MD3Theme {
  return useTheme<MD3Theme>();
}

export default useAppTheme;
