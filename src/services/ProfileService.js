import { httpClient } from '../config/AxiosHelper';

// GET /api/v1/me
// Expected: { id, username, name, gmail, friends: string[] (user ids), roomHistory: string[] }
export const getMyProfile = async () => {
  const response = await httpClient.get('/api/v1/me');
  return response.data;
};