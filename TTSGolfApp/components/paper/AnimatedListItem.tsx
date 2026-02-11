/**
 * AnimatedListItem — moti-powered staggered list row
 *
 * Usage:
 *   {items.map((item, i) => (
 *     <AnimatedListItem index={i} key={item.id}>
 *       <AppCard>…</AppCard>
 *     </AnimatedListItem>
 *   ))}
 */
import React, { memo } from "react";
import { MotiView } from "moti";
import { transitions } from "../../theme/animations";

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  /** ms between each item (default 50) */
  staggerMs?: number;
  className?: string;
}

function AnimatedListItemInner({
  children,
  index,
  staggerMs = 50,
  className,
}: AnimatedListItemProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        ...transitions.standard,
        delay: index * staggerMs,
      }}
      className={className}
    >
      {children}
    </MotiView>
  );
}

export const AnimatedListItem = memo(AnimatedListItemInner);
