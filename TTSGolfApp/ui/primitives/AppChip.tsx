/**
 * AppChip — tokenized chip/tag component.
 */
import React, { memo } from 'react';
import { Chip, type ChipProps } from 'react-native-paper';

export interface AppChipProps extends ChipProps {}

function AppChipInner(props: AppChipProps) {
  return <Chip {...props} />;
}

export const AppChip = memo(AppChipInner);
AppChip.displayName = 'AppChip';
