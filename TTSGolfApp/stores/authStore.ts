import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sessionManager } from '../utils/sessionManager';

interface UserData {
  id?: string;
  firstName: string;
  lastName: string;
  username?: string;
  phoneNumber: string;
  handicap?: number | null;
  socialRate?: number;
  avatar?: string;
  /** From API (login/profile); prefer avatar if both set */
  avatarUrl?: string | null;
}

interface AuthState {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserData | null) => void;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    if (user) {
      AsyncStorage.setItem('user', JSON.stringify(user));
    }
  },

  loadUser: async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await sessionManager.clearSession();
    set({ user: null, isAuthenticated: false });
  },
}));
