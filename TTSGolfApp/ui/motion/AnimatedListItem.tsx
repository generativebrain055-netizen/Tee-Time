/**
 * AnimatedListItem — Moti-powered staggered list row wrapper.
 *
 * Usage:
 *   {items.map((item, i) => (
 *     <AnimatedListItem index={i} key={item.id}>
 *       <AppCard>…</AppCard>
 *     </AnimatedListItem>
 *   ))}
 */
import React, { memo, type ReactNode } from 'react';
import { MotiView } from 'moti';
import { listItemAnim } from './presets';

export interface AnimatedListItemProps {
  children: ReactNode;
  index: number;
  /** Override stagger delay per item (ms). */
  staggerMs?: number;
  /** NativeWind className. */
  className?: string;
}

function AnimatedListItemInner({
  children,
  index,
  staggerMs,
  className,
}: AnimatedListItemProps) {
  const anim = listItemAnim(index);
  if (staggerMs !== undefined) {
    anim.transition = { ...anim.transition, delay: index * staggerMs };
  }

  return (
    <MotiView className={className} {...anim}>
      {children}
    </MotiView>
  );
}

export const AnimatedListItem = memo(AnimatedListItemInner);
AnimatedListItem.displayName = 'AnimatedListItem';
