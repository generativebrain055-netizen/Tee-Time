/**
 * Card Component with NativeWind
 * 
 * Composable card with header, content, and footer sections
 * 
 * @example
 * <Card>
 *   <CardHeader>
 *     <Text className="text-lg font-bold">Title</Text>
 *   </CardHeader>
 *   <CardContent>
 *     <Text>Content goes here</Text>
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 */
import React from "react";
import { View, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const cardVariants = cva(
  "rounded-md bg-bg-card overflow-hidden",
  {
    variants: {
      variant: {
        default: "border border-border",
        elevated: "shadow-md",
        flat: "",
        outlined: "border-2 border-border",
      },
      padding: {
        none: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "elevated",
      padding: "none",
    },
  }
);

export interface CardProps extends ViewProps, VariantProps<typeof cardVariants> {
  className?: string;
  children?: React.ReactNode;
}

export function Card({
  className,
  variant,
  padding,
  children,
  ...props
}: CardProps) {
  return (
    <View
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    >
      {children}
    </View>
  );
}

/**
 * CardHeader - Top section of the card, typically contains title
 */
export interface CardSectionProps extends ViewProps {
  className?: string;
  children?: React.ReactNode;
}

export function CardHeader({ className, children, ...props }: CardSectionProps) {
  return (
    <View className={cn("p-4 pb-2", className)} {...props}>
      {children}
    </View>
  );
}

/**
 * CardContent - Main content area of the card
 */
export function CardContent({ className, children, ...props }: CardSectionProps) {
  return (
    <View className={cn("p-4 pt-0", className)} {...props}>
      {children}
    </View>
  );
}

/**
 * CardFooter - Bottom section, typically contains actions
 */
export function CardFooter({ className, children, ...props }: CardSectionProps) {
  return (
    <View 
      className={cn("p-4 pt-2 flex-row items-center border-t border-border", className)} 
      {...props}
    >
      {children}
    </View>
  );
}

export default Card;
