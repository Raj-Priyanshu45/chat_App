import { httpClient } from '../config/AxiosHelper';

export const getMyInfo = async () => {
  const response = await httpClient.get('/api/v1/users/me');
  return response.data;
};
