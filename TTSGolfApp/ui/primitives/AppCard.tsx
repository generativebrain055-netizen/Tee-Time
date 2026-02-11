/**
 * AppCard — token-based card component.
 *
 * Built on Paper's Card for elevation + theming. Supports Moti entry anim.
 *
 * Usage:
 *   <AppCard>
 *     <AppCard.Title title="Round" subtitle="Tomorrow 8 AM" />
 *     <AppCard.Content><Text>…</Text></AppCard.Content>
 *     <AppCard.Actions><AppButton mode="text">View</AppButton></AppCard.Actions>
 *   </AppCard>
 */
import React, { memo, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Card, type CardProps } from 'react-native-paper';
import { MotiView } from 'moti';
import { componentTokens, animation } from '../theme/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppCardProps extends Omit<CardProps, 'style' | 'elevation' | 'children'> {
  /** NativeWind classes on outer wrapper. */
  wrapperClassName?: string;
  /** Animate entry. */
  animateEntry?: boolean;
  /** Stagger delay. */
  entryDelay?: number;
  /** Style override (escape hatch). */
  style?: ViewStyle;
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AppCardInner({
  wrapperClassName,
  animateEntry = false,
  entryDelay = 0,
  style,
  children,
  ...rest
}: AppCardProps) {
  const Wrapper = animateEntry ? MotiView : View;
  const motiProps = animateEntry
    ? {
        from: { opacity: 0, translateY: 12 },
        animate: { opacity: 1, translateY: 0 },
        transition: {
          type: 'timing' as const,
          duration: animation.duration.normal,
          delay: entryDelay,
        },
      }
    : {};

  return (
    <Wrapper className={wrapperClassName} {...(motiProps as any)}>
      <Card
        style={[{ borderRadius: componentTokens.card.borderRadius }, style]}
        {...(rest as any)}
      >
        {children}
      </Card>
    </Wrapper>
  );
}

const AppCardComponent = memo(AppCardInner);

export const AppCard = Object.assign(AppCardComponent, {
  Title: Card.Title,
  Content: Card.Content,
  Actions: Card.Actions,
  Cover: Card.Cover,
  displayName: 'AppCard',
});

export default AppCard;
