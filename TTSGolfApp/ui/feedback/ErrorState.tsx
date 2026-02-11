/**
 * ErrorState — displayed when a fetch or operation fails.
 *
 * Renders inside the layout, never replaces it.
 *
 * Usage:
 *   {error ? (
 *     <ErrorState message={error.message} onRetry={refetch} />
 *   ) : <Content />}
 */
import React, { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { IconButton } from 'react-native-paper';
import { MotiView } from 'moti';
import { AppText } from '../primitives/AppText';
import { AppButton } from '../primitives/AppButton';
import { spacing, animation } from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';

export interface ErrorStateProps {
  /** Error message. */
  message?: string;
  /** Retry callback. */
  onRetry?: () => void;
  /** Retry button label. Default: "Try Again". */
  retryLabel?: string;
  /** Style override. */
  style?: ViewStyle;
}

function ErrorStateInner({
  message = 'Something went wrong. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  style,
}: ErrorStateProps) {
  const colors = useColors();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: animation.duration.normal }}
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing['2xl'],
          paddingVertical: spacing['5xl'],
        },
        style,
      ]}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.errorContainer,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <IconButton icon="alert-circle-outline" size={36} iconColor={colors.error} />
      </View>

      <AppText variant="titleMedium" align="center" style={{ marginBottom: spacing.sm }}>
        Oops!
      </AppText>

      <AppText
        variant="bodyMedium"
        color="textSecondary"
        align="center"
        style={{ marginBottom: spacing.xl }}
      >
        {message}
      </AppText>

      {onRetry ? (
        <AppButton mode="contained" onPress={onRetry}>
          {retryLabel}
        </AppButton>
      ) : null}
    </MotiView>
  );
}

export const ErrorState = memo(ErrorStateInner);
ErrorState.displayName = 'ErrorState';
