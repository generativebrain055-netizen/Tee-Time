import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, UserPlus, Clock } from 'lucide-react-native';
import { friendApi, type DiscoveredUser } from '../services/api';
import { useDebounce } from '../hooks';
import { ScreenShell, AppHeader } from '../ui';

interface FindPlayersScreenProps {
  navigation: any;
}

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

const getAvatarColor = (id: string): string => {
  // Always return green color for consistency
  return '#22C55E'; // Green color matching the app theme
};

const Avatar: React.FC<{ user: DiscoveredUser; size?: 'sm' | 'md' | 'lg' }> = ({ 
  user, 
  size = 'md' 
}) => {
  const sizeMap = {
    sm: 40,
    md: 52,
    lg: 96,
  };
  
  const textSizeMap = {
    sm: 14,
    md: 18,
    lg: 32,
  };

  const avatarSize = sizeMap[size];
  const textSize = textSizeMap[size];
  const borderWidth = size === 'lg' ? 4 : 0;

  if (user.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          borderWidth: borderWidth,
          borderColor: '#FFFFFF',
        }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        backgroundColor: getAvatarColor(user.id),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: borderWidth,
        borderColor: '#FFFFFF',
      }}
    >
      <Text style={{
        fontSize: textSize,
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#FFFFFF',
      }}>
        {getInitials(user.firstName, user.lastName)}
      </Text>
    </View>
  );
};

const UserListItem: React.FC<{
  user: DiscoveredUser;
  onPress: () => void;
  onAddPress: (e: any) => void;
}> = ({ user, onPress, onAddPress }) => {
  const getButtonStyle = () => {
    switch (user.friendshipStatus) {
      case 'friend':
        return {
          text: 'Friends',
          bg: '#F3F4F6',
          textColor: '#6B7280',
          disabled: true,
        };
      case 'requested':
      case 'pending':
        return {
          text: 'Pending',
          bg: '#F3F4F6',
          textColor: '#6B7280',
          disabled: true,
        };
      default:
        return {
          text: '+ Add',
          bg: '#FFFFFF',
          textColor: '#374151',
          disabled: false,
        };
    }
  };

  const buttonStyle = getButtonStyle();
  const location = user.location || user.homeCourse || 'Unknown location';

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 16 }}>
        <View style={{ marginRight: 14 }}>
          <Avatar user={user} size="md" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 16,
            color: '#1F2937',
            marginBottom: 4,
            lineHeight: 20,
          }}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 14,
            color: '#9CA3AF',
            lineHeight: 18,
          }}>
            {location}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onAddPress}
        disabled={buttonStyle.disabled}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 20,
          backgroundColor: buttonStyle.bg,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          minWidth: 80,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={0.7}
      >
        <Text style={{
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 14,
          color: buttonStyle.textColor,
        }}>
          {buttonStyle.text}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function FindPlayersScreen({ navigation }: FindPlayersScreenProps) {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<DiscoveredUser[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading=true to fetch initial users
  const [requestingIds, setRequestingIds] = useState<Set<string>>(new Set());
  
  const debouncedSearch = useDebounce(searchText, 300);

  const handleBack = useCallback(() => {
    navigation?.goBack();
  }, [navigation]);

  const searchUsers = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const response = await friendApi.discoverUsers();
      if (response.success && response.users) {
        if (query.trim()) {
          // Filter users by search query locally
          const filtered = response.users.filter(user => {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            const searchLower = query.toLowerCase();
            return fullName.includes(searchLower) || 
                   user.username?.toLowerCase().includes(searchLower) ||
                   user.location?.toLowerCase().includes(searchLower);
          });
          setUsers(filtered);
        } else {
          // Show all suggested users when no search query
          setUsers(response.users.slice(0, 20)); // Limit to 20 suggested users
        }
      }
    } catch (error) {
      console.error('Search users error:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load suggested users on mount
  useEffect(() => {
    searchUsers('');
  }, []);

  useEffect(() => {
    if (debouncedSearch !== null) {
      searchUsers(debouncedSearch);
    }
  }, [debouncedSearch, searchUsers]);

  const handleAddFriend = useCallback(async (e: any, user: DiscoveredUser) => {
    e.stopPropagation();
    
    if (user.friendshipStatus !== 'none') return;

    setRequestingIds(prev => new Set(prev).add(user.id));
    
    try {
      const response = await friendApi.sendRequest(user.id);
      if (response.success) {
        // Update user's status locally
        setUsers(prevUsers =>
          prevUsers.map(u =>
            u.id === user.id
              ? { ...u, friendshipStatus: 'requested' as const }
              : u
          )
        );
        Alert.alert('Success', 'Friend request sent!');
      }
    } catch (error: any) {
      console.error('Send friend request error:', error);
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setRequestingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
  }, []);

  const handleUserPress = useCallback((user: DiscoveredUser) => {
    navigation?.navigate('FriendProfile', { userId: user.id, user });
  }, [navigation]);

  const handleClearSearch = useCallback(() => {
    setSearchText('');
    setUsers([]);
  }, []);

  const renderUser = useCallback(({ item }: { item: DiscoveredUser }) => (
    <UserListItem
      user={item}
      onPress={() => handleUserPress(item)}
      onAddPress={(e) => handleAddFriend(e, item)}
    />
  ), [handleUserPress, handleAddFriend]);

  const keyExtractor = useCallback((item: DiscoveredUser) => item.id, []);

  return (
    <ScreenShell>
      <AppHeader
        title="Find players"
        onBack={handleBack}
      />

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF' }}>
        <View style={{ position: 'relative' }}>
          <TextInput
            placeholder="Search"
            value={searchText}
            onChangeText={setSearchText}
            style={{
              width: '100%',
              backgroundColor: '#F9FAFB',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              paddingRight: 40,
              fontSize: 15,
              fontFamily: 'PlusJakartaSans_400Regular',
              color: '#1F2937',
            }}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: [{ translateY: -10 }],
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#D1D5DB',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List Content */}
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {loading ? (
          <View style={{ flex: 1, paddingTop: 20 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#E5E7EB', marginRight: 14 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ width: 140, height: 16, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 6 }} />
                  <View style={{ width: 100, height: 14, backgroundColor: '#E5E7EB', borderRadius: 4 }} />
                </View>
                <View style={{ width: 80, height: 40, backgroundColor: '#E5E7EB', borderRadius: 20 }} />
              </View>
            ))}
          </View>
        ) : users.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
            <Search size={56} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 17,
              color: '#6B7280',
              marginTop: 20,
              textAlign: 'center',
            }}>
              {searchText ? 'No users found' : 'No players available'}
            </Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 14,
              color: '#9CA3AF',
              marginTop: 8,
              textAlign: 'center',
            }}>
              {searchText ? 'Try a different search' : 'Check back later'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        )}
      </View>
    </ScreenShell>
  );
}
