/**
 * AppCard — Paper Card with moti entry animation
 *
 * Usage:
 *   <AppCard wrapperClassName="mx-4 mb-3">
 *     <AppCardTitle title="Round Info" subtitle="Tomorrow 8 AM" />
 *     <AppCardContent>…</AppCardContent>
 *     <AppCardActions>
 *       <AppButton mode="text">Details</AppButton>
 *     </AppCardActions>
 *   </AppCard>
 */
import React, { memo } from "react";
import { View } from "react-native";
import { Card, type CardProps } from "react-native-paper";
import { MotiView } from "moti";
import { transitions } from "../../theme/animations";

export interface AppCardProps extends Omit<CardProps, "elevation"> {
  wrapperClassName?: string;
  animateEntry?: boolean;
  entryDelay?: number;
}

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
        transition: { ...transitions.standard, delay: entryDelay },
      }
    : {};

  return (
    <Wrapper className={wrapperClassName} {...motiProps}>
      <Card
        style={[{ borderRadius: 16 }, style as any]}
        {...(rest as any)}
      >
        {children}
      </Card>
    </Wrapper>
  );
}

export const AppCard = memo(AppCardInner);

/** Re-export Paper Card sub-components for convenience */
export const AppCardTitle = Card.Title;
export const AppCardContent = Card.Content;
export const AppCardActions = Card.Actions;
