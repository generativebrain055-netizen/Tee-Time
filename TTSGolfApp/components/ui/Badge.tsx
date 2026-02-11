/**
 * Badge Component with NativeWind
 * 
 * Small status indicators and labels
 * 
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" size="sm">Pending</Badge>
 */
import React from "react";
import { View, Text, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const badgeVariants = cva(
  "flex-row items-center justify-center rounded-full",
  {
    variants: {
      variant: {
        default: "bg-gray-100",
        primary: "bg-primary",
        secondary: "bg-gray-200",
        success: "bg-green-100",
        warning: "bg-yellow-100",
        error: "bg-red-100",
        info: "bg-blue-100",
        outline: "border border-border bg-transparent",
      },
      size: {
        sm: "px-2 py-0.5",
        md: "px-2.5 py-1",
        lg: "px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

const badgeTextVariants = cva(
  "font-medium",
  {
    variants: {
      variant: {
        default: "text-text-primary",
        primary: "text-white",
        secondary: "text-text-secondary",
        success: "text-green-700",
        warning: "text-yellow-700",
        error: "text-red-700",
        info: "text-blue-700",
        outline: "text-text-primary",
      },
      size: {
        sm: "text-xs",
        md: "text-xs",
        lg: "text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
  /** Optional icon to display before text */
  icon?: React.ReactNode;
}

export function Badge({
  className,
  textClassName,
  variant,
  size,
  children,
  icon,
  ...props
}: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <View className="mr-1">{icon}</View>}
      <Text className={cn(badgeTextVariants({ variant, size }), textClassName)}>
        {children}
      </Text>
    </View>
  );
}

export default Badge;
