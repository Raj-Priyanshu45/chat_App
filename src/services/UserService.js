import { httpClient } from '../config/AxiosHelper';

// Turns user ids into usernames. Backend: GET /api/v1/users/lookup?ids=a,b,c
// Returns { "<id>": "<username>", ... }
export const lookupUsernamesApi = async (ids) => {
  const response = await httpClient.get('/api/v1/users/lookup', {
    params: { ids: ids.join(',') },
  });
  return response.data;
};

// Paginated user directory. Matches UserController.retAllUsers -> GET /api/v1/users/
export const getAllUsersApi = async (page = 0, size = 20) => {
  const response = await httpClient.get('/api/v1/users/', {
    params: { page, size },
  });
  return response.data;
};