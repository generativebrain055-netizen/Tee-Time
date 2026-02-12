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
import { Search, X, UserPlus, Clock, Check } from 'lucide-react-native';
import { friendApi, rosterApi, type DiscoveredUser } from '../services/api';
import { useDebounce } from '../hooks';
import { ScreenShell, AppHeader } from '../ui';
import { logger } from '../utils/logger';

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

const Avatar: React.FC<{ user: DiscoveredUser | ExtendedUser; size?: 'sm' | 'md' | 'lg' }> = ({ 
  user, 
  size = 'md' 
}) => {
  // Handle both name formats
  const firstName = user.firstName || (user.name ? user.name.split(/\s+/)[0] : '');
  const lastName = user.lastName || (user.name ? user.name.split(/\s+/).slice(1).join(' ') : '');
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
        {getInitials(firstName, lastName)}
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
  const IconComponent = buttonStyle.icon;
  
  // Handle both name formats
  const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const firstName = user.firstName || (user.name ? user.name.split(/\s+/)[0] : '');
  const lastName = user.lastName || (user.name ? user.name.split(/\s+/).slice(1).join(' ') : '');

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
            {displayName || 'Unknown User'}
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
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 20,
          backgroundColor: buttonStyle.bg,
          borderWidth: user.inRoster ? 0 : 1,
          borderColor: '#E5E7EB',
          minWidth: 120,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
        }}
        activeOpacity={0.7}
      >
        {IconComponent && <IconComponent size={16} color={buttonStyle.textColor} strokeWidth={2.5} />}
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
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestingIds, setRequestingIds] = useState<Set<string>>(new Set());
  const [addingToRosterIds, setAddingToRosterIds] = useState<Set<string>>(new Set());
  const [rosterUserIds, setRosterUserIds] = useState<Set<string>>(new Set());
  
  const debouncedSearch = useDebounce(searchText, 300);
  
  // Load roster to check which users are already in roster
  useEffect(() => {
    const loadRoster = async () => {
      try {
        const response = await rosterApi.getRoster();
        if (response.success && response.roster) {
          const userIds = new Set<string>();
          response.roster.forEach((item: any) => {
            if (item.contact?.userId) {
              userIds.add(item.contact.userId);
            }
          });
          setRosterUserIds(userIds);
        }
      } catch (error) {
        logger.error("[FindPlayersScreen] Failed to load roster", error);
      }
    };
    loadRoster();
  }, []);

  const handleBack = useCallback(() => {
    navigation?.goBack();
  }, [navigation]);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setUsers([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await rosterApi.searchUsers(query.trim());
      if (response.success && response.users) {
        // Mark users that are already in roster and normalize name format
        const usersWithRosterStatus = (response.users as any[]).map((user: any) => {
          // Backend returns 'name' as single string, but frontend expects firstName/lastName
          let firstName = user.firstName || '';
          let lastName = user.lastName || '';
          
          if (!firstName && !lastName && user.name) {
            // Parse name string into firstName and lastName
            const nameParts = user.name.trim().split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          }
          
          return {
            ...user,
            firstName,
            lastName,
            inRoster: rosterUserIds.has(user.id),
            addingToRoster: addingToRosterIds.has(user.id),
          };
        });
        setUsers(usersWithRosterStatus);
      } else {
        setUsers([]);
      }
    } catch (error) {
      logger.error('[FindPlayersScreen] Search users error:', error);
      Alert.alert('Error', 'Failed to search users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [rosterUserIds, addingToRosterIds]);

  useEffect(() => {
    if (debouncedSearch !== null && debouncedSearch.trim().length >= 2) {
      searchUsers(debouncedSearch);
    } else {
      setUsers([]);
    }
  }, [debouncedSearch, searchUsers]);

  const handleAddToRoster = useCallback(async (e: any, user: ExtendedUser) => {
    e.stopPropagation();
    
    if (user.inRoster || user.addingToRoster) return;

    setAddingToRosterIds(prev => new Set(prev).add(user.id));
    
    try {
      const payload: any = {};
      
      if (user.id) {
        payload.contactUserId = user.id;
      }
      
      // Handle both name formats (single string or firstName/lastName)
      if (user.name) {
        payload.contactName = user.name;
      } else if (user.firstName || user.lastName) {
        payload.contactName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }
      
      if (user.email) {
        payload.contactEmail = user.email;
      }
      
      if (user.phone) {
        payload.contactPhone = user.phone;
      }
      
      const response = await rosterApi.addToRoster(payload);
      
      if (response.success) {
        logger.info('[FindPlayersScreen] Added to roster', { userId: user.id });
        // Update user's status locally
        setUsers(prevUsers =>
          prevUsers.map(u =>
            u.id === user.id
              ? { ...u, inRoster: true, addingToRoster: false }
              : u
          )
        );
        // Add to roster set
        setRosterUserIds(prev => new Set(prev).add(user.id));
        const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
        Alert.alert('Success', `${userName} has been added to your roster`);
      }
    } catch (error: any) {
      logger.error('[FindPlayersScreen] Add to roster error:', error);
      const errorMessage = error.message || 'Failed to add to roster. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setAddingToRosterIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
  }, []);

  const handleUserPress = useCallback((user: ExtendedUser) => {
    navigation?.navigate('FriendProfile', { userId: user.id, user });
  }, [navigation]);

  const handleClearSearch = useCallback(() => {
    setSearchText('');
    setUsers([]);
  }, []);

  const renderUser = useCallback(({ item }: { item: ExtendedUser }) => (
    <UserListItem
      user={item}
      onPress={() => handleUserPress(item)}
      onAddPress={(e) => handleAddToRoster(e, item)}
    />
  ), [handleUserPress, handleAddToRoster]);

  const keyExtractor = useCallback((item: ExtendedUser) => item.id, []);

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
              {searchText ? 'No users found' : 'Search for players'}
            </Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 14,
              color: '#9CA3AF',
              marginTop: 8,
              textAlign: 'center',
            }}>
              {searchText ? 'Try a different search' : 'Enter at least 2 characters to search'}
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
