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
 */
import React, { memo, useCallback, useMemo } from 'react';
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
}

const TabItem = memo(({
  tab,
  isActive,
  onPress,
  activeColor,
  inactiveColor,
}: TabItemProps) => {
  const IconComponent = tab.icon;
  const handlePress = useCallback(() => onPress(tab), [tab, onPress]);
  const color = isActive ? activeColor : inactiveColor;

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
    >
      <IconComponent
        size={24}
        color={color}
        strokeWidth={isActive ? 2.5 : 2}
      />
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
        />
      ))}
    </View>
  );
}

export const AppBottomNav = memo(AppBottomNavInner);
AppBottomNav.displayName = 'AppBottomNav';
