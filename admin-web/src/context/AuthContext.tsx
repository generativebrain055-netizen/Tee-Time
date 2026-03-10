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
  login: (email: string, password: string) => Promise<
    | { ok: true }
    | { ok: false; error?: string; needsMfa?: boolean; temporaryToken?: string }
  >;
  verifyMfa: (temporaryToken: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const isAuthenticated = !!token;

  const login = useCallback(async (email: string, password: string) => {
    const { adminLogin } = await import('../api/client');
    const result = await adminLogin(email, password);
    if (result.success && 'needsMfaVerification' in result && result.needsMfaVerification && result.temporaryToken) {
      return { ok: false, needsMfa: true, temporaryToken: result.temporaryToken, error: undefined };
    }
    if (result.success && 'accessToken' in result && result.accessToken) {
      setAdminToken(result.accessToken);
      setToken(result.accessToken);
      return { ok: true };
    }
    return { ok: false, error: !result.success && 'message' in result ? result.message : 'Login failed.' };
  }, []);

  const verifyMfa = useCallback(async (temporaryToken: string, code: string) => {
    const { adminVerifyMfa } = await import('../api/client');
    const result = await adminVerifyMfa(temporaryToken, code);
    if (result.success && result.accessToken) {
      setAdminToken(result.accessToken);
      setToken(result.accessToken);
      return { ok: true };
    }
    return { ok: false, error: (!result.success && 'message' in result ? result.message : null) || 'Invalid code.' };
  }, []);

  const logout = useCallback(() => {
    removeAdminToken();
    setToken(null);
  }, []);

  const value: AuthContextValue = {
    isAuthenticated,
    login,
    verifyMfa,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
