import axios from 'axios';

export const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';
export const httpClient = axios.create({
    baseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

/* ---------- session handling ---------- */

// Access token lives 15 min on the backend; we treat it as "stale" a bit earlier.
const SESSION_LIFETIME_MS = 10 * 60 * 1000;

// Endpoints whose success means "the server just issued a fresh JWT cookie".
const SESSION_ISSUING_PATHS = ['/auth/login', '/auth/verify-email', '/auth/comp-profile'];

// A 401 from these must NOT trigger refresh+retry (would loop or make no sense).
const NO_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/verify-email',
    '/auth/refresh-token', '/auth/forgot-password', '/auth/reset-password'];
let sessionIssuedAt = 0;
let refreshPromise = null;
let authFailureHandler = () => {};

const matches = (url, list) => list.some((p) => url?.startsWith(p));

export const setAuthFailureHandler = (fn) => {
  authFailureHandler = fn;
};

// Many requests can 401 at once; they all share one refresh call.
export const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = axios
        .get(`${baseURL}/auth/refresh-token`, { withCredentials: true })
        .then((response) => {
          sessionIssuedAt = Date.now();
          return response;
        })
        .finally(() => {
          refreshPromise = null;
        });
  }
  return refreshPromise;
};

// Used before opening a WebSocket: the cookie is only checked at handshake time.
export const ensureFreshSession = async () => {
  if (Date.now() - sessionIssuedAt > SESSION_LIFETIME_MS) {
    await refreshSession();
  }
};

httpClient.interceptors.response.use(
    (response) => {
      if (matches(response.config.url, SESSION_ISSUING_PATHS)) {
        sessionIssuedAt = Date.now();
      }
      return response;
    },
    async (error) => {
      const original = error.config;
      const status = error.response?.status;

      if (status !== 401 || !original || original._retried || matches(original.url, NO_RETRY_PATHS)) {
        return Promise.reject(error);
      }

      original._retried = true;

      try {
        await refreshSession();
      } catch {
        authFailureHandler();
        return Promise.reject(error);
      }

      return httpClient(original);
    }
);

export const getWebSocketUrl = () => {
    return 'wss://chatcom-gzat.onrender.com/chat';
};