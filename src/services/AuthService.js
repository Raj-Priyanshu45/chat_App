import { baseURL, httpClient } from '../config/AxiosHelper.js';

export const registerApi = async ({ name, username, gmail, password }) => {
    const response = await httpClient.post('/auth/register', { name, username, gmail, password });
    return response.data;
};

export const loginApi = async (username, password) => {
    const response = await httpClient.post('/auth/login', { username, password });
    return response.data;
};

// Backend: POST /auth/verify-email?key=...  (also logs the user in via cookies)
export const verifyEmailApi = async (key) => {
    const response = await httpClient.post('/auth/verify-email', null, { params: { key } });
    return response.data;
};

// Backend: POST /auth/comp-profile  (only for accounts in INCOMPLETE state, i.e. fresh OAuth users)
export const completeProfileApi = async (name, username) => {
    const response = await httpClient.post('/auth/comp-profile', { name, username });
    return response.data;
};

export const logoutApi = async () => {
    await httpClient.post('/auth/logout');
};

// Full-page redirect, not an axios call: Spring owns the OAuth dance.
// provider: 'google' | 'github'
export const oauthUrl = (provider) => `${baseURL}/oauth2/authorization/${provider}`;

export const forgotPasswordApi = async (gmail) => {
    const response = await httpClient.post('/auth/forgot-password', { gmail });
    return response.data;
};

export const resetPasswordApi = async (token, newPassword) => {
    const response = await httpClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
};
