/**
 * AppAvatar — token-sized avatar component.
 *
 * Uses Paper's Avatar for theming, supports image + fallback icon.
 *
 * Usage:
 *   <AppAvatar uri={user.photoUrl} size="lg" />
 *   <AppAvatar size="sm" label="JD" />
 */
import React, { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Avatar } from 'react-native-paper';
import { componentTokens } from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AvatarSize = keyof typeof componentTokens.avatar.size;

export interface AppAvatarProps {
  /** Image URI. Falls back to icon or initials. */
  uri?: string | null;
  /** Token-based size key. Default: md. */
  size?: AvatarSize;
  /** Fallback initials (e.g. "JD"). */
  label?: string;
  /** Fallback icon name. Default: "account". */
  icon?: string;
  /** Style override. */
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AppAvatarInner({
  uri,
  size = 'md',
  label,
  icon = 'account',
  style,
}: AppAvatarProps) {
  const px = componentTokens.avatar.size[size];
  const colors = useColors();

  if (uri) {
    return <Avatar.Image size={px} source={{ uri }} style={style} />;
  }

  if (label) {
    return (
      <Avatar.Text
        size={px}
        label={label}
        style={[{ backgroundColor: colors.primaryLight }, style]}
        labelStyle={{ color: colors.primary }}
      />
    );
  }

  return (
    <Avatar.Icon
      size={px}
      icon={icon}
      style={[{ backgroundColor: colors.surfaceSecondary }, style]}
      color={colors.textSecondary}
    />
  );
}

export const AppAvatar = memo(AppAvatarInner);
AppAvatar.displayName = 'AppAvatar';

export default AppAvatar;
