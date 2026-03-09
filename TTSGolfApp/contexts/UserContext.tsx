import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profileApi } from '../services/api';
import { logger } from '../utils/logger';

interface UserPreferences {
  preferredTeeTime?: string;
  walkOrRide?: string;
  playingPartnerPreference?: string;
  drinkOfChoice?: string;
}

interface NotificationPreferences {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  types?: { [key: string]: { push?: boolean; inApp?: boolean } };
}

interface PrivacySettings {
  showHandicap?: boolean;
  showLocation?: boolean;
  showPhone?: boolean;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber: string;
  location?: string;
  handicap?: number | string;
  avatarUrl?: string;
  homeCourse?: string;
  bio?: string;
  socialRate?: number | string;
  roundsPlayed?: number;
  clubs?: Array<{ id?: string; name: string; location?: string; type?: string }>;
  preferences?: UserPreferences;
  notificationPreferences?: NotificationPreferences;
  privacySettings?: PrivacySettings;
}

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  fetchProfile: (forceRefresh?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
  isProfileCached: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const CACHE_KEY = 'user_profile_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  profile: UserProfile;
  timestamp: number;
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProfileCached, setIsProfileCached] = useState(false);

  // Load cached profile on mount
  useEffect(() => {
    loadCachedProfile();
  }, []);

  const loadCachedProfile = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { profile: cachedProfile, timestamp }: CachedData = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < CACHE_DURATION) {
          logger.debug('[UserContext] Loading profile from cache');
          setProfile(cachedProfile);
          setIsProfileCached(true);
          return;
        } else {
          logger.debug('[UserContext] Cache expired, will fetch fresh data');
          await AsyncStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      logger.error('[UserContext] Error loading cached profile', error);
    }
  };

  const saveToCache = async (profileData: UserProfile) => {
    try {
      const cacheData: CachedData = {
        profile: profileData,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      logger.debug('[UserContext] Profile saved to cache');
    } catch (error) {
      logger.error('[UserContext] Error saving to cache', error);
    }
  };

  const fetchProfile = useCallback(async (forceRefresh = false) => {
    // If we have cached data and not forcing refresh, skip fetch
    if (profile && !forceRefresh && isProfileCached) {
      logger.debug('[UserContext] Using cached profile, skipping fetch');
      return;
    }

    // Check if user has a token before attempting to fetch
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      logger.debug('[UserContext] No token found, skipping profile fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.debug('[UserContext] Fetching profile from API');
      const response = await profileApi.getCurrentUser();
      
      logger.debug('[UserContext] API Response', {
        success: response.success,
        hasUser: !!response.user,
        userId: response.user?.id,
      });
      
      if (response.success && response.user) {
        logger.debug('[UserContext] User clubs from API', response.user.clubs);
        const u = response.user as { avatarUrl?: string; avatar?: string };
        const avatarUrl = u.avatarUrl || u.avatar || undefined;
        const userProfile: UserProfile = {
          id: response.user.id,
          firstName: response.user.firstName || '',
          lastName: response.user.lastName || '',
          email: response.user.email,
          phoneNumber: response.user.phoneNumber,
          location: response.user.location,
          handicap: response.user.handicap,
          avatarUrl: avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : undefined,
          homeCourse: response.user.homeCourse,
          clubs: response.user.clubs || [],
          bio: response.user.bio,
          socialRate: response.user.socialRate,
          roundsPlayed: response.user.roundsPlayed,
          preferences: response.user.preferences,
          notificationPreferences: response.user.notificationPreferences,
          privacySettings: response.user.privacySettings,
        };

        logger.debug('[UserContext] Setting profile with clubs', userProfile.clubs);
        setProfile(userProfile);
        setIsProfileCached(true);
        await saveToCache(userProfile);
      } else {
        setError('Failed to load profile');
      }
    } catch (err: any) {
      // If user doesn't exist (401/404) or session expired, clear everything (expected on logout)
      if (err.statusCode === 401 || err.statusCode === 404 || err.code === 'SESSION_EXPIRED') {
        logger.info('[UserContext] User not found or session expired, clearing session');
        await clearProfile();
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        const { sessionManager } = await import('../utils/sessionManager');
        await sessionManager.handleSessionExpired();
      } else {
        logger.error('[UserContext] Error fetching profile', err);
        setError(err.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  }, [profile, isProfileCached]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      // Update cache asynchronously
      saveToCache(updated);
      return updated;
    });
  }, []);

  const clearProfile = useCallback(async () => {
    logger.info('[UserContext] Clearing profile and cache');
    setProfile(null);
    setIsProfileCached(false);
    setError(null);
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      logger.error('[UserContext] Error clearing cache', error);
    }
  }, []);

  const value: UserContextType = {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    clearProfile,
    isProfileCached,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
