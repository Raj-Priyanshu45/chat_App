import { httpClient } from '../config/AxiosHelper';

// Create a public/private room.
export const createRoomApi = async (
    roomId,
    scope = 'Public',
    password = null
) => {
  const response = await httpClient.post('/api/v1/rooms/create', {
    roomId,
    var: scope,
    password: scope === 'Private' ? password : null,
  });

  return response.data;
};

// Join a room.
export const joinChatApi = async (roomId, password = null) => {
  const response = await httpClient.post('/api/v1/rooms/join', {
    roomId,
    password,
  });

  return response.data;
};

// Message history.
export const getMessages = async (
    roomId,
    size = 20,
    page = 0
) => {
  const response = await httpClient.get(
      `/api/v1/rooms/${roomId}/messages`,
      {
        params: { page, size },
      }
  );

  return response.data.content || [];
};

// Messages after a timestamp.
export const getMessagesSince = async (
    roomId,
    timestamp
) => {
  const response = await httpClient.get(
      `/api/v1/rooms/${roomId}/since`,
      {
        params: { timestamp },
      }
  );

  return response.data || [];
};

// Leave room.
export const leaveRoomApi = async (roomId) => {
  const response = await httpClient.get(
      `/api/v1/rooms/${roomId}/leave`
  );

  return response.data;
};

// Current room members.
// Backend returns Mongo IDs.
export const getRoomMembersApi = async (roomId) => {
  const response = await httpClient.get(
      `/api/v1/rooms/${roomId}/members`
  );

  return response.data || [];
};

// Group media upload.
export const uploadFileApi = async (roomId, files) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await httpClient.post(
      `/api/v1/chat/upload/${roomId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
  );

  return response.data;
};

// DM media upload.
// rec must be Mongo user ID.
export const uploadDmFileApi = async (targetUserId, files) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await httpClient.post(
      `/api/v1/chat/dm/${targetUserId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
  );

  return response.data;
};

// Fetch media.
export const fetchMediaBlob = async (filename) => {
  const response = await httpClient.get(
      `/api/v1/chat/ret/${filename}`,
      {
        responseType: 'blob',
      }
  );

  return URL.createObjectURL(response.data);
};

// Public rooms.
export const getPublicRooms = async (
    size = 20,
    number = 0,
    sortBy = ''
) => {
  const response = await httpClient.get('/api/v1/home', {
    params: {
      size,
      number,
      sortBy,
    },
  });

  return response.data;
};

// IMPORTANT:
// This must receive Mongo user IDs.
// Do NOT pass usernames here.
export const computeDmRoomId = (userA, userB) => {
  if (!userA || !userB) {
    return '';
  }

  return userA < userB
      ? userA + userB
      : userB + userA;
};
