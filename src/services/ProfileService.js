import { httpClient } from '../config/AxiosHelper';

// Hits ProfileController -> GET /api/v1/me
// Returns { kcId, username, name, gmail, friends: string[], roomHistory: string[] }
export const getMyProfile = async () => {
  const response = await httpClient.get('/api/v1/me');
  return response.data;
};