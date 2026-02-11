/**
 * AppText — token-driven text component.
 *
 * Uses the MD3 type scale from tokens, supports all weight/size/color combos.
 * Every piece of text in the app should use this or Paper's Text component.
 *
 * Usage:
 *   <AppText variant="titleMedium">Section Title</AppText>
 *   <AppText variant="bodySmall" color="textSecondary">Hint text</AppText>
 *   <AppText variant="headlineLarge" align="center">Hero</AppText>
 */
import React, { memo, type ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { typeScale, type TypeScaleKey } from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ColorKey =
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'
  | 'textDisabled'
  | 'textInverse'
  | 'primary'
  | 'error'
  | 'success'
  | 'warning'
  | 'info';

export interface AppTextProps extends Omit<RNTextProps, 'style'> {
  /** MD3 type-scale variant. Default: bodyMedium. */
  variant?: TypeScaleKey;
  /** Semantic color key, resolved against the active theme. */
  color?: ColorKey;
  /** Text alignment. */
  align?: 'left' | 'center' | 'right';
  /** Override style (escape hatch — avoid). */
  style?: TextStyle;
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AppTextInner({
  variant = 'bodyMedium',
  color = 'textPrimary',
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const colors = useColors();
  const scale = typeScale[variant];

  const resolvedColor = colors[color as keyof typeof colors] as string | undefined;

  return (
    <RNText
      style={[
        {
          fontFamily: scale.fontFamily,
          fontSize: scale.fontSize,
          lineHeight: scale.lineHeight,
          letterSpacing: scale.letterSpacing,
          color: resolvedColor ?? colors.textPrimary,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

export const AppText = memo(AppTextInner);
AppText.displayName = 'AppText';

export default AppText;
