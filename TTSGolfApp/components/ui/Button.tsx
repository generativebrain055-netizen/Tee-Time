/**
 * Modern Button Component with NativeWind
 * 
 * Features:
 * - Type-safe variants using class-variance-authority
 * - Full NativeWind/Tailwind styling
 * - Press animations
 * - Loading states
 * - Icon support
 * 
 * @example
 * <Button variant="primary" size="lg" onPress={handlePress}>
 *   Get Started
 * </Button>
 * 
 * <Button variant="outline" icon={<Plus />} iconPosition="left">
 *   Add Item
 * </Button>
 */
import React, { useCallback, useRef } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  Animated,
  Pressable,
  type ViewStyle,
} from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

/**
 * Button variants definition using CVA
 * Provides type-safe variant management for consistent styling
 */
const buttonVariants = cva(
  // Base styles applied to all buttons
  "flex-row items-center justify-center rounded-md active:opacity-90",
  {
    variants: {
      variant: {
        primary: "bg-primary active:bg-primary-dark",
        secondary: "bg-gray-100 active:bg-gray-200",
        outline: "border-2 border-primary bg-transparent active:bg-primary-50",
        ghost: "bg-transparent active:bg-gray-100",
        destructive: "bg-error active:bg-red-600",
        link: "bg-transparent",
      },
      size: {
        sm: "h-10 px-4",
        md: "h-12 px-6",
        lg: "h-14 px-8",
        xl: "h-16 px-10",
        icon: "h-10 w-10 px-0",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

const buttonTextVariants = cva(
  // Base text styles
  "text-center font-semibold",
  {
    variants: {
      variant: {
        primary: "text-white",
        secondary: "text-text-primary",
        outline: "text-primary",
        ghost: "text-text-primary",
        destructive: "text-white",
        link: "text-primary underline",
      },
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        icon: "text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  /** Button label */
  children?: React.ReactNode;
  /** Alternative to children for simple text */
  title?: string;
  /** Press handler */
  onPress?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state - shows spinner */
  loading?: boolean;
  /** Icon element to display */
  icon?: React.ReactNode;
  /** Icon position relative to text */
  iconPosition?: "left" | "right";
  /** Additional container styles */
  className?: string;
  /** Additional text styles */
  textClassName?: string;
  /** Additional inline styles (for animations) */
  style?: ViewStyle;
}

export function Button({
  children,
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = "right",
  variant,
  size,
  fullWidth,
  className,
  textClassName,
  style,
}: ButtonProps) {
  // Press animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const isDisabled = disabled || loading;
  const buttonContent = title || children;

  // Get the text color for the loading spinner
  const spinnerColor = variant === "primary" || variant === "destructive" 
    ? "#FFFFFF" 
    : "#5EBC68";

  return (
    <Animated.View 
      style={[{ transform: [{ scale: scaleAnim }] }, style]}
      className={fullWidth ? "w-full" : undefined}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
        className={cn(
          buttonVariants({ variant, size, fullWidth }),
          isDisabled && "opacity-50",
          className
        )}
      >
        {loading ? (
          <ActivityIndicator color={spinnerColor} size="small" />
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <View className="mr-2">{icon}</View>
            )}
            {buttonContent && (
              <Text
                className={cn(
                  buttonTextVariants({ variant, size }),
                  textClassName
                )}
              >
                {buttonContent}
              </Text>
            )}
            {icon && iconPosition === "right" && (
              <View className="ml-2">{icon}</View>
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * IconButton - Circular button for icon-only actions
 */
export interface IconButtonProps extends Omit<ButtonProps, "children" | "title" | "size"> {
  /** Size of the icon button */
  size?: "sm" | "md" | "lg";
}

export function IconButton({
  icon,
  size = "md",
  variant = "ghost",
  className,
  ...props
}: IconButtonProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <Button
      variant={variant}
      size="icon"
      icon={icon}
      iconPosition="left"
      className={cn(sizeClasses[size], "rounded-full", className)}
      {...props}
    />
  );
}

export default Button;
