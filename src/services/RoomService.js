import { httpClient } from '../config/AxiosHelper';

export const createRoomApi = async (roomId) => {
  const response = await httpClient.post('/api/v1/rooms/create', { roomId });
  return response.data;
};

export const joinChatApi = async (roomId) => {
  const response = await httpClient.get(`/api/v1/rooms/${roomId}`);
  return response.data;
};

export const getMessages = async (roomId, size = 20, page = 0) => {
  const response = await httpClient.get(`/api/v1/rooms/${roomId}/messages`, {
    params: { page, size },
  });
  return response.data.content || [];
};
