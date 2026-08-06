import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowBack, MdChatBubbleOutline, MdMeetingRoom } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { getMyProfile } from '../services/ProfileService';
import { joinChatApi, computeDmRoomId } from '../services/RoomService';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setRoomId, setCurrentUser, setConnected, setRoomUsers, setIsDm, setDmTarget } = useChatContext();
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.authenticated) {
      navigate('/');
      return;
    }

    getMyProfile()
      .then(setProfile)
      .catch(() => toast.error('Unable to load profile.'))
      .finally(() => setLoading(false));
  }, [auth.authenticated, navigate]);

  // Same pattern DiscoverRooms/ChatPage use to jump into a DM: set context
  // state and let ChatPage's own effect open the STOMP connection.
  const handleMessageFriend = (friendUsername) => {
    setCurrentUser(profile.username);
    setIsDm(true);
    setDmTarget(friendUsername);
    setRoomId(computeDmRoomId(profile.username, friendUsername));
    setConnected(true);
    navigate('/chat');
  };

  const handleRejoinRoom = async (roomId) => {
    try {
      const room = await joinChatApi(roomId, null);
      setCurrentUser(profile.username);
      setRoomUsers(room.users || []);
      setIsDm(false);
      setDmTarget('');
      setRoomId(room.roomId);
      setConnected(true);
      navigate('/chat');
    } catch (error) {
      const message = error?.response?.data || 'Unable to rejoin room.';
      toast.error(typeof message === 'string' ? message : 'Unable to rejoin room.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Unable to load profile.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
        >
          <MdArrowBack size={16} />
          Back
        </button>

        {/* Header card */}
        <div className="mb-6 flex items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-2xl font-semibold text-white">
            {(profile.name || profile.username || '?')[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{profile.name || profile.username}</h1>
            <p className="text-sm text-slate-400">@{profile.username}</p>
            {profile.gmail && <p className="text-sm text-slate-500">{profile.gmail}</p>}
          </div>
        </div>

        {/* Friends */}
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-cyan-400">
            Friends
          </h2>
          {profile.friends.length === 0 ? (
            <p className="text-sm text-slate-500">
              No friends yet — message someone to add them here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {profile.friends.map((friend) => (
                <li
                  key={friend}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
                      {friend[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-100">{friend}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMessageFriend(friend)}
                    className="flex items-center gap-1 rounded-full border border-cyan-600/50 px-3 py-1.5 text-xs text-cyan-300 transition hover:bg-cyan-600/10"
                  >
                    <MdChatBubbleOutline size={14} />
                    Message
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Room history */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-cyan-400">
            Room history
          </h2>
          {profile.roomHistory.length === 0 ? (
            <p className="text-sm text-slate-500">
              No rooms joined yet — create or join one to see it here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {profile.roomHistory.map((roomId) => (
                <li
                  key={roomId}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/60 px-4 py-3"
                >
                  <span className="text-sm text-slate-100">{roomId}</span>
                  <button
                    type="button"
                    onClick={() => handleRejoinRoom(roomId)}
                    className="flex items-center gap-1 rounded-full border border-orange-600/50 px-3 py-1.5 text-xs text-orange-300 transition hover:bg-orange-600/10"
                  >
                    <MdMeetingRoom size={14} />
                    Rejoin
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;