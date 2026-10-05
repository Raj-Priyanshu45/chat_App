import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowBack } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import {
  getPublicRooms,
  getRoomMembersApi,
  joinChatApi,
} from '../services/RoomService';

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

  const currentUserId =
      auth.user?.id ||
      auth.user?.subject ||
      '';

  useEffect(() => {
    if (!auth.authenticated) {
      return;
    }

    let cancelled = false;

    const loadRooms = async () => {
      try {
        setLoading(true);

        const page = await getPublicRooms(
            20,
            0,
            sortBy
        );

        const list = page?.content || [];

        /*
         * Member count = size of the member-id list
         * returned by /api/v1/rooms/{roomId}/members.
         * One request per room, run in parallel.
         */
        const withCounts = await Promise.all(
            list.map(async (room) => {
              try {
                const ids = await getRoomMembersApi(room.roomId);

                return {
                  ...room,
                  memberCount: ids.length,
                };
              } catch {
                return {
                  ...room,
                  memberCount: null,
                };
              }
            })
        );

        // "Most active" = most members. "Newest" keeps the backend order.
        if (sortBy !== 'timestamp') {
          withCounts.sort(
              (a, b) =>
                  (b.memberCount ?? -1) -
                  (a.memberCount ?? -1)
          );
        }

        if (!cancelled) {
          setRooms(withCounts);
        }
      } catch {
        if (!cancelled) {
          toast.error('Unable to load public rooms.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRooms();

    return () => {
      cancelled = true;
    };
  }, [auth.authenticated, sortBy]);

  const handleJoin = async (roomId) => {
    if (!currentUserId) {
      toast.error('Unable to identify the current user.');
      return;
    }

    try {
      const room = await joinChatApi(
          roomId,
          null
      );

      setCurrentUser(currentUserId);

      // Members are fetched on demand from the Members button in ChatPage.
      setRoomUsers([]);

      setIsDm(false);
      setDmTarget('');

      setRoomId(room?.roomId || roomId);
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
            <h1 className="text-xl font-semibold text-cream">
              Discover public rooms
            </h1>

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
                            index !== 0
                                ? 'border-t border-border-subtle'
                                : ''
                        }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm text-cream">
                          {room.roomId}
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-sage" />

                          {room.memberCount ?? '—'} member
                          {room.memberCount === 1 ? '' : 's'}
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