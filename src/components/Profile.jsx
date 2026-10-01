import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MdArrowBack,
  MdChatBubbleOutline,
  MdMeetingRoom,
} from 'react-icons/md';

import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';

import { getMyProfile } from '../services/ProfileService';
import {
  joinChatApi,
  computeDmRoomId,
} from '../services/RoomService';

import { getUsernamesByIds } from '../services/UserService';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [friendNames, setFriendNames] = useState({});
  const [loading, setLoading] = useState(true);

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
      navigate('/');
      return;
    }

    const loadProfile = async () => {
      try {
        const data = await getMyProfile();

        setProfile(data);

        // friends remain Mongo IDs internally.
        const friendIds = data?.friends || [];

        if (friendIds.length) {
          const names = await getUsernamesByIds(friendIds);
          setFriendNames(names);
        }
      } catch {
        toast.error('Unable to load profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [auth.authenticated, navigate]);

  const handleMessageFriend = (friendId) => {
    if (!currentUserId) {
      toast.error('Unable to identify the current user.');
      return;
    }

    if (!friendId) {
      toast.error('Invalid friend.');
      return;
    }

    setCurrentUser(currentUserId);

    // Internal value.
    setDmTarget(friendId);

    // Internal room ID is generated from Mongo IDs.
    setRoomId(
        computeDmRoomId(
            currentUserId,
            friendId
        )
    );

    setIsDm(true);
    setConnected(true);

    navigate('/chat');
  };

  const handleRejoinRoom = async (roomId) => {
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

      // Current members only.
      setRoomUsers(room?.avlUser || []);

      setIsDm(false);
      setDmTarget('');

      setRoomId(room?.roomId || roomId);
      setConnected(true);

      navigate('/chat');
    } catch (error) {
      const message =
          typeof error?.response?.data === 'string'
              ? error.response.data
              : 'Unable to rejoin room.';

      toast.error(message);
    }
  };

  if (loading) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-ink">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-amber" />
        </div>
    );
  }

  if (!profile) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-ink text-sm text-muted">
          Unable to load profile.
        </div>
    );
  }

  const friends = profile.friends || [];
  const roomHistory = profile.roomHistory || [];

  return (
      <div className="min-h-screen bg-ink px-6 py-10 text-cream">
        <div className="mx-auto max-w-xl">

          <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-8 flex items-center gap-1 text-sm text-muted transition hover:text-cream"
          >
            <MdArrowBack size={16} />
            Back
          </button>

          {/* Header */}
          <div className="mb-8 flex items-center gap-4 border-b border-border-subtle pb-8">

            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-surface-raised text-xl font-semibold text-amber">
              {(profile.name || profile.username || '?')[0]?.toUpperCase()}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-cream">
                {profile.name || profile.username}
              </h1>

              <p className="font-mono text-sm text-muted">
                @{profile.username}
              </p>

              {profile.gmail && (
                  <p className="truncate text-xs text-muted">
                    {profile.gmail}
                  </p>
              )}
            </div>
          </div>

          {/* Friends */}
          <div className="mb-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
              Friends
            </h2>

            {friends.length === 0 ? (
                <p className="text-sm text-muted">
                  No friends yet — message someone to add them here.
                </p>
            ) : (
                <div className="overflow-hidden rounded-md border border-border-subtle">

                  {friends.map((friendId, index) => {
                    const username =
                        friendNames[friendId] ||
                        'Unknown user';

                    return (
                        <div
                            key={friendId}
                            className={`flex items-center justify-between px-4 py-3 ${
                                index !== 0
                                    ? 'border-t border-border-subtle'
                                    : ''
                            }`}
                        >
                          <div className="flex items-center gap-3">

                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-raised text-sm font-semibold text-muted">
                              {username[0]?.toUpperCase() || '?'}
                            </div>

                            <span className="font-mono text-sm text-cream">
                        {username}
                      </span>
                          </div>

                          <button
                              type="button"
                              onClick={() =>
                                  handleMessageFriend(friendId)
                              }
                              className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-xs text-muted transition hover:border-amber hover:text-amber"
                          >
                            <MdChatBubbleOutline size={14} />
                            Message
                          </button>
                        </div>
                    );
                  })}

                </div>
            )}
          </div>

          {/* Room history */}
          <div>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
              Room history
            </h2>

            {roomHistory.length === 0 ? (
                <p className="text-sm text-muted">
                  No rooms joined yet — create or join one to see it here.
                </p>
            ) : (
                <div className="overflow-hidden rounded-md border border-border-subtle">

                  {roomHistory.map((roomId, index) => (
                      <div
                          key={roomId}
                          className={`flex items-center justify-between px-4 py-3 ${
                              index !== 0
                                  ? 'border-t border-border-subtle'
                                  : ''
                          }`}
                      >
                  <span className="font-mono text-sm text-cream">
                    {roomId}
                  </span>

                        <button
                            type="button"
                            onClick={() =>
                                handleRejoinRoom(roomId)
                            }
                            className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-xs text-muted transition hover:border-amber hover:text-amber"
                        >
                          <MdMeetingRoom size={14} />
                          Rejoin
                        </button>
                      </div>
                  ))}

                </div>
            )}
          </div>

        </div>
      </div>
  );
};

export default Profile;