import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MdAdd,
  MdArrowForward,
  MdClose,
  MdExplore,
  MdForum,
  MdLogout,
  MdMeetingRoom,
  MdPublic,
  MdSearch,
} from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import MyRooms from './MyRooms';
import AppNav from './AppNav';
import ActionDialog from './ActionDialog';
import { createRoomApi, getUnreadCountApi, joinChatApi } from '../services/RoomService';
import { getMyActiveRoomsApi } from '../services/MyRoomsService';

const isDmRoomId = (roomId, userId) => Boolean(userId) && roomId.length === userId.length * 2 && roomId.includes(userId);

const greetingForNow = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const JoinCreateChat = () => {
  const [roomInput, setRoomInput] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState({ roomId: '', scope: 'Public', password: '' });
  const [busy, setBusy] = useState('');
  const [stats, setStats] = useState({ rooms: null, unread: null });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, roomId: '', value: '' });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const { setRoomId, setCurrentUser, setConnected, setRoomUsers, setIsDm, setDmTarget } = useChatContext();
  const auth = useAuth();
  const navigate = useNavigate();
  const currentUserId = auth.user?.id || auth.user?.subject || '';
  const displayName = auth.user?.name || auth.user?.username || 'there';
  const username = auth.user?.username || auth.user?.name || 'member';

  useEffect(() => {
    if (!auth.authInitialized || !auth.authenticated) return undefined;
    let cancelled = false;
    const loadStats = async () => {
      try {
        const ids = await getMyActiveRoomsApi();
        const validIds = Array.isArray(ids) ? [...new Set(ids.filter((id) => typeof id === 'string' && id.trim()))] : [];
        const savedRooms = validIds.filter((id) => !isDmRoomId(id, currentUserId));
        const unreadResults = await Promise.allSettled(validIds.map((id) => getUnreadCountApi(id)));
        const unreadComplete = unreadResults.every((result) => result.status === 'fulfilled');
        const unread = unreadComplete
            ? unreadResults.reduce((total, result) => total + Math.max(0, Number(result.value) || 0), 0)
            : null;
        if (!cancelled) setStats({ rooms: savedRooms.length, unread });
      } catch {
        if (!cancelled) setStats({ rooms: null, unread: null });
      }
    };
    void loadStats();
    return () => { cancelled = true; };
  }, [auth.authInitialized, auth.authenticated, currentUserId]);

  const resetChatState = (room, roomId) => {
    setCurrentUser(currentUserId);
    setRoomUsers(room?.avlUser || []);
    setIsDm(false);
    setDmTarget('');
    setRoomId(room?.roomId || roomId);
    setConnected(true);
    navigate('/chat');
  };

  const validateRoomId = (value) => {
    const normalized = value.trim();
    if (!normalized) {
      toast.error('Enter a room ID first.');
      return null;
    }
    if (normalized.length < 4) {
      toast.error('Room IDs must contain at least 4 characters.');
      return null;
    }
    if (!currentUserId) {
      toast.error('Unable to identify the current user.');
      return null;
    }
    return normalized;
  };

  const joinRoom = async (rawRoomId, password = null) => {
    const roomId = validateRoomId(rawRoomId);
    if (!roomId) return;
    setBusy('join');
    try {
      const room = await joinChatApi(roomId, password);
      setPasswordDialog({ open: false, roomId: '', value: '' });
      resetChatState(room, roomId);
    } catch (error) {
      if (!password && error?.response?.status === 404) {
        toast.error('Room not found. Check the room ID and try again.');
      } else if (!password && (error?.response?.status === 401 || error?.response?.status === 403)) {
        setPasswordDialog({ open: true, roomId, value: '' });
      } else if (!password && error?.response?.status !== 400) {
        // Some existing backend versions use a non-2xx response for private rooms.
        setPasswordDialog({ open: true, roomId, value: '' });
      } else {
        toast.error(password ? 'Incorrect password or room unavailable.' : 'Unable to join this room.');
      }
    } finally {
      setBusy('');
      setPasswordBusy(false);
    }
  };

  const handleJoinSubmit = (event) => {
    event.preventDefault();
    void joinRoom(roomInput);
  };

  const submitRoomPassword = async () => {
    if (!passwordDialog.value.trim()) return;
    setPasswordBusy(true);
    await joinRoom(passwordDialog.roomId, passwordDialog.value);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const roomId = validateRoomId(detail.roomId);
    if (!roomId) return;
    if (detail.scope === 'Private' && !detail.password.trim()) {
      toast.error('Add a password for a private room.');
      return;
    }
    setBusy('create');
    try {
      const room = await createRoomApi(roomId, detail.scope, detail.password.trim() || null);
      toast.success('Room created.');
      resetChatState(room, roomId);
    } catch (error) {
      const message = typeof error?.response?.data === 'string' ? error.response.data : 'Unable to create this room.';
      toast.error(message);
    } finally {
      setBusy('');
    }
  };

  const handleLogout = async () => {
    setConnected(false);
    setRoomId('');
    setCurrentUser('');
    setRoomUsers([]);
    setIsDm(false);
    setDmTarget('');
    await auth.logout();
    navigate('/login', { replace: true });
  };

  const roomStats = useMemo(() => [
    { label: 'Saved rooms', value: stats.rooms === null ? '—' : stats.rooms, icon: MdMeetingRoom },
    { label: 'Unread messages', value: stats.unread === null ? '—' : stats.unread, icon: MdForum },
  ], [stats]);

  return (
      <div className="app-page home-dashboard-page">
        <div className="app-frame">
          <AppNav active="home" />
          <main className="page-content home-dashboard page-enter">
            <section className="home-dashboard-intro">
              <div>
                <div className="page-kicker">your workspace</div>
                <h1 className="home-dashboard-title">{greetingForNow()}, {displayName.split(' ')[0]}.</h1>
                <p className="home-dashboard-copy">Pick up a conversation or open a room in a few seconds.</p>
              </div>
              <button type="button" className="home-command-hint" onClick={() => window.dispatchEvent(new Event('chatcom:open-command-palette'))} aria-label="Search workspace">
                <MdSearch size={17} /><span>Search workspace</span><kbd>⌘ K</kbd>
              </button>
            </section>

            <section className="home-stat-grid" aria-label="Workspace summary">
              {roomStats.map(({ label, value, icon: Icon }) => (
                  <article className="home-stat-card" key={label}>
                    <span className="home-stat-icon"><Icon size={18} /></span>
                    <span className="home-stat-copy"><span>{label}</span><strong>{value}</strong></span>
                  </article>
              ))}
              <article className="home-stat-card home-stat-identity">
                <span className="home-stat-icon"><MdPublic size={18} /></span>
                <span className="home-stat-copy"><span>Signed in as</span><strong className="home-stat-username">@{username}</strong></span>
              </article>
            </section>

            <section className="home-quick-join surface">
              <div className="home-section-heading">
                <div>
                  <div className="page-kicker">quick join</div>
                  <h2>Go straight to a room</h2>
                </div>
                <span className="home-section-icon"><MdArrowForward size={18} /></span>
              </div>
              <form className="home-quick-join-form" onSubmit={handleJoinSubmit}>
                <label className="home-room-input">
                  <span aria-hidden="true">#</span>
                  <input value={roomInput} onChange={(event) => setRoomInput(event.target.value)} placeholder="Enter a room ID" minLength={4} maxLength={80} aria-label="Room ID" />
                </label>
                <button type="submit" className="btn btn-primary" disabled={busy !== ''}>{busy === 'join' ? 'Joining…' : 'Join room'} <MdArrowForward size={16} /></button>
                <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen((previous) => !previous)} aria-expanded={createOpen}>
                  {createOpen ? <MdClose size={16} /> : <MdAdd size={17} />}{createOpen ? 'Close create' : 'Create room'}
                </button>
              </form>
              {createOpen && (
                  <form className="home-create-form" onSubmit={handleCreate}>
                    <div className="home-create-fields">
                      <label className="home-create-field"><span>Room ID</span><input value={detail.roomId} name="roomId" onChange={(event) => setDetail((previous) => ({ ...previous, roomId: event.target.value }))} placeholder="e.g. design-team" minLength={4} maxLength={80} required /></label>
                      <label className="home-create-field"><span>Access</span><select value={detail.scope} onChange={(event) => setDetail((previous) => ({ ...previous, scope: event.target.value }))}><option value="Public">Public</option><option value="Private">Private</option></select></label>
                    </div>
                    {detail.scope === 'Private' && <label className="home-create-field home-create-password"><span>Room password</span><input type="password" value={detail.password} onChange={(event) => setDetail((previous) => ({ ...previous, password: event.target.value }))} placeholder="Choose a password" autoComplete="new-password" required /></label>}
                    <button type="submit" className="btn btn-primary" disabled={busy !== ''}>{busy === 'create' ? 'Creating…' : 'Create and open room'} <MdArrowForward size={16} /></button>
                  </form>
              )}
            </section>

            <section className="home-room-section">
              <div className="home-section-heading home-room-heading">
                <div>
                  <div className="page-kicker">continue where you left off</div>
                  <h2>Your rooms</h2>
                  <p>Saved rooms and unread counts from your account.</p>
                </div>
                <button type="button" className="btn btn-quiet home-discover-link" onClick={() => navigate('/discover')}><MdExplore size={16} /> Discover <MdArrowForward size={15} /></button>
              </div>
              <div className="home-room-list surface"><MyRooms variant="cards" /></div>
            </section>

            <footer className="home-dashboard-footer">
              <span><MdForum size={15} /> ChatCom workspace</span>
              <button type="button" className="home-footer-signout" onClick={handleLogout}><MdLogout size={15} /> Sign out</button>
            </footer>
          </main>
        </div>
        <ActionDialog
            open={passwordDialog.open}
            eyebrow={`private room · #${passwordDialog.roomId}`}
            title="This room is private"
            description="Enter the room password to continue to the conversation."
            inputLabel="Room password"
            inputType="password"
            inputValue={passwordDialog.value}
            onInputChange={(value) => setPasswordDialog((previous) => ({ ...previous, value }))}
            placeholder="Enter password"
            confirmLabel="Join room"
            busy={passwordBusy}
            onConfirm={submitRoomPassword}
            onCancel={() => setPasswordDialog({ open: false, roomId: '', value: '' })}
        />
      </div>
  );
};

export default JoinCreateChat;