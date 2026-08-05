import { httpClient } from '../config/AxiosHelper';

export const getMyInfo = async () => {
  const response = await httpClient.get('/api/v1/users/me');
  return response.data;
};

// Paginated user directory. Matches UserController.retAllUsers -> GET /api/v1/users/.
export const getAllUsersApi = async (page = 0, size = 20) => {
  const response = await httpClient.get('/api/v1/users/', {
    params: { page, size },
  });
  return response.data;
};