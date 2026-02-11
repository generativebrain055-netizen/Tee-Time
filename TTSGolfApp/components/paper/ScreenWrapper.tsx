/**
 * ScreenWrapper — Common screen container with safe area + moti fade-in
 */
import React, { memo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { transitions } from "../../theme/animations";

interface ScreenWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** set false to skip the entry animation */
  animate?: boolean;
}

function ScreenWrapperInner({
  children,
  className = "flex-1 bg-white",
  animate = true,
}: ScreenWrapperProps) {
  return (
    <SafeAreaView className={className}>
      {animate ? (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={transitions.snappy}
          className="flex-1"
        >
          {children}
        </MotiView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

export const ScreenWrapper = memo(ScreenWrapperInner);
