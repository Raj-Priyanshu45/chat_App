import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { createRoomApi, joinChatApi } from '../services/RoomService';

const JoinCreateChat = () => {
  const [detail, setDetail] = useState({ roomId: '' });
  const { setRoomId, setCurrentUser, setConnected } = useChatContext();
  const auth = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setDetail((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!detail.roomId.trim()) {
      toast.error('Please enter a room ID.');
      return false;
    }
    return true;
  };

  const joinChat = async () => {
    if (!auth.authenticated) {
      await auth.login();
      return;
    }

    if (!validateForm()) return;

    try {
      await joinChatApi(detail.roomId.trim());
      setCurrentUser(auth.user?.username || auth.user?.name || '');
      setRoomId(detail.roomId.trim());
      setConnected(true);
      toast.success('Joined room successfully.');
      navigate('/chat');
    } catch (error) {
      const message = error?.response?.data || 'Unable to join room.';
      toast.error(message);
    }
  };

  const createRoom = async () => {
    if (!auth.authenticated) {
      await auth.login();
      return;
    }

    if (!validateForm()) return;

    try {
      const response = await createRoomApi(detail.roomId.trim());
      setCurrentUser(auth.user?.username || auth.user?.name || '');
      setRoomId(response.roomId || detail.roomId.trim());
      setConnected(true);
      toast.success('Room created successfully.');
      navigate('/chat');
    } catch (error) {
      const message = error?.response?.data || 'Unable to create room.';
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 text-5xl">
            💬
          </div>
          <h1 className="text-xl font-semibold text-white">Join Room / Create Room</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Signed in as</label>
            <div className="rounded-full border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100">
              {auth.authenticated ? auth.user?.name || auth.user?.username || 'Authenticated user' : 'Not signed in'}
            </div>
          </div>

          {!auth.authenticated && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={auth.login}
                className="rounded-full bg-cyan-600 px-4 py-3 font-medium text-white transition hover:bg-cyan-500"
              >
                Sign in with Keycloak
              </button>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Room ID / New Room ID</label>
            <input
              type="text"
              name="roomId"
              value={detail.roomId}
              onChange={handleInputChange}
              placeholder="Enter the room id"
              className="w-full rounded-full border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={joinChat}
            className="flex-1 rounded-full bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
            disabled={!auth.authenticated}
          >
            Join Room
          </button>
          <button
            type="button"
            onClick={createRoom}
            className="flex-1 rounded-full bg-orange-600 px-4 py-3 font-medium text-white transition hover:bg-orange-500 disabled:opacity-50"
            disabled={!auth.authenticated}
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinCreateChat;
