import React, { memo, ReactNode } from "react";
import { View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { cn } from "../../utils/cn";

interface HeaderProps {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  rightComponent?: ReactNode;
  leftComponent?: ReactNode;
  transparent?: boolean;
  lightContent?: boolean;
  style?: ViewStyle;
}

const Header = memo(({
  title,
  onBack,
  showBack = true,
  rightComponent,
  leftComponent,
  transparent = false,
  lightContent = false,
  style,
}: HeaderProps) => {
  const insets = useSafeAreaInsets();
  const iconColor = lightContent ? "#FFFFFF" : "#1F2937";

  return (
    <View
      className={cn(
        transparent ? "border-b-0 bg-transparent" : "bg-white border-b border-border"
      )}
      style={[{ paddingTop: insets.top + 8 }, style]}
    >
      <View className="flex-row items-center justify-between px-4 pb-3 min-h-[44px]">
        <View className="w-[60px] items-start">
          {leftComponent ? (
            leftComponent
          ) : showBack && onBack ? (
            <TouchableOpacity
              className="p-1"
              onPress={onBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={24} color={iconColor} />
            </TouchableOpacity>
          ) : (
            <View className="w-8" />
          )}
        </View>
        <View className="flex-1 items-center">
          <Text
            className={cn(
              "text-[17px] font-semibold",
              lightContent ? "text-white" : "text-text-primary"
            )}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View className="w-[60px] items-end">
          {rightComponent || <View className="w-8" />}
        </View>
      </View>
    </View>
  );
});

export default Header;
