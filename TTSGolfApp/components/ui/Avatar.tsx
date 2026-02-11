/**
 * Avatar Component with NativeWind
 * 
 * User avatar with image support and fallback initials
 * 
 * @example
 * <Avatar size="lg">
 *   <AvatarImage source={{ uri: user.avatar }} />
 *   <AvatarFallback>{user.initials}</AvatarFallback>
 * </Avatar>
 * 
 * // Simple usage
 * <Avatar 
 *   source={{ uri: user.avatar }} 
 *   fallback={user.initials}
 *   size="md" 
 * />
 */
import React, { useState } from "react";
import { View, Image, Text, type ImageSourcePropType, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const avatarVariants = cva(
  "rounded-full overflow-hidden bg-gray-200 items-center justify-center",
  {
    variants: {
      size: {
        xs: "w-6 h-6",
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-12 h-12",
        xl: "w-16 h-16",
        "2xl": "w-20 h-20",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const avatarTextVariants = cva(
  "font-semibold text-text-secondary",
  {
    variants: {
      size: {
        xs: "text-xs",
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
        xl: "text-lg",
        "2xl": "text-xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface AvatarProps extends ViewProps, VariantProps<typeof avatarVariants> {
  className?: string;
  children?: React.ReactNode;
  /** Simple prop for image source */
  source?: ImageSourcePropType;
  /** Simple prop for fallback text (usually initials) */
  fallback?: string;
}

export function Avatar({
  className,
  size,
  children,
  source,
  fallback,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Simple usage - source and fallback props
  if (source || fallback) {
    return (
      <View className={cn(avatarVariants({ size }), className)} {...props}>
        {source && !imageError ? (
          <Image
            source={source}
            className="w-full h-full"
            onError={() => setImageError(true)}
          />
        ) : (
          <Text className={cn(avatarTextVariants({ size }))}>
            {fallback}
          </Text>
        )}
      </View>
    );
  }

  // Composable usage - with children
  return (
    <View className={cn(avatarVariants({ size }), className)} {...props}>
      {children}
    </View>
  );
}

/**
 * AvatarImage - Image within composable Avatar
 */
export interface AvatarImageProps {
  source: ImageSourcePropType;
  className?: string;
  onError?: () => void;
}

export function AvatarImage({ source, className, onError }: AvatarImageProps) {
  return (
    <Image
      source={source}
      className={cn("w-full h-full", className)}
      onError={onError}
    />
  );
}

/**
 * AvatarFallback - Fallback content (usually initials) for composable Avatar
 */
export interface AvatarFallbackProps extends VariantProps<typeof avatarTextVariants> {
  children: React.ReactNode;
  className?: string;
}

export function AvatarFallback({ 
  children, 
  size, 
  className 
}: AvatarFallbackProps) {
  return (
    <Text className={cn(avatarTextVariants({ size }), className)}>
      {children}
    </Text>
  );
}

/**
 * Helper to generate initials from name
 */
export function getInitials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export default Avatar;
