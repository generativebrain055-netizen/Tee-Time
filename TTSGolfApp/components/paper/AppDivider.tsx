/**
 * AppDivider — Paper Divider
 */
import React, { memo } from "react";
import { Divider } from "react-native-paper";

function AppDividerInner(props: React.ComponentProps<typeof Divider>) {
  return <Divider {...props} />;
}

export const AppDivider = memo(AppDividerInner);
