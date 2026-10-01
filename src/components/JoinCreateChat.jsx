import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowForward } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { createRoomApi, joinChatApi } from '../services/RoomService';

const JoinCreateChat = () => {
  const [detail, setDetail] = useState({ roomId: '', scope: 'Public', password: '' });
  const { setRoomId, setConnected, setRoomUsers, setIsDm, setDmTarget } = useChatContext();
  const { logout } = useAuth();
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
    if (detail.roomId.trim().length < 4) {
      toast.error('Room ID must be at least 4 characters.');
      return false;
    }
    return true;
  };

  const enterRoom = (room, fallbackId) => {
    setRoomUsers(room.users || []);
    setIsDm(false);
    setDmTarget('');
    setRoomId(room.roomId || fallbackId);
    setConnected(true);
    navigate('/chat');
  };

  const joinChat = async () => {
    if (!validateForm()) return;

    try {
      const room = await joinChatApi(detail.roomId.trim(), detail.password || null);
      toast.success('Joined room successfully.');
      enterRoom(room, detail.roomId.trim());
    } catch (error) {
      console.error('Join room failed:', error);
      const message = error?.response?.data || 'Unable to join room.';
      toast.error(typeof message === 'string' ? message : 'Unable to join room.');
    }
  };

  const createRoom = async () => {
    if (!validateForm()) return;

    if (detail.scope === 'Private' && !detail.password.trim()) {
      toast.error('Private rooms need a password.');
      return;
    }

    try {
      const room = await createRoomApi(
          detail.roomId.trim(),
          detail.scope,
          detail.password.trim() || null
      );
      toast.success('Room created successfully.');
      enterRoom(room, detail.roomId.trim());
    } catch (error) {
      console.error('Create room failed:', error);
      const message = error?.response?.data || 'Unable to create room.';
      toast.error(typeof message === 'string' ? message : 'Unable to create room.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
      <div className="flex min-h-screen bg-ink text-cream">
        {/* Left: brand / hero panel — hidden on small screens */}
        <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border-subtle bg-surface p-12 lg:flex">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-amber">chat_app</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-5xl font-semibold leading-[1.1] text-cream">
              One socket.
              <br />
              Every room.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-muted">
              Rooms, direct messages, and file sharing over a single live connection —
              STOMP over WebSocket, secured with cookie-based JWT, backed by MongoDB.
            </p>
          </div>

          <div className="space-y-2 font-mono text-xs text-muted">
            <p>/topic/room/{'{roomId}'}</p>
            <p>/user/queue/dm</p>
            <p>/app/sendMessages/{'{roomId}'}</p>
          </div>
        </div>

        {/* Right: the actual form */}
        <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-10 lg:hidden">
              <span className="font-mono text-xs uppercase tracking-wider text-amber">chat_app</span>
            </div>

            <h2 className="text-2xl font-semibold text-cream">Join or create a room</h2>
            <p className="mt-2 text-sm text-muted">Enter a room ID to jump straight in.</p>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link to="/discover" className="text-amber hover:text-cream transition-colors">
                Browse public rooms
              </Link>
              <Link to="/profile" className="text-amber hover:text-cream transition-colors">
                View profile
              </Link>
              <button
                  type="button"
                  onClick={handleLogout}
                  className="text-muted hover:text-cream transition-colors"
              >
                Log out
              </button>
            </div>

            <div className="mt-8">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
                Room ID
              </label>
              <input
                  type="text"
                  name="roomId"
                  value={detail.roomId}
                  onChange={handleInputChange}
                  placeholder="room-1234"
                  className="w-full rounded-md border border-border-subtle bg-surface px-4 py-3 font-mono text-sm text-cream placeholder-muted/60 outline-none transition focus:border-amber"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
                Room type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Public', 'Private'].map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setDetail((prev) => ({ ...prev, scope: option }))}
                        className={`rounded-md border px-4 py-2.5 text-sm font-medium transition ${
                            detail.scope === option
                                ? 'border-amber bg-amber/10 text-amber'
                                : 'border-border-subtle bg-surface text-muted hover:text-cream'
                        }`}
                    >
                      {option}
                    </button>
                ))}
              </div>
            </div>

            {detail.scope === 'Private' && (
                <div className="mt-5">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
                    Password
                  </label>
                  <input
                      type="password"
                      name="password"
                      value={detail.password}
                      onChange={handleInputChange}
                      placeholder="Room password"
                      className="w-full rounded-md border border-border-subtle bg-surface px-4 py-3 text-sm text-cream placeholder-muted/60 outline-none transition focus:border-amber"
                  />
                </div>
            )}

            <div className="mt-8 flex gap-3">
              <button
                  type="button"
                  onClick={joinChat}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-amber px-4 py-3 text-sm font-semibold text-ink transition hover:bg-amber-dim"
              >
                Join room
                <MdArrowForward size={16} />
              </button>
              <button
                  type="button"
                  onClick={createRoom}
                  className="flex-1 rounded-md border border-border-subtle px-4 py-3 text-sm font-semibold text-cream transition hover:border-amber hover:text-amber"
              >
                Create room
              </button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default JoinCreateChat;