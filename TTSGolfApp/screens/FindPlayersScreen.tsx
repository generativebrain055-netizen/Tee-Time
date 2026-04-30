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
import { formatPlayerSearchLocationLine } from '../utils/formatting';

interface FindPlayersScreenProps {
  navigation: any;
}

type ExtendedUser = DiscoveredUser & {
  inRoster?: boolean;
  addingToRoster?: boolean;
  onDeck?: boolean;
  firstName?: string;
  lastName?: string;
};

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
  user: ExtendedUser;
  onPress: () => void;
  onAddPress: (e: any) => void;
}> = ({ user, onPress, onAddPress }) => {
  const getButtonStyle = () => {
    if (user.onDeck) {
      return { text: 'On deck', bg: '#DCFCE7', textColor: '#16A34A', disabled: true, icon: Check };
    }
    switch (user.friendshipStatus) {
      case 'friend':
        // Friends must be able to open Add-to-on-deck; roster members were wrongly hidden + button disabled.
        return {
          text: user.inRoster ? 'Add to deck' : '+ Add',
          bg: '#FFFFFF',
          textColor: '#374151',
          disabled: !!user.addingToRoster,
          icon: UserPlus,
        };
      case 'requested':
      case 'pending':
        return { text: 'Pending', bg: '#F3F4F6', textColor: '#6B7280', disabled: true, icon: null as any };
      default:
        return { text: '+ Add', bg: '#FFFFFF', textColor: '#374151', disabled: !!user.addingToRoster, icon: UserPlus };
    }
  };

  const buttonStyle = getButtonStyle();
  const location =
    formatPlayerSearchLocationLine(user.location, user.zipCode) || "Location not set";
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
  const [onDeckUserIds, setOnDeckUserIds] = useState<Set<string>>(new Set());
  
  const debouncedSearch = useDebounce(searchText, 300);
  
  // Load roster and on-deck to know who is in roster / on deck
  useEffect(() => {
    const load = async () => {
      try {
        const [rosterRes, onDeckRes] = await Promise.all([
          rosterApi.getRoster(),
          rosterApi.getOnDeck(),
        ]);
        if (rosterRes.success && rosterRes.roster) {
          const userIds = new Set<string>();
          rosterRes.roster.forEach((item: any) => {
            if (item.contact?.userId) userIds.add(item.contact.userId);
          });
          setRosterUserIds(userIds);
        }
        if (onDeckRes.success && onDeckRes.onDeck) {
          const deckIds = new Set<string>();
          (onDeckRes.onDeck as any[]).forEach((item: any) => {
            const uid = item.contact?.userId || item.userId;
            if (uid) deckIds.add(uid);
          });
          setOnDeckUserIds(deckIds);
        }
      } catch (error) {
        logger.error("[FindPlayersScreen] Failed to load roster/on-deck", error);
      }
    };
    load();
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
        // Normalize name format, mark roster/on-deck status, and exclude users already on roster
        const usersWithRosterStatus = (response.users as any[]).map((user: any) => {
            let firstName = user.firstName || '';
            let lastName = user.lastName || '';
            if (!firstName && !lastName && user.name) {
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
              onDeck: onDeckUserIds.has(user.id),
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
  }, [rosterUserIds, addingToRosterIds, onDeckUserIds]);

  useEffect(() => {
    if (debouncedSearch !== null && debouncedSearch.trim().length >= 2) {
      searchUsers(debouncedSearch);
    } else {
      setUsers([]);
    }
  }, [debouncedSearch, searchUsers]);

  /** Add person to on-deck (add to roster if needed, then move to on-deck). Show confirmation with "View On Deck". */
  const handleAddToOnDeck = useCallback(async (e: any, user: ExtendedUser) => {
    e.stopPropagation();
    if (user.onDeck || user.addingToRoster) return;

    setAddingToRosterIds(prev => new Set(prev).add(user.id));
    try {
      const onDeckRes = await rosterApi.getOnDeck();
      const onDeckList = (onDeckRes.success && onDeckRes.onDeck) ? onDeckRes.onDeck : [];
      const alreadyOnDeck = onDeckList.some((r: any) => r.contact?.userId === user.id);
      if (alreadyOnDeck) {
        setOnDeckUserIds(prev => new Set(prev).add(user.id));
        setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, onDeck: true } : u)));
        Alert.alert('Already on deck', 'This player is already on your on-deck list.');
        return;
      }
      const newPosition = onDeckList.length;

      const findRosterRowId = async (): Promise<string | null> => {
        const rosterRes = await rosterApi.getRoster();
        const roster = rosterRes.success && rosterRes.roster ? rosterRes.roster : [];
        const offDeck = roster.find((r: any) => r.contact?.userId === user.id);
        if (offDeck?.id) return offDeck.id;
        const onDeckHit = onDeckList.find((r: any) => r.contact?.userId === user.id);
        return onDeckHit?.id ?? null;
      };

      let rosterEntryId: string | null = null;
      const payload: any = {};
      if (user.id) payload.contactUserId = user.id;
      if (user.name) payload.contactName = user.name;
      else if (user.firstName || user.lastName) payload.contactName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (user.email) payload.contactEmail = user.email;
      if (user.phone) payload.contactPhone = user.phone;

      try {
        const addRes = await rosterApi.addToRoster(payload);
        if (addRes.success && addRes.entry?.id) rosterEntryId = addRes.entry.id;
      } catch (addErr: any) {
        const msg = String(addErr?.message || '').toLowerCase();
        const dup =
          msg.includes('already in roster') ||
          addErr?.code === 'DUPLICATE_CONTACT' ||
          addErr?.statusCode === 409;
        if (dup) {
          rosterEntryId = await findRosterRowId();
        }
        if (!rosterEntryId) throw addErr;
      }

      if (!rosterEntryId) {
        rosterEntryId = await findRosterRowId();
      }

      if (rosterEntryId) {
        await rosterApi.moveMember(rosterEntryId, { isOnDeck: true, newPosition });
        setOnDeckUserIds(prev => new Set(prev).add(user.id));
        setRosterUserIds(prev => new Set(prev).add(user.id));
        setUsers(prev => prev.map(u =>
          u.id === user.id ? { ...u, inRoster: true, onDeck: true, addingToRoster: false } : u
        ));
        const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
        Alert.alert(
          'Added to on-deck',
          `${userName} has been added to your on-deck list.`,
          [
            { text: 'View On Deck', onPress: () => navigation?.goBack?.() },
            { text: 'OK' },
          ]
        );
      } else {
        Alert.alert(
          'Could not add to deck',
          'We could not find a roster entry for this player. Try again from your Roster screen.',
        );
      }
    } catch (error: any) {
      logger.error('[FindPlayersScreen] Add to on-deck error:', error);
      Alert.alert('Error', error?.message || 'Failed to add to on-deck. Please try again.');
    } finally {
      setAddingToRosterIds(prev => { const s = new Set(prev); s.delete(user.id); return s; });
    }
  }, [navigation]);

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
      onAddPress={(e) => handleAddToOnDeck(e, item)}
    />
  ), [handleUserPress, handleAddToOnDeck]);

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
