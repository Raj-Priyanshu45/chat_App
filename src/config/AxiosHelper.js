import axios from 'axios';

export const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

export const httpClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getAuthToken = () => localStorage.getItem('chat_app_token');

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('chat_app_token', token);
    httpClient.defaults.headers.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('chat_app_token');
    delete httpClient.defaults.headers.Authorization;
  }
};

httpClient.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const getWebSocketUrl = () => {
  const url = new URL(baseURL);
  url.protocol = url.protocol.replace(/^http/, 'ws');
  url.pathname = '/chat';
  return url.toString();
};
