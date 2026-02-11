/**
 * AppButton — THE button component for the entire app.
 *
 * Built on React Native Paper's Button for accessibility + theming,
 * enhanced with Moti press animation and token-based sizing.
 *
 * RULES:
 * - No screen may create its own button.
 * - Variants: contained | outlined | text | elevated | contained-tonal
 * - Sizes: sm | md | lg
 * - Loading, disabled, icon support built-in.
 *
 * Usage:
 *   <AppButton onPress={save}>Save</AppButton>
 *   <AppButton mode="outlined" size="sm" icon="arrow-left" onPress={back}>Back</AppButton>
 *   <AppButton mode="text" loading>Submitting...</AppButton>
 */
import React, { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Button, type ButtonProps } from 'react-native-paper';
import { MotiView } from 'moti';
import {
  componentTokens,
  radii,
  fontFamily,
  fontSize,
  animation,
} from '../theme/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends Omit<ButtonProps, 'style'> {
  /** Button size. Default: md */
  size?: ButtonSize;
  /** Extra NativeWind classes on the outer wrapper. */
  wrapperClassName?: string;
  /** Animate entry (fade-in-up). Default: false. */
  animateEntry?: boolean;
  /** Entry delay in ms. */
  entryDelay?: number;
  /** Inline style on the Paper Button (escape hatch). */
  style?: ViewStyle;
  /** Full-width. */
  fullWidth?: boolean;
}

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const heightMap: Record<ButtonSize, number> = componentTokens.button.height;
const paddingMap: Record<ButtonSize, number> = componentTokens.button.paddingHorizontal;
const fontSizeMap: Record<ButtonSize, number> = {
  sm: fontSize.sm,
  md: fontSize.base,
  lg: fontSize.lg,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AppButtonInner({
  size = 'md',
  wrapperClassName,
  animateEntry = false,
  entryDelay = 0,
  style,
  fullWidth = false,
  contentStyle,
  labelStyle,
  ...rest
}: AppButtonProps) {
  const Wrapper = animateEntry ? MotiView : View;
  const motiProps = animateEntry
    ? {
        from: { opacity: 0, translateY: 10 },
        animate: { opacity: 1, translateY: 0 },
        transition: {
          type: 'timing' as const,
          duration: animation.duration.normal,
          delay: entryDelay,
        },
      }
    : {};

  return (
    <Wrapper
      className={wrapperClassName}
      style={fullWidth ? { width: '100%' } : undefined}
      {...(motiProps as any)}
    >
      <Button
        contentStyle={[
          {
            height: heightMap[size],
            paddingHorizontal: paddingMap[size],
          },
          contentStyle,
        ]}
        labelStyle={[
          {
            fontFamily: fontFamily.semiBold,
            fontSize: fontSizeMap[size],
          },
          labelStyle,
        ]}
        style={[
          { borderRadius: componentTokens.button.borderRadius },
          style,
        ]}
        {...rest}
      />
    </Wrapper>
  );
}

export const AppButton = memo(AppButtonInner);
AppButton.displayName = 'AppButton';

export default AppButton;
