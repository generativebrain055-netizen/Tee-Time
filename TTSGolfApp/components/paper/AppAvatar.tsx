/**
 * AppAvatar — Paper Avatar wrapper
 *
 * Usage:
 *   <AppAvatar type="text" label="JD" size={48} />
 *   <AppAvatar type="image" source={{ uri: url }} size={40} />
 *   <AppAvatar type="icon" icon="account" size={32} />
 */
import React, { memo } from "react";
import { Avatar } from "react-native-paper";

export interface AppAvatarProps {
  type?: "text" | "image" | "icon";
  label?: string;
  icon?: string;
  source?: { uri: string };
  size?: number;
  style?: any;
  className?: string;
}

function AppAvatarInner({
  type = "text",
  label = "",
  icon = "account",
  source,
  size = 40,
  style,
}: AppAvatarProps) {
  switch (type) {
    case "image":
      return <Avatar.Image size={size} source={source!} style={style} />;
    case "icon":
      return <Avatar.Icon size={size} icon={icon} style={style} />;
    case "text":
    default:
      return (
        <Avatar.Text
          size={size}
          label={label}
          labelStyle={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
          style={style}
        />
      );
  }
}

export const AppAvatar = memo(AppAvatarInner);
