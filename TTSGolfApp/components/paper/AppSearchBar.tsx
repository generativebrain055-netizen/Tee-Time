/**
 * AppSearchBar — Paper Searchbar
 */
import React, { memo } from "react";
import { Searchbar, type SearchbarProps } from "react-native-paper";
import { fontFamilies } from "../../theme/fonts";

export interface AppSearchBarProps extends SearchbarProps {}

function AppSearchBarInner({ style, ...rest }: AppSearchBarProps) {
  return (
    <Searchbar
      inputStyle={{ fontFamily: fontFamilies.regular, fontSize: 15 }}
      style={[{ borderRadius: 14, elevation: 0 }, style as any]}
      {...rest}
    />
  );
}

export const AppSearchBar = memo(AppSearchBarInner);
