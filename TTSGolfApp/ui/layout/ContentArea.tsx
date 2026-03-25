/**
 * ContentArea — scrollable content wrapper that lives inside ScreenShell.
 *
 * Handles:
 * - Pull-to-refresh
 * - Consistent padding from tokens
 * - Bottom padding for BottomNav clearance
 * - Keyboard-aware behavior
 *
 * Usage:
 *   <ScreenShell>
 *     <AppHeader title="Roster" onBack={goBack} />
 *     <ContentArea refreshing={refreshing} onRefresh={onRefresh}>
 *       {data.map(item => <Card key={item.id} … />)}
 *     </ContentArea>
 *   </ScreenShell>
 */
import React, { memo, useMemo, type ReactNode } from 'react';
import {
  ScrollView,
  RefreshControl,
  View,
  Platform,
  type ViewStyle,
} from 'react-native';
import { spacing, componentTokens } from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';

export interface ContentAreaProps {
  children: ReactNode;
  /** Enable pull-to-refresh. */
  refreshing?: boolean;
  /** Pull-to-refresh callback. */
  onRefresh?: () => void;
  /** Additional padding bottom beyond BottomNav clearance. */
  extraBottomPadding?: number;
  /** If true, uses a plain View instead of ScrollView. */
  noScroll?: boolean;
  /** NativeWind className for the inner container. */
  className?: string;
  /** Container style override. */
  style?: ViewStyle;
  /** Content container style override for ScrollView. */
  contentContainerStyle?: ViewStyle;
  /** Show / hide vertical scroll indicator. */
  showsVerticalScrollIndicator?: boolean;
}

function ContentAreaInner({
  children,
  refreshing = false,
  onRefresh,
  extraBottomPadding = 0,
  noScroll = false,
  className,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: ContentAreaProps) {
  const colors = useColors();
  const bottomPad =
    componentTokens.bottomNav.height +
    componentTokens.bottomNav.paddingBottom +
    extraBottomPadding;

  const refreshCtrl = useMemo(() => {
    if (!onRefresh) return undefined;
    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.primary}
        colors={[colors.primary]}
      />
    );
  }, [refreshing, onRefresh, colors.primary]);

  if (noScroll) {
    return (
      <View className={className} style={[{ flex: 1, paddingBottom: bottomPad }, style]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      className={className}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[
        {
          paddingBottom: bottomPad,
          flexGrow: 1,
        },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={refreshCtrl}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
    >
      {children}
    </ScrollView>
  );
}

export const ContentArea = memo(ContentAreaInner);
ContentArea.displayName = 'ContentArea';
