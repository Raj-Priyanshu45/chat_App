import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowBack } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { getPublicRooms, joinChatApi } from '../services/RoomService';
import { getMyInfo } from '../services/UserService';

const DiscoverRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('');

  const {
    setRoomId,
    setCurrentUser,
    setConnected,
    setRoomUsers,
    setIsDm,
    setDmTarget,
  } = useChatContext();

  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.authenticated) return;

    const loadRooms = async () => {
      try {
        setLoading(true);
        const page = await getPublicRooms(20, 0, sortBy);
        setRooms(page?.content || []);
      } catch (error) {
        toast.error('Unable to load public rooms.');
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, [auth.authenticated, sortBy]);

  const handleJoin = async (roomId) => {
    try {
      const room = await joinChatApi(roomId, null);
      const info = await getMyInfo();

      setCurrentUser(info?.username || info?.name || '');
      setRoomUsers(room?.users || []);
      setIsDm(false);
      setDmTarget('');
      setRoomId(room?.roomId);
      setConnected(true);

      navigate('/chat');
    } catch (error) {
      const message =
          typeof error?.response?.data === 'string'
              ? error.response.data
              : 'Unable to join room.';

      toast.error(message);
    }
  };

  return (
      <div className="min-h-screen bg-ink px-6 py-10 text-cream">
        <div className="mx-auto max-w-2xl">
          <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-8 flex items-center gap-1 text-sm text-muted transition hover:text-cream"
          >
            <MdArrowBack size={16} />
            Back
          </button>

          <div className="mb-6 flex items-end justify-between">
            <h1 className="text-xl font-semibold text-cream">Discover public rooms</h1>

            <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-xs text-cream outline-none transition focus:border-amber"
            >
              <option value="">Most active</option>
              <option value="timestamp">Newest</option>
            </select>
          </div>

          {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-amber" />
              </div>
          ) : rooms.length === 0 ? (
              <div className="rounded-md border border-dashed border-border-subtle px-6 py-12 text-center text-sm text-muted">
                No public rooms yet.
              </div>
          ) : (
              <div className="overflow-hidden rounded-md border border-border-subtle">
                {rooms.map((room, index) => (
                    <div
                        key={room.roomId}
                        className={`flex items-center justify-between px-5 py-4 transition hover:bg-surface ${
                            index !== 0 ? 'border-t border-border-subtle' : ''
                        }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm text-cream">{room.roomId}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                          {room.numberAvlUser} active member
                          {room.numberAvlUser === 1 ? '' : 's'}
                        </p>
                      </div>

                      <button
                          type="button"
                          onClick={() => handleJoin(room.roomId)}
                          className="shrink-0 rounded-md border border-border-subtle px-4 py-2 text-xs font-semibold text-cream transition hover:border-amber hover:text-amber"
                      >
                        Join
                      </button>
                    </div>
                ))}
              </div>
          )}
        </div>
      </div>
  );
};

export default DiscoverRooms;