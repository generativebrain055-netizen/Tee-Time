/**
 * Skeleton Component with NativeWind
 * 
 * Loading placeholder with pulse animation
 * 
 * @example
 * <Skeleton className="h-12 w-full rounded-md" />
 * <Skeleton className="h-16 w-16 rounded-full" />
 */
import React, { useEffect, useRef } from "react";
import { View, Animated, type ViewProps } from "react-native";
import { cn } from "../../utils/cn";

export interface SkeletonProps extends ViewProps {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={cn("bg-gray-200 rounded-md", className)}
      style={{ opacity }}
      {...props}
    />
  );
}

/**
 * Pre-built skeleton patterns
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <View className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )} 
        />
      ))}
    </View>
  );
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };
  
  return <Skeleton className={cn("rounded-full", sizes[size])} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <View className={cn("p-4 space-y-3", className)}>
      <View className="flex-row items-center space-x-3">
        <SkeletonAvatar />
        <View className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </View>
      </View>
      <SkeletonText lines={2} />
    </View>
  );
}

export default Skeleton;
