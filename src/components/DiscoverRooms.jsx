import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowBack, MdExplore, MdGroups, MdArrowForward } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { getPublicRooms, joinChatApi } from '../services/RoomService';
import AppNav from './AppNav';

const DiscoverRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('');
  const [joining, setJoining] = useState('');
  const { setRoomId, setCurrentUser, setConnected, setRoomUsers, setIsDm, setDmTarget } = useChatContext();
  const auth = useAuth();
  const navigate = useNavigate();
  const currentUserId = auth.user?.id || auth.user?.subject || '';

  useEffect(() => {
    if (!auth.authenticated) return;
    let cancelled = false;
    const loadRooms = async () => {
      try {
        setLoading(true);
        const page = await getPublicRooms(20, 0, sortBy);
        const withCounts = page?.content || [];
        if (!cancelled) setRooms(withCounts);
      } catch {
        if (!cancelled) toast.error('Unable to load public rooms.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadRooms();
    return () => { cancelled = true; };
  }, [auth.authenticated, sortBy]);

  const handleJoin = async (roomId) => {
    if (!currentUserId) return toast.error('Unable to identify the current user.');
    setJoining(roomId);
    try {
      const room = await joinChatApi(roomId, null);
      setCurrentUser(currentUserId);
      setRoomUsers([]);
      setIsDm(false);
      setDmTarget('');
      setRoomId(room?.roomId || roomId);
      setConnected(true);
      navigate('/chat');
    } catch (error) {
      const message = typeof error?.response?.data === 'string' ? error.response.data : 'Unable to join room.';
      toast.error(message);
    } finally {
      setJoining('');
    }
  };

  return (
    <div className="app-page">
      <div className="app-frame">
        <AppNav active="discover" />

        <main className="page-content">
          <div className="utility-bar">
            <button type="button" className="btn btn-quiet" onClick={() => navigate('/')}>
              <MdArrowBack size={16} />
              Home
            </button>
            <div className="utility-actions">
              <span className="page-kicker" style={{ marginRight: 4 }}>public directory</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="select-control" aria-label="Sort rooms">
                <option value="">Most active</option>
                <option value="timestamp">Newest</option>
              </select>
            </div>
          </div>

          <section style={{ marginTop: 22 }}>
            <div className="page-kicker">find a room</div>
            <h1 className="page-title">A room for the conversation you already want to have.</h1>
            <p className="page-description">Browse public spaces by activity and jump in without another setup step.</p>
          </section>

          {loading ? (
            <div className="collection" style={{ padding: 10 }}>
              {[1,2,3,4,5].map((item) => <div key={item} className="skeleton" style={{ height: 65, marginBottom: 8 }} />)}
            </div>
          ) : rooms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-glyph"><MdExplore size={21} /></div>
              <h2 className="empty-title">No public rooms yet</h2>
              <p className="empty-copy">Create the first room from home, then come back here to discover it.</p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => navigate('/')}>Create a room <MdArrowForward size={16} /></button>
            </div>
          ) : (
            <div className="collection page-enter">
              {rooms.map((room) => {
                const memberCount = room.memberCount ?? 0;
                return (
                  <article className="collection-row" key={room.roomId}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="empty-glyph" style={{ width: 40, height: 40, margin: 0, borderRadius: 12 }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>#</span></div>
                      <div className="min-w-0">
                        <h2 className="collection-title truncate">{room.roomId}</h2>
                        <p className="collection-subtitle flex items-center gap-1.5"><MdGroups size={13} /> {memberCount} member{memberCount === 1 ? '' : 's'} · public room</p>
                      </div>
                    </div>
                    <div className="collection-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => handleJoin(room.roomId)} disabled={joining === room.roomId}>
                        {joining === room.roomId ? 'Joining…' : 'Join room'}
                        {joining !== room.roomId && <MdArrowForward size={16} />}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DiscoverRooms;
