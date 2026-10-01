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

// Current members of a room, as user ids
export const getRoomMembersApi = async (roomId) => {
  const response = await httpClient.get(`/api/v1/rooms/${roomId}/members`);
  return response.data || [];
};

// Group room media upload -> POST /api/v1/chat/upload/{roomId}
export const uploadFileApi = async (roomId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await httpClient.post(`/api/v1/chat/upload/${roomId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// DM media upload -> POST /api/v1/chat/dm/{rec}   (rec = the other user's id)
export const uploadDmFileApi = async (targetUserId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await httpClient.post(`/api/v1/chat/dm/${targetUserId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Public room discovery -> GET /api/v1/home
export const getPublicRooms = async (size = 20, number = 0, sortBy = '') => {
  const response = await httpClient.get('/api/v1/home', {
    params: { size, number, sortBy },
  });
  return response.data;
};

// Mirrors chatService.getDmRoomId() on the backend. Both arguments MUST be user ids
// (not usernames) because that is what the backend builds the room id from.
export const computeDmRoomId = (userIdA, userIdB) => {
  return userIdA < userIdB ? userIdA + userIdB : userIdB + userIdA;
};