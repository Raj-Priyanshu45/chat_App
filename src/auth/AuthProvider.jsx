import { createContext, useContext, useEffect, useRef, useState } from 'react';
import keycloak from './keycloak';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [initialized, setInitialized] = useState(false);
  const isRun = useRef(false);

  console.log("AuthProvider Render");
  useEffect(() => {
    console.log("useEffect running");
    if (isRun.current) return;
    isRun.current = true;

    let interval;

    const initKeycloak = async () => {
      try {

        console.log(import.meta.env);
console.log(import.meta.env.VITE_KEYCLOAK_URL);
console.log(import.meta.env.VITE_KEYCLOAK_REALM);
console.log(import.meta.env.VITE_KEYCLOAK_CLIENT_ID);


        const authenticated = await keycloak.init({
  onLoad: "login-required",
  pkceMethod: "S256",
  checkLoginIframe: false,
  silentCheckSsoFallback: false,
  enableLogging: true,
});

console.log("Authenticated:", authenticated);
console.log("Token:", keycloak.token);

        if (!authenticated) {
          await keycloak.login();
          return;
        }

        setInitialized(true);

        interval = setInterval(async () => {
          try {
            await keycloak.updateToken(60);
          } catch (error) {
            console.error(error);
            keycloak.login();
          }
        }, 30000);
      } catch (error) {
        console.error('Keycloak initialization failed', error);
      }
    };

    initKeycloak();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!initialized) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '24px',
          color: '#fff',
          background: '#020617',
        }}
      >
        Authenticating...
      </div>
    );
  }

  return <AuthContext.Provider value={{ keycloak }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}