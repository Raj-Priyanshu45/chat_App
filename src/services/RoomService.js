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

// Group room media upload — hits existing /api/v1/chat/upload/{roomId}
export const uploadFileApi = async (roomId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await httpClient.post(`/api/v1/chat/upload/${roomId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// DM media upload — hits existing /api/v1/chat/dm/{rec}
export const uploadDmFileApi = async (targetUsername, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await httpClient.post(`/api/v1/chat/dm/${targetUsername}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Fetch a media file's bytes as a local blob URL for <img>/<video>/<audio>
export const fetchMediaBlob = async (filename) => {
  const response = await httpClient.get(`/api/v1/chat/ret/${filename}`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
};

// Public room discovery — hits existing /api/v1/home
export const getPublicRooms = async (size = 20, number = 0, sortBy = '') => {
  const response = await httpClient.get('/api/v1/home', {
    params: { size, number, sortBy },
  });
  return response.data;
};

// Mirrors roomServices.getDmRoomId() on the backend exactly — the backend
// only ever creates this room lazily on first message send, so the frontend
// needs to know the same deterministic key up front to subscribe/fetch
// history before a message has actually been sent.
export const computeDmRoomId = (userA, userB) => {
  return userA < userB ? userA + userB : userB + userA;
};