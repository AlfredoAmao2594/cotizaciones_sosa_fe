import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { login as apiLogin, logout as apiLogout } from "../api/auth";
import { getRefreshToken, setTokens, setUnauthorizedHandler } from "../api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setIsAuthenticated(false));
    // Si hay un refresh token guardado, se asume sesión activa; el próximo request
    // que reciba 401 disparará el flujo de refresh automáticamente.
    setIsAuthenticated(Boolean(getRefreshToken()));
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      loading,
      login: async (email, password) => {
        const tokens = await apiLogin(email, password);
        setTokens(tokens.accessToken, tokens.refreshToken);
        setIsAuthenticated(true);
      },
      logout: () => {
        const refreshToken = getRefreshToken();
        setTokens(null, null);
        setIsAuthenticated(false);
        if (refreshToken) {
          apiLogout(refreshToken).catch(() => undefined);
        }
      },
    }),
    [isAuthenticated, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
