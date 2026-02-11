/**
 * AppSearchBar — tokenized search bar.
 */
import React, { memo } from 'react';
import { Searchbar, type SearchbarProps } from 'react-native-paper';
import { componentTokens, fontFamily } from '../theme/tokens';

export interface AppSearchBarProps extends Omit<SearchbarProps, 'style'> {
  style?: SearchbarProps['style'];
}

function AppSearchBarInner({ style, ...rest }: AppSearchBarProps) {
  return (
    <Searchbar
      style={[{ borderRadius: componentTokens.input.borderRadius }, style]}
      inputStyle={{ fontFamily: fontFamily.regular }}
      {...rest}
    />
  );
}

export const AppSearchBar = memo(AppSearchBarInner);
AppSearchBar.displayName = 'AppSearchBar';
