import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, UserPlus, Clock, Users } from 'lucide-react-native';
import { friendApi, type DiscoveredUser } from '../services/api';
import { logger } from '../utils/logger';

interface UserProfileScreenProps {
  navigation: any;
  route: {
    params: {
      userId: string;
    };
  };
}

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

const getAvatarColor = (id: string): string => {
  const colors = [
    '#10B981', // green-500
    '#3B82F6', // blue-500
    '#8B5CF6', // purple-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#EC4899', // pink-500
  ];
  const index = parseInt(id.slice(-2), 16) % colors.length;
  return colors[index];
};

const Avatar: React.FC<{ user: DiscoveredUser }> = ({ user }) => {
  if (user.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        className="w-24 h-24 rounded-full object-cover border-4 border-white"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        }}
      />
    );
  }

  return (
    <View
      className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-white"
      style={{
        backgroundColor: getAvatarColor(user.id),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <Text className="text-2xl font-bold text-white">
        {getInitials(user.firstName, user.lastName)}
      </Text>
    </View>
  );
};

export default function UserProfileScreen({ navigation, route }: UserProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { userId } = route.params;
  const [user, setUser] = useState<DiscoveredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const handleBack = useCallback(() => {
    if (typeof navigation?.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation?.navigate('Home');
  }, [navigation]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await friendApi.getUserProfile(userId);
        if (response.success && response.profile) {
          setUser(response.profile);
        }
      } catch (error) {
        logger.error('[UserProfileScreen] Fetch user profile error', error);
        Alert.alert('Error', 'Failed to load user profile');
        handleBack();
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, handleBack]);

  const handleAddFriend = useCallback(async () => {
    if (!user || user.friendshipStatus !== 'none') return;

    setRequesting(true);
    try {
      const response = await friendApi.sendRequest(user.id);
      if (response.success) {
        setUser(prev => prev ? { ...prev, friendshipStatus: 'requested' } : null);
        Alert.alert('Success', 'Friend request sent!');
      }
    } catch (error: any) {
      logger.error('[UserProfileScreen] Send friend request error', error);
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setRequesting(false);
    }
  }, [user]);

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  const getButtonConfig = () => {
    switch (user.friendshipStatus) {
      case 'friend':
        return {
          icon: Users,
          text: 'Friends',
          className: 'bg-gray-100',
          textClassName: 'text-gray-600',
          disabled: true,
        };
      case 'requested':
      case 'pending':
        return {
          icon: Clock,
          text: 'Requested',
          className: 'bg-green-500',
          textClassName: 'text-white',
          disabled: true,
        };
      default:
        return {
          icon: UserPlus,
          text: 'Add friend',
          className: 'bg-green-500',
          textClassName: 'text-white',
          disabled: false,
        };
    }
  };

  const buttonConfig = getButtonConfig();
  const ButtonIcon = buttonConfig.icon;
  const location = user.location || user.homeCourse || 'Location unknown';

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: 0 }}>
      <StatusBar style="light" />
      
      {/* Header Image Area */}
      <View className="h-40 w-full relative overflow-hidden">
        {/* Golf Course Background */}
        <View className="absolute inset-0 bg-green-800" />
        
        {/* Back Button */}
        <TouchableOpacity
          onPress={handleBack}
          className="absolute p-2 rounded-full z-10 bg-black/10"
          style={{
            top: insets.top + 8,
            left: 16,
          }}
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Content Container - Overlaps Header */}
        <View className="px-6 relative -mt-12 flex-col items-center">
          <Avatar user={user} />
          
          <View className="mt-3 text-center w-full items-center">
            <Text className="text-xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-xs text-gray-500 font-medium">
                {location}
              </Text>
              {user.handicap !== undefined && (
                <>
                  <Text className="text-xs text-gray-300 mx-1">|</Text>
                  <Text className="text-xs text-gray-500 font-medium">
                    Handicap: {user.handicap}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Action Button */}
          <View className="w-full mt-6">
            <TouchableOpacity
              onPress={handleAddFriend}
              disabled={buttonConfig.disabled || requesting}
              className={`w-full py-3.5 rounded-md flex-row items-center justify-center gap-2 ${buttonConfig.className}`}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
              }}
              activeOpacity={0.7}
            >
              {requesting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <ButtonIcon size={18} color={buttonConfig.textClassName.includes('white') ? 'white' : '#6B7280'} />
                  <Text className={`text-sm font-bold ${buttonConfig.textClassName}`}>
                    {buttonConfig.text}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Restricted View State */}
          <View className="mt-16 flex-col items-center text-center pb-8">
            <View className="w-16 h-16 rounded-full border border-green-500 flex items-center justify-center mb-3">
              <Users size={28} color="#10B981" strokeWidth={1.5} />
            </View>
            <Text className="text-sm font-bold text-gray-900">Friends only</Text>
            <Text className="text-xs text-gray-500 mt-1 text-center max-w-[200px]">
              Only {user.firstName}'s friends can see their profile
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
