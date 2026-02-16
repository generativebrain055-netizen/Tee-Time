import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { getAdminToken, setAdminToken, removeAdminToken } from '../api/client';

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const isAuthenticated = !!token;

  const login = useCallback(async (email: string, password: string) => {
    const { adminLogin } = await import('../api/client');
    const result = await adminLogin(email, password);
    if (result.success && result.accessToken) {
      setAdminToken(result.accessToken);
      setToken(result.accessToken);
      return { ok: true };
    }
    return { ok: false, error: !result.success && 'message' in result ? result.message : 'Login failed.' };
  }, []);

  const logout = useCallback(() => {
    removeAdminToken();
    setToken(null);
  }, []);

  const value: AuthContextValue = {
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
