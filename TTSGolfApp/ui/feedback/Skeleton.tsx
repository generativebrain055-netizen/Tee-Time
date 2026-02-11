/**
 * Skeleton — Moti-powered loading placeholders.
 *
 * Replaces content, never replaces the screen.
 * Always render inside ScreenShell alongside the header.
 *
 * Usage:
 *   {loading ? <SkeletonCard /> : <ActualCard data={data} />}
 */
import React, { memo, useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { animation } from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';

// ---------------------------------------------------------------------------
// Base Skeleton
// ---------------------------------------------------------------------------

export interface SkeletonProps {
  /** Width (number or '100%'). */
  width?: number | string;
  /** Height. */
  height?: number;
  /** Border radius. Default: 8. */
  radius?: number;
  /** Additional style. */
  style?: ViewStyle;
}

function SkeletonInner({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const colors = useColors();
  return (
    <MotiView
      from={{ opacity: 0.3 }}
      animate={{ opacity: 0.7 }}
      transition={{
        type: 'timing',
        duration: 800,
        loop: true,
      }}
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: colors.surfaceTertiary,
        },
        style,
      ]}
    />
  );
}

export const Skeleton = memo(SkeletonInner);
Skeleton.displayName = 'Skeleton';

// ---------------------------------------------------------------------------
// Pre-built patterns
// ---------------------------------------------------------------------------

/** Multiple skeleton lines for text blocks. */
export const SkeletonText = memo(({ lines = 3 }: { lines?: number }) => (
  <View style={{ gap: 8 }}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height={14}
        width={i === lines - 1 ? '75%' : '100%'}
      />
    ))}
  </View>
));
SkeletonText.displayName = 'SkeletonText';

/** Avatar-shaped skeleton. */
export const SkeletonAvatar = memo(({ size = 40 }: { size?: number }) => (
  <Skeleton width={size} height={size} radius={size / 2} />
));
SkeletonAvatar.displayName = 'SkeletonAvatar';

/** Full card skeleton with avatar + text. */
export const SkeletonCard = memo(({ className }: { className?: string }) => (
  <View className={className} style={{ padding: 16, gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <SkeletonAvatar />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton height={14} width="50%" />
        <Skeleton height={12} width="33%" />
      </View>
    </View>
    <SkeletonText lines={2} />
  </View>
));
SkeletonCard.displayName = 'SkeletonCard';

/** List of skeleton cards for feed/list screens. */
export const SkeletonList = memo(({ count = 3 }: { count?: number }) => (
  <View style={{ gap: 12, padding: 16 }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </View>
));
SkeletonList.displayName = 'SkeletonList';
