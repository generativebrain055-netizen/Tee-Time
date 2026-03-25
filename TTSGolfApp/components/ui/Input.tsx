/**
 * Input Component with NativeWind
 * 
 * Form inputs with labels, error states, and icons
 * 
 * @example
 * <Input
 *   label="Email"
 *   placeholder="Enter your email"
 *   value={email}
 *   onChangeText={setEmail}
 *   error={errors.email}
 *   leftIcon={<Mail size={20} color="#6B7280" />}
 * />
 */
import React, { useState, useCallback } from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  type TextInputProps as RNTextInputProps,
  type ViewStyle,
} from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const inputContainerVariants = cva(
  "flex-row items-center rounded-md border bg-white px-4",
  {
    variants: {
      variant: {
        default: "border-border",
        focused: "border-primary",
        error: "border-error",
        disabled: "border-border bg-gray-50",
      },
      size: {
        sm: "h-10",
        md: "h-12",
        lg: "h-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

const inputTextVariants = cva(
  "flex-1 text-text-primary",
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
      },
      centered: {
        true: "text-center",
        false: "text-left",
      },
    },
    defaultVariants: {
      size: "md",
      centered: false,
    },
  }
);

export interface InputProps extends Omit<RNTextInputProps, "style"> {
  /** Input label displayed above */
  label?: string;
  /** Error message displayed below */
  error?: string;
  /** Helper text displayed below (when no error) */
  helperText?: string;
  /** Icon displayed on the left */
  leftIcon?: React.ReactNode;
  /** Icon displayed on the right */
  rightIcon?: React.ReactNode;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Center the text */
  centered?: boolean;
  /** Container className */
  containerClassName?: string;
  /** Input className */
  className?: string;
  /** Label className */
  labelClassName?: string;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  size = "md",
  centered = false,
  editable = true,
  containerClassName,
  className,
  labelClassName,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback((e: any) => {
    setIsFocused(true);
    props.onFocus?.(e);
  }, [props.onFocus]);

  const handleBlur = useCallback((e: any) => {
    setIsFocused(false);
    props.onBlur?.(e);
  }, [props.onBlur]);

  // Determine the variant based on state
  const getVariant = () => {
    if (!editable) return "disabled";
    if (error) return "error";
    if (isFocused) return "focused";
    return "default";
  };

  return (
    <View className={cn("w-full", containerClassName)}>
      {label && (
        <Text className={cn("text-sm font-semibold text-text-primary mb-2", labelClassName)}>
          {label}
        </Text>
      )}
      
      <View className={cn(inputContainerVariants({ variant: getVariant(), size }))}>
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        
        <RNTextInput
          className={cn(inputTextVariants({ size, centered }), className)}
          placeholderTextColor="#9CA3AF"
          editable={editable}
          showSoftInputOnFocus={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {rightIcon && <View className="ml-3">{rightIcon}</View>}
      </View>
      
      {error && (
        <Text className="text-xs text-error mt-1">{error}</Text>
      )}
      
      {helperText && !error && (
        <Text className="text-xs text-text-muted mt-1">{helperText}</Text>
      )}
    </View>
  );
}

/**
 * OTPInput - Specialized input for verification codes
 */
export interface OTPInputProps {
  value: string;
  onChangeText: (text: string) => void;
  length?: number;
  error?: string;
  className?: string;
}

export function OTPInput({
  value,
  onChangeText,
  length = 6,
  error,
  className,
}: OTPInputProps) {
  const handleChange = useCallback((text: string) => {
    // Only allow numeric input
    const numericOnly = text.replace(/\D/g, "");
    onChangeText(numericOnly);
  }, [onChangeText]);

  return (
    <View className={cn("w-full items-center", className)}>
      <View className={cn(
        "flex-row items-center justify-center rounded-md border px-6 h-16 w-full",
        error ? "border-error" : "border-border"
      )}>
        <RNTextInput
          className="flex-1 text-center text-3xl font-bold text-text-primary tracking-[12px]"
          placeholder={"0".repeat(length)}
          placeholderTextColor="#D1D5DB"
          value={value}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={length}
          autoFocus
          showSoftInputOnFocus
        />
      </View>
      
      {error && (
        <Text className="text-xs text-error mt-2 text-center">{error}</Text>
      )}
    </View>
  );
}

export default Input;
