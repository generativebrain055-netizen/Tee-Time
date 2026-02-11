/**
 * AppChip — Paper Chip wrapper
 */
import React, { memo } from "react";
import { Chip, type ChipProps } from "react-native-paper";
import { fontFamilies } from "../../theme/fonts";

export interface AppChipProps extends ChipProps {}

function AppChipInner({ style, ...rest }: AppChipProps) {
  return (
    <Chip
      textStyle={{ fontFamily: fontFamilies.medium, fontSize: 13 }}
      style={[{ borderRadius: 20 }, style as any]}
      {...rest}
    />
  );
}

export const AppChip = memo(AppChipInner);
