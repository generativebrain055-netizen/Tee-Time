/**
 * AppBadge — small count/status indicator.
 */
import React, { memo } from 'react';
import { Badge, type BadgeProps } from 'react-native-paper';

function AppBadgeInner(props: BadgeProps) {
  return <Badge {...props} />;
}

export const AppBadge = memo(AppBadgeInner);
AppBadge.displayName = 'AppBadge';
