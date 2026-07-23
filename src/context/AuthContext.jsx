import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Keycloak from 'keycloak-js';
import { getAuthToken, setAuthToken } from '../config/AxiosHelper';

const AuthContext = createContext(null);

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8181/',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'chat-app',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'vite-frontend',
};

const parseUser = (keycloak) => {
  const parsed = keycloak.tokenParsed || {};
  return {
    subject: parsed.sub || '',
    name: parsed.name || parsed.preferred_username || parsed.email || parsed.sub || '',
    username: parsed.preferred_username || parsed.email || parsed.sub || '',
    email: parsed.email || '',
  };
};

export const AuthProvider = ({ children }) => {
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState(getAuthToken());
  const [user, setUser] = useState(null);
  const [keycloak, setKeycloak] = useState(null);

  useEffect(() => {
    const kc = new Keycloak(keycloakConfig);

    kc.init({ onLoad: 'login-required', pkceMethod: 'S256' })
      .then((isAuthenticated) => {
        setKeycloak(kc);
        setAuthenticated(isAuthenticated);

        if (isAuthenticated && kc.token) {
          setToken(kc.token);
          setAuthToken(kc.token);
          setUser(parseUser(kc));
        } else {
          setAuthToken(null);
        }

        setAuthInitialized(true);
      })
      .catch(() => {
        setKeycloak(kc);
        setAuthInitialized(true);
      });
  }, []);

  useEffect(() => {
    if (!keycloak || !authenticated) return undefined;

    const refreshToken = async () => {
      try {
        const refreshed = await keycloak.updateToken(30);
        if (refreshed) {
          setToken(keycloak.token);
          setAuthToken(keycloak.token);
          setUser(parseUser(keycloak));
        }
      } catch {
        setAuthToken(null);
        setAuthenticated(false);
        setUser(null);
      }
    };

    const interval = window.setInterval(refreshToken, 60000);
    return () => window.clearInterval(interval);
  }, [keycloak, authenticated]);

  const login = useCallback(() => {
    if (!keycloak) return Promise.reject(new Error('Keycloak is not initialized yet'));
    return keycloak.login();
  }, [keycloak]);

  const logout = useCallback(() => {
    if (!keycloak) return;
    keycloak.logout({ redirectUri: window.location.origin });
    setAuthToken(null);
    setToken(null);
    setAuthenticated(false);
    setUser(null);
  }, [keycloak]);

  const value = useMemo(
    () => ({
      authInitialized,
      authenticated,
      token,
      user,
      login,
      logout,
      keycloak,
    }),
    [authInitialized, authenticated, token, user, login, logout, keycloak]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

export default useAuth;
