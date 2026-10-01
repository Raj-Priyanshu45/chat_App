import { httpClient } from '../config/AxiosHelper';

export const getMyInfo = async () => {
  const response = await httpClient.get('/api/v1/me');
  return response.data;
};

/*
 * Convert internal Mongo user IDs -> usernames.
 *
 * Example request:
 * /api/v1/users/lookup?ids=abc&ids=xyz
 *
 * Example response:
 * {
 *   "abc": "priyanshu",
 *   "xyz": "rahul"
 * }
 */
export const lookupUsernamesApi = async (ids = []) => {
  const uniqueIds = [
    ...new Set(
        ids.filter(
            (id) =>
                typeof id === 'string' &&
                id.trim().length > 0
        )
    ),
  ].slice(0, 100);

  if (uniqueIds.length === 0) {
    return {};
  }

  const response = await httpClient.get(
      '/api/v1/users/lookup',
      {
        params: {
          ids: uniqueIds,
        },
        paramsSerializer: {
          indexes: null,
        },
      }
  );

  return response.data || {};
};

/*
 * Keep this alias too, so either name works.
 */
export const getUsernamesByIds = lookupUsernamesApi;

/*
 * Paginated user directory.
 */
export const getAllUsersApi = async (
    page = 0,
    size = 20
) => {
  const response = await httpClient.get(
      '/api/v1/users/',
      {
        params: {
          page,
          size,
        },
      }
  );

  return response.data;
};