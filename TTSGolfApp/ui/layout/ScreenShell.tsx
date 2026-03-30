/**
 * ScreenShell — the ONE layout wrapper every screen must use.
 *
 * Provides:
 * - Safe area insets
 * - Token-based background color
 * - Optional Moti fade-in entry animation
 * - Stable layout that never unmounts (no `if (loading) return null`)
 *
 * Usage:
 *   <ScreenShell>
 *     <AppHeader title="Home" />
 *     {loading ? <ContentSkeleton /> : <Content />}
 *   </ScreenShell>
 */
import React, { memo, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  type ViewStyle,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { animation } from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SafeAreaEdges = ('top' | 'bottom' | 'left' | 'right')[];

export interface ScreenShellProps {
  children: ReactNode;
  /** NativeWind classes for the SafeAreaView. Defaults to `"flex-1"`. */
  className?: string;
  /** Which safe-area edges to apply. Default: ['top', 'left', 'right'] (excludes bottom for AppBottomNav). */
  edges?: SafeAreaEdges;
  /** Animate entry (fade-in). Default: true. */
  animate?: boolean;
  /** Additional inline style (avoid — prefer NativeWind classes). */
  style?: ViewStyle;
  /** StatusBar style. Default: 'dark'. */
  statusBarStyle?: 'light' | 'dark';
  /** Override background color (uses token colors.background by default). */
  backgroundColor?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ScreenShellInner({
  children,
  className = 'flex-1',
  edges = ['top', 'left', 'right'], // Default: exclude bottom for AppBottomNav
  animate = true,
  style,
  statusBarStyle = 'dark',
  backgroundColor,
}: ScreenShellProps) {
  const colors = useColors();
  const bg = backgroundColor ?? colors.background;
  const insets = useSafeAreaInsets();

  const inner = animate ? (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: animation.duration.fast }}
      style={{ flex: 1 }}
      pointerEvents="box-none"
    >
      {children}
    </MotiView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );

  return (
    <SafeAreaView
      className={className}
      edges={edges}
      style={[{ flex: 1, backgroundColor: bg }, style]}
    >
      <StatusBar
        barStyle={statusBarStyle === 'dark' ? 'dark-content' : 'light-content'}
        backgroundColor={bg}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const ScreenShell = memo(ScreenShellInner);
ScreenShell.displayName = 'ScreenShell';
