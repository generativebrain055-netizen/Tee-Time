/**
 * LoadingOverlay — full-screen centered spinner.
 *
 * Use sparingly — prefer Skeleton for data loading.
 * Use this for actions like "submitting…" or "signing in…"
 *
 * Usage:
 *   <LoadingOverlay visible={submitting} message="Saving…" />
 */
import React, { memo } from 'react';
import { View, ActivityIndicator, type ViewStyle } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { AppText } from '../primitives/AppText';
import { spacing, animation } from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';

export interface LoadingOverlayProps {
  /** Show/hide. */
  visible: boolean;
  /** Optional message below spinner. */
  message?: string;
  /** Style override. */
  style?: ViewStyle;
}

function LoadingOverlayInner({ visible, message, style }: LoadingOverlayProps) {
  const colors = useColors();

  return (
    <AnimatePresence>
      {visible && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'timing', duration: animation.duration.fast }}
          style={[
            {
              ...StyleSheet.absoluteFillObject,
              backgroundColor: colors.overlay,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            },
            style,
          ]}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: spacing['2xl'],
              alignItems: 'center',
              minWidth: 120,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            {message ? (
              <AppText
                variant="bodyMedium"
                color="textSecondary"
                style={{ marginTop: spacing.md }}
              >
                {message}
              </AppText>
            ) : null}
          </View>
        </MotiView>
      )}
    </AnimatePresence>
  );
}

import { StyleSheet } from 'react-native';

export const LoadingOverlay = memo(LoadingOverlayInner);
LoadingOverlay.displayName = 'LoadingOverlay';
