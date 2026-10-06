import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowForward, MdLogout, MdPublic, MdLockOutline } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import MyRooms from './MyRooms';
import AppNav from './AppNav';
import { createRoomApi, joinChatApi } from '../services/RoomService';

const JoinCreateChat = () => {
  const [detail, setDetail] = useState({ roomId: '', scope: 'Public', password: '' });
  const { setRoomId, setCurrentUser, setConnected, setRoomUsers, setIsDm, setDmTarget } = useChatContext();
  const auth = useAuth();
  const navigate = useNavigate();
  const currentUserId = auth.user?.id || '';
  const displayName = auth.user?.name || auth.user?.username || 'member';

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setDetail((prev) => ({ ...prev, [name]: value }));
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

  const enterRoom = (room, fallbackRoomId) => {
    setCurrentUser(currentUserId);
    setRoomUsers(room?.avlUser || []);
    setIsDm(false);
    setDmTarget('');
    setRoomId(room?.roomId || fallbackRoomId);
    setConnected(true);
    navigate('/chat');
  };

  const joinChat = async () => {
    if (!auth.authenticated) return navigate('/login');
    if (!validateForm()) return;
    if (!currentUserId) return toast.error('Unable to identify the current user.');

    try {
      const room = await joinChatApi(detail.roomId.trim(), detail.password || null);
      enterRoom(room, detail.roomId.trim());
      toast.success('Joined room successfully.');
    } catch (error) {
      const message = typeof error?.response?.data === 'string' ? error.response.data : 'Unable to join room.';
      toast.error(message);
    }
  };

  const createRoom = async () => {
    if (!auth.authenticated) return navigate('/login');
    if (!validateForm()) return;
    if (!currentUserId) return toast.error('Unable to identify the current user.');
    if (detail.scope === 'Private' && !detail.password.trim()) return toast.error('Private rooms need a password.');

    try {
      const response = await createRoomApi(detail.roomId.trim(), detail.scope, detail.password.trim() || null);
      enterRoom(response, detail.roomId.trim());
      toast.success('Room created successfully.');
    } catch (error) {
      const message = typeof error?.response?.data === 'string' ? error.response.data : 'Unable to create room.';
      toast.error(message);
    }
  };

  return (
    <div className="app-page">
      <div className="app-frame">
        <AppNav active="home" />

        <main className="page-content">
          <div className="home-grid">
            <section className="surface hero-surface page-enter">
              <div className="hero-main">
                <div className="hero-eyebrow"><span className="live-dot" /> welcome back, {displayName}</div>
                <h1 className="hero-title">Put the conversation in one <em>place.</em></h1>
                <p className="hero-copy">
                  Create a private room, join a public space, or jump back into somewhere you were already talking. Everything opens into the same focused chat workspace.
                </p>

                <form className="join-card" onSubmit={(event) => { event.preventDefault(); joinChat(); }}>
                  <div className="join-card-head">
                    <span className="join-card-label">Enter a room</span>
                    <span className="join-card-hint">4+ characters</span>
                  </div>
                  <div className="input-shell">
                    <span className="input-prefix">#</span>
                    <input name="roomId" value={detail.roomId} onChange={handleInputChange} placeholder="design-sprint" autoComplete="off" />
                    <button type="submit" className="btn btn-primary" disabled={!auth.authenticated} style={{ minWidth: 118 }}>
                      Enter <MdArrowForward size={16} />
                    </button>
                  </div>

                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {['Public', 'Private'].map((option) => {
                      const privateRoom = option === 'Private';
                      const active = detail.scope === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setDetail((prev) => ({ ...prev, scope: option }))}
                          className="surface-soft"
                          style={{ minHeight: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: active ? 'var(--app-accent-strong)' : 'var(--app-muted)', borderColor: active ? 'rgba(213,157,87,.36)' : 'var(--app-border)', background: active ? 'rgba(213,157,87,.06)' : 'rgba(255,255,255,.016)', fontSize: 11, fontWeight: 800 }}
                        >
                          {privateRoom ? <MdLockOutline size={15} /> : <MdPublic size={15} />}
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {detail.scope === 'Private' && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        name="password"
                        type="password"
                        value={detail.password}
                        onChange={handleInputChange}
                        placeholder="Room password"
                        style={{ width: '100%', minHeight: 48, borderRadius: 13, border: '1px solid var(--app-border)', background: 'rgba(255,255,255,.025)', color: 'var(--app-text)', padding: '0 13px', outline: 0, fontSize: 12 }}
                      />
                    </div>
                  )}

                  <div className="hero-actions">
                    <button type="button" onClick={joinChat} disabled={!auth.authenticated} className="btn btn-primary">Join existing room</button>
                    <button type="button" onClick={createRoom} disabled={!auth.authenticated} className="btn btn-secondary">Create a new room</button>
                  </div>
                </form>
              </div>

              <div className="hero-footer">
                <span className="hero-footer-copy"><strong>Live workspace</strong> · rooms, people, media</span>
                <span className="mono-chip">STOMP / WebSocket</span>
                <span className="mono-chip">cookie session</span>
                <span className="mono-chip">media sharing</span>
              </div>
            </section>

            <aside className="home-side">
              <section className="surface side-card">
                <div className="side-card-head">
                  <div>
                    <div className="page-kicker">workspace health</div>
                    <h2 className="side-card-title" style={{ marginTop: 6 }}>Everything looks ready.</h2>
                    <p className="side-card-copy">Your session is established. Pick a room and start talking.</p>
                  </div>
                  <button type="button" className="btn btn-danger" style={{ minHeight: 38 }} onClick={handleLogout}><MdLogout size={15} /> Log out</button>
                </div>
                <div className="status-block">
                  <div className="status-row"><span className="status-meta">session</span><span className="status-value">authenticated</span></div>
                  <div className="status-bar"><span /></div>
                  <div className="status-row"><span className="status-meta">identity</span><span className="status-value">@{auth.user?.username || 'member'}</span></div>
                </div>
              </section>

              <section className="surface side-card" style={{ minHeight: 0 }}>
                <div className="side-card-head">
                  <div>
                    <div className="page-kicker">your rooms</div>
                    <h2 className="side-card-title" style={{ marginTop: 6 }}>Pick up a thread.</h2>
                    <p className="side-card-copy">Reopen a room you are already a member of.</p>
                  </div>
                </div>
                <MyRooms />
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};

export default JoinCreateChat;
