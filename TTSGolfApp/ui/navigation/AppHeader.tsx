/**
 * AppHeader — the ONE header component for every screen.
 *
 * RULES:
 * - No screen may create its own header styles.
 * - Header is ALWAYS rendered inside ScreenShell (never conditionally).
 * - Supports transparent mode for gradient backgrounds.
 * - Minimum touch target 44px for back button.
 *
 * Usage:
 *   <ScreenShell>
 *     <AppHeader title="Roster" onBack={nav.goBack} />
 *     <ContentArea>…</ContentArea>
 *   </ScreenShell>
 *
 *   <AppHeader
 *     title="Profile"
 *     rightComponent={<IconButton icon="cog" onPress={openSettings} />}
 *   />
 */
import React, { memo, type ReactNode } from 'react';
import { View, TouchableOpacity, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { AppText } from '../primitives/AppText';
import { spacing, componentTokens } from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppHeaderProps {
  /** Screen title. */
  title: string;
  /** Back button callback. If omitted, no back button shown. */
  onBack?: () => void;
  /** Show back arrow even without onBack (e.g. custom logic). Default: auto. */
  showBack?: boolean;
  /** Component rendered on the right side (e.g. IconButton). */
  rightComponent?: ReactNode;
  /** Component rendered on the left side (overrides back button). */
  leftComponent?: ReactNode;
  /** Transparent background (for use over gradients). */
  transparent?: boolean;
  /** Light-content mode (white text/icons over dark/gradient bg). */
  lightContent?: boolean;
  /** Extra style override. */
  style?: ViewStyle;
  /** Whether to include safe area top inset. Default true.
   *  Set false if header is inside a ScreenShell that already handles it. */
  includeSafeArea?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AppHeaderInner({
  title,
  onBack,
  showBack,
  rightComponent,
  leftComponent,
  transparent = false,
  lightContent = false,
  style,
  includeSafeArea = false,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const shouldShowBack = showBack ?? !!onBack;
  const textColor = lightContent ? '#FFFFFF' : colors.textPrimary;
  const iconColor = lightContent ? '#FFFFFF' : colors.textPrimary;

  return (
    <View
      style={[
        {
          paddingTop: includeSafeArea ? insets.top + spacing.sm : spacing.sm,
          paddingHorizontal: componentTokens.header.paddingHorizontal,
          paddingBottom: spacing.md,
          backgroundColor: transparent ? 'transparent' : colors.background,
          borderBottomWidth: transparent ? 0 : 1,
          borderBottomColor: transparent ? 'transparent' : colors.border,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: componentTokens.touchTarget,
        }}
      >
        {/* Left slot */}
        <View style={{ width: 60, alignItems: 'flex-start' }}>
          {leftComponent ? (
            leftComponent
          ) : shouldShowBack && onBack ? (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                minWidth: componentTokens.touchTarget,
                minHeight: componentTokens.touchTarget,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={24} color={iconColor} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: componentTokens.touchTarget }} />
          )}
        </View>

        {/* Title */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText
            variant="titleMedium"
            numberOfLines={1}
            style={{ color: textColor }}
          >
            {title}
          </AppText>
        </View>

        {/* Right slot */}
        <View style={{ width: 60, alignItems: 'flex-end' }}>
          {rightComponent ?? <View style={{ width: componentTokens.touchTarget }} />}
        </View>
      </View>
    </View>
  );
}

export const AppHeader = memo(AppHeaderInner);
AppHeader.displayName = 'AppHeader';
