/**
 * AppDivider — thin horizontal rule from tokens.
 */
import React, { memo } from 'react';
import { Divider, type DividerProps } from 'react-native-paper';

export interface AppDividerProps extends DividerProps {
  className?: string;
}

function AppDividerInner(props: AppDividerProps) {
  return <Divider {...props} />;
}

export const AppDivider = memo(AppDividerInner);
AppDivider.displayName = 'AppDivider';
