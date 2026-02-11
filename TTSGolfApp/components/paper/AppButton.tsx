/**
 * AppButton — Paper Button + moti press animation
 *
 * Usage:
 *   <AppButton mode="contained" onPress={fn}>Get Started</AppButton>
 *   <AppButton mode="outlined" icon="arrow-left">Back</AppButton>
 *   <AppButton mode="text" compact>Skip</AppButton>
 */
import React, { memo } from "react";
import { View } from "react-native";
import { Button, type ButtonProps } from "react-native-paper";
import { MotiView } from "moti";
import { transitions } from "../../theme/animations";

export interface AppButtonProps extends ButtonProps {
  /** Extra nativewind layout classes on the outer wrapper */
  wrapperClassName?: string;
  /** Animate entry (fade-in-up by default) */
  animateEntry?: boolean;
  /** Entry delay in ms */
  entryDelay?: number;
}

function AppButtonInner({
  wrapperClassName,
  animateEntry = false,
  entryDelay = 0,
  style,
  ...rest
}: AppButtonProps) {
  const Wrapper = animateEntry ? MotiView : View;
  const motiProps = animateEntry
    ? {
        from: { opacity: 0, translateY: 10 },
        animate: { opacity: 1, translateY: 0 },
        transition: { ...transitions.standard, delay: entryDelay },
      }
    : {};

  return (
    <Wrapper className={wrapperClassName} {...motiProps}>
      <Button
        contentStyle={{ height: 52 }}
        labelStyle={{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 16 }}
        style={[{ borderRadius: 14 }, style as any]}
        {...rest}
      />
    </Wrapper>
  );
}

export const AppButton = memo(AppButtonInner);
