import { httpClient } from '../config/AxiosHelper';

// scope must be 'Public' or 'Private' to match the backend ScopeVar enum exactly
export const createRoomApi = async (roomId, scope = 'Public', password = null) => {
  const response = await httpClient.post('/api/v1/rooms/create', {
    roomId,
    var: scope,
    password: scope === 'Private' ? password : null,
  });
  return response.data;
};

export const joinChatApi = async (roomId, password = null) => {
  const response = await httpClient.post('/api/v1/rooms/join', {
    roomId,
    password,
  });
  return response.data;
};

export const getMessages = async (roomId, size = 20, page = 0) => {
  const response = await httpClient.get(`/api/v1/rooms/${roomId}/messages`, {
    params: { page, size },
  });
  return response.data.content || [];
};

export const getMessagesSince = async (roomId, timestamp) => {
  const response = await httpClient.get(`/api/v1/rooms/${roomId}/since`, {
    params: { timestamp },
  });
  return response.data || [];
};

export const leaveRoomApi = async (roomId) => {
  const response = await httpClient.get(`/api/v1/rooms/${roomId}/leave`);
  return response.data;
};