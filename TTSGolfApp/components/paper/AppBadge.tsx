/**
 * AppBadge — Paper Badge
 */
import React, { memo } from "react";
import { Badge } from "react-native-paper";

function AppBadgeInner(props: React.ComponentProps<typeof Badge>) {
  return <Badge {...props} />;
}

export const AppBadge = memo(AppBadgeInner);
