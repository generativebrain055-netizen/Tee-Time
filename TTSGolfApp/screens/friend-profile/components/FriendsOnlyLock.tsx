import React, { memo } from "react";
import { View, Text } from "react-native";
import { MotiView } from "moti";
import { Users } from "lucide-react-native";
import { transitions } from "../../../theme/animations";

interface Props {
  fullName: string;
}

const FriendsOnlyLock = memo(({ fullName }: Props) => (
  <MotiView
    from={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={transitions.standard}
    className="flex-col items-center justify-center py-16 px-8"
  >
    <View className="w-16 h-16 rounded-full border-2 border-primary items-center justify-center mb-4 bg-white">
      <Users size={32} color="#5EBC68" />
    </View>
    <Text className="text-lg font-bold text-text-primary mb-1">Friends only</Text>
    <Text className="text-sm text-text-secondary text-center">
      Only {fullName}'s friends can see their profile
    </Text>
  </MotiView>
));

export default FriendsOnlyLock;
