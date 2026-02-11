/**
 * EmptyState — displayed when a list/section has no data.
 *
 * Renders inside the layout, never replaces it.
 *
 * Usage:
 *   {data.length === 0 ? (
 *     <EmptyState
 *       icon="golf"
 *       title="No tee times yet"
 *       description="Create your first tee time to get started."
 *       actionLabel="Create Tee Time"
 *       onAction={handleCreate}
 *     />
 *   ) : <List data={data} />}
 */
import React, { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { IconButton } from 'react-native-paper';
import { MotiView } from 'moti';
import { AppText } from '../primitives/AppText';
import { AppButton } from '../primitives/AppButton';
import { spacing, animation } from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';

export interface EmptyStateProps {
  /** Material icon name. */
  icon?: string;
  /** Headline. */
  title: string;
  /** Supporting text. */
  description?: string;
  /** CTA button label. */
  actionLabel?: string;
  /** CTA callback. */
  onAction?: () => void;
  /** Style override. */
  style?: ViewStyle;
}

function EmptyStateInner({
  icon = 'information-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
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
          backgroundColor: colors.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <IconButton icon={icon} size={36} iconColor={colors.textMuted} />
      </View>

      <AppText variant="titleMedium" align="center" style={{ marginBottom: spacing.sm }}>
        {title}
      </AppText>

      {description ? (
        <AppText
          variant="bodyMedium"
          color="textSecondary"
          align="center"
          style={{ marginBottom: spacing.xl }}
        >
          {description}
        </AppText>
      ) : null}

      {actionLabel && onAction ? (
        <AppButton mode="contained" onPress={onAction}>
          {actionLabel}
        </AppButton>
      ) : null}
    </MotiView>
  );
}

export const EmptyState = memo(EmptyStateInner);
EmptyState.displayName = 'EmptyState';
