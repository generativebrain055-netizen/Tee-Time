/**
 * AppBottomNav — token-driven bottom tab bar.
 *
 * RULES:
 * - Never hardcode colors — uses theme tokens.
 * - Touch targets ≥ 44px.
 * - Font sizes from typeScale.
 *
 * Usage (inside ScreenShell, absolutely positioned):
 *   <AppBottomNav activeTab="Home" navigation={navigation} />
 *
 * Messages tab: when unread, solid green dot on top-right of bubble (matches product nav).
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Clock,
  MessageCircle,
  Users,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { AppText } from '../primitives/AppText';
import {
  spacing,
  componentTokens,
  fontFamily,
  shadows,
} from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';
import { messagesApi } from '../../services/api';

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

interface TabConfig {
  name: string;
  icon: LucideIcon;
  screen: string;
}

const TABS: TabConfig[] = [
  { name: 'Home', icon: Home, screen: 'HomePage' },
  { name: 'Availability', icon: Clock, screen: 'Availability' },
  { name: 'Messages', icon: MessageCircle, screen: 'Messages' },
  { name: 'Players', icon: Users, screen: 'Roster' },
  { name: 'Profile', icon: User, screen: 'Profile' },
];

// ---------------------------------------------------------------------------
// Tab item (memoized)
// ---------------------------------------------------------------------------

interface TabItemProps {
  tab: TabConfig;
  isActive: boolean;
  onPress: (tab: TabConfig) => void;
  activeColor: string;
  inactiveColor: string;
  /** Unread count for Messages tab; dot shown when > 0 */
  messagesUnreadCount?: number;
}

const TabItem = memo(({
  tab,
  isActive,
  onPress,
  activeColor,
  inactiveColor,
  messagesUnreadCount = 0,
}: TabItemProps) => {
  const themeColors = useColors();
  const IconComponent = tab.icon;
  const handlePress = useCallback(() => onPress(tab), [tab, onPress]);
  const color = isActive ? activeColor : inactiveColor;
  const showUnread = tab.name === 'Messages' && messagesUnreadCount > 0;
  const unreadDotColor = activeColor;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        alignItems: 'center',
        minWidth: componentTokens.touchTarget,
        minHeight: componentTokens.touchTarget,
        justifyContent: 'center',
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.name}
      accessibilityHint={showUnread ? `${messagesUnreadCount} unread messages` : undefined}
    >
      <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <IconComponent
          size={24}
          color={color}
          strokeWidth={isActive ? 2.5 : 2}
        />
        {showUnread ? (
          <View
            style={{
              position: 'absolute',
              top: -3,
              right: -2,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: unreadDotColor,
              borderWidth: 2,
              borderColor: themeColors.surface,
            }}
          />
        ) : null}
      </View>
      <AppText
        variant="labelSmall"
        style={{
          fontFamily: isActive ? fontFamily.semiBold : fontFamily.medium,
          color,
          marginTop: 3,
        }}
      >
        {tab.name}
      </AppText>
    </TouchableOpacity>
  );
});

TabItem.displayName = 'TabItem';

// ---------------------------------------------------------------------------
// Bottom Nav
// ---------------------------------------------------------------------------

export interface AppBottomNavProps {
  activeTab: string;
  navigation: any;
  onTabChange?: (tab: string) => void;
}

function AppBottomNavInner({
  activeTab,
  navigation,
  onTabChange,
}: AppBottomNavProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);

  const fetchMessagesUnreadCount = useCallback(async () => {
    try {
      const res = await messagesApi.getUnreadCount();
      if (res?.success && typeof res.total === 'number') {
        setMessagesUnreadCount(res.total);
      }
    } catch {
      // Non-blocking; tab still works without count
    }
  }, []);

  useEffect(() => {
    fetchMessagesUnreadCount();
    const interval = setInterval(fetchMessagesUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchMessagesUnreadCount]);

  const handlePress = useCallback(
    (tab: TabConfig) => {
      onTabChange?.(tab.name);
      navigation?.navigate(tab.screen);
    },
    [navigation, onTabChange],
  );

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: spacing.md,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        ...shadows.sm,
      }}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => (
        <TabItem
          key={tab.name}
          tab={tab}
          isActive={activeTab === tab.name}
          onPress={handlePress}
          activeColor={colors.primary}
          inactiveColor={colors.textSecondary}
          messagesUnreadCount={messagesUnreadCount}
        />
      ))}
    </View>
  );
}

export const AppBottomNav = memo(AppBottomNavInner);
AppBottomNav.displayName = 'AppBottomNav';
