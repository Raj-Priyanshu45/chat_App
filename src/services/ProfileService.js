import { httpClient } from '../config/AxiosHelper';

// GET /api/v1/me
// Expected: { id, username, name, gmail, friends: string[] (user ids), roomHistory: string[] }
export const getMyProfile = async () => {
  const response = await httpClient.get('/api/v1/me');
  return response.data;
};

// POST /update/image  -> { imageUri }
export const uploadProfileImageApi = async (file) => {
  const formData = new FormData();
  formData.append('file', file);   // must match @RequestParam("file")

  const response = await httpClient.post('/update/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
export const fetchWsTicketApi = async () => {
  const response = await httpClient.get('/api/v1/ws-ticket');
  return response.data.ticket;
};