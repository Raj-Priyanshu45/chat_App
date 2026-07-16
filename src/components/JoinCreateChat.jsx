import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useChatContext from '../context/ChatContext';
import { createRoomApi, joinChatApi } from '../services/RoomService';

const JoinCreateChat = () => {
  const [detail, setDetail] = useState({ roomId: '', userName: '' });
  const { setRoomId, setCurrentUser, setConnected } = useChatContext();
  const navigate = useNavigate();

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setDetail((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!detail.roomId.trim() || !detail.userName.trim()) {
      toast.error('Please enter both your name and a room ID.');
      return false;
    }
    return true;
  };

  const joinChat = async () => {
    if (!validateForm()) return;

    try {
      await joinChatApi(detail.roomId.trim());
      setCurrentUser(detail.userName.trim());
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
    if (!validateForm()) return;

    try {
      const response = await createRoomApi(detail.roomId.trim());
      setCurrentUser(detail.userName.trim());
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
          <h1 className="text-xl font-semibold text-white">Join Room / Create Room ..</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Your name</label>
            <input
              type="text"
              name="userName"
              value={detail.userName}
              onChange={handleInputChange}
              placeholder="Enter the name"
              className="w-full rounded-full border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
            />
          </div>

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
            className="flex-1 rounded-full bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
          >
            Join Room
          </button>
          <button
            type="button"
            onClick={createRoom}
            className="flex-1 rounded-full bg-orange-600 px-4 py-3 font-medium text-white transition hover:bg-orange-500"
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinCreateChat;
