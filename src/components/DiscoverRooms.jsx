import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { getPublicRooms, joinChatApi } from '../services/RoomService';
import { getMyInfo } from '../services/UserService';

const DiscoverRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('');
  const { setRoomId, setCurrentUser, setConnected, setRoomUsers, setIsDm, setDmTarget } = useChatContext();
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.authenticated) return;

    setLoading(true);
    getPublicRooms(20, 0, sortBy)
      .then((page) => setRooms(page.content || []))
      .catch(() => toast.error('Unable to load public rooms.'))
      .finally(() => setLoading(false));
  }, [auth.authenticated, sortBy]);

  const handleJoin = async (roomId) => {
    try {
      const room = await joinChatApi(roomId, null);
      const info = await getMyInfo();

      setCurrentUser(info?.username || info?.name || '');
      setRoomUsers(room.users || []);
      setIsDm(false);
      setDmTarget('');
      setRoomId(room.roomId);
      setConnected(true);

      navigate('/chat');
    } catch (error) {
      const message = error?.response?.data || 'Unable to join room.';
      toast.error(typeof message === 'string' ? message : 'Unable to join room.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Discover public rooms</h1>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none"
          >
            <option value="">Most active</option>
            <option value="timestamp">Newest</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-400" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400">
            No public rooms yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rooms.map((room) => (
              <div
                key={room.roomId}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4"
              >
                <div>
                  <p className="font-medium text-white">{room.roomId}</p>
                  <p className="text-xs text-slate-400">
                    {room.numberAvlUser} active member{room.numberAvlUser === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleJoin(room.roomId)}
                  className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default DiscoverRooms;