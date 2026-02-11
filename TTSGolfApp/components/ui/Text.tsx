/**
 * Text Components with NativeWind
 * 
 * Consistent typography across the app
 * 
 * @example
 * <Heading>Welcome Back</Heading>
 * <Text>Regular body text</Text>
 * <Muted>Secondary information</Muted>
 * <Label>Form Label</Label>
 */
import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const textVariants = cva(
  "",
  {
    variants: {
      variant: {
        default: "text-text-primary",
        secondary: "text-text-secondary",
        muted: "text-text-muted",
        primary: "text-primary",
        error: "text-error",
        success: "text-success",
        white: "text-white",
      },
      size: {
        xs: "text-xs",
        sm: "text-sm",
        base: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        "2xl": "text-2xl",
        "3xl": "text-3xl",
        "4xl": "text-4xl",
      },
      weight: {
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold",
      },
      align: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "base",
      weight: "normal",
      align: "left",
    },
  }
);

export interface TextProps extends RNTextProps, VariantProps<typeof textVariants> {
  className?: string;
  children?: React.ReactNode;
}

export function Text({
  className,
  variant,
  size,
  weight,
  align,
  children,
  ...props
}: TextProps) {
  return (
    <RNText
      className={cn(textVariants({ variant, size, weight, align }), className)}
      {...props}
    >
      {children}
    </RNText>
  );
}

/**
 * Heading - Large titles and section headers
 */
export interface HeadingProps extends Omit<TextProps, "size"> {
  level?: 1 | 2 | 3 | 4;
}

export function Heading({ 
  level = 1, 
  className, 
  children, 
  ...props 
}: HeadingProps) {
  const sizes = {
    1: "text-3xl",
    2: "text-2xl",
    3: "text-xl",
    4: "text-lg",
  };

  return (
    <RNText
      className={cn(
        "text-text-primary font-bold",
        sizes[level],
        className
      )}
      {...props}
    >
      {children}
    </RNText>
  );
}

/**
 * Label - Form labels and small headers
 */
export function Label({ className, children, ...props }: TextProps) {
  return (
    <RNText
      className={cn("text-sm font-semibold text-text-primary mb-1", className)}
      {...props}
    >
      {children}
    </RNText>
  );
}

/**
 * Muted - Secondary/subtle text
 */
export function Muted({ className, children, ...props }: TextProps) {
  return (
    <RNText
      className={cn("text-sm text-text-muted", className)}
      {...props}
    >
      {children}
    </RNText>
  );
}

export default Text;
