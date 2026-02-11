/**
 * Separator Component with NativeWind
 * 
 * Visual divider between sections
 * 
 * @example
 * <Separator />
 * <Separator orientation="vertical" />
 * <Separator className="my-4" />
 */
import React from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "../../utils/cn";

export interface SeparatorProps extends ViewProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Separator({
  orientation = "horizontal",
  className,
  ...props
}: SeparatorProps) {
  return (
    <View
      className={cn(
        "bg-border",
        orientation === "horizontal" ? "h-px w-full" : "w-px h-full",
        className
      )}
      {...props}
    />
  );
}

export default Separator;
