import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setAuthFailureHandler } from '../config/AxiosHelper';
import { getMyProfile } from '../services/ProfileService';
import { loginApi, logoutApi } from '../services/AuthService';
import { primeUsername } from '../hooks/useUsernames';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authInitialized, setAuthInitialized] = useState(false);
  const [user, setUser] = useState(null);
  // true when a JWT exists but the account is INCOMPLETE (OAuth user hasn't picked a username yet)
  const [needsProfile, setNeedsProfile] = useState(false);

  // The httpOnly cookie is invisible to JS, so the only way to know who we are is to ask the server.
  const refreshUser = useCallback(async () => {
    try {
      const me = await getMyProfile();
      primeUsername(me.id, me.username);
      setUser(me);
      setNeedsProfile(false);
      return me;
    } catch (error) {
      setUser(null);
      setNeedsProfile(error?.response?.status === 403);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setAuthInitialized(true));
  }, [refreshUser]);

  // Axios calls this when a refresh attempt fails -> session is really gone.
  useEffect(() => {
    setAuthFailureHandler(() => setUser(null));
  }, []);

  const login = useCallback(
      async (username, password) => {
        await loginApi(username, password);
        return refreshUser();
      },
      [refreshUser]
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // cookies may already be gone; clear local state regardless
    }
    setUser(null);
    setNeedsProfile(false);
  }, []);

  const value = useMemo(
      () => ({
        authInitialized,
        authenticated: Boolean(user),
        needsProfile,
        user,
        login,
        logout,
        refreshUser,
      }),
      [authInitialized, user, needsProfile, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

export default useAuth;