import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MdArrowBack,
  MdArrowForward,
  MdExplore,
  MdGroups,
  MdMeetingRoom,
  MdSearch,
  MdTune,
} from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { getPublicRooms, joinChatApi } from '../services/RoomService';
import AppNav from './AppNav';

const filters = [
  { id: 'all', label: 'All rooms', description: 'Every public room returned by the directory.' },
  { id: 'active', label: 'Active', description: 'Rooms with a reported member count above zero.' },
  { id: 'new', label: 'New', description: 'Sort the directory by its timestamp field.' },
  { id: 'large', label: 'Large', description: 'Rooms reporting 10 or more members.' },
];

const DiscoverRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [joining, setJoining] = useState('');
  const { setRoomId, setCurrentUser, setConnected, setRoomUsers, setIsDm, setDmTarget } = useChatContext();
  const auth = useAuth();
  const navigate = useNavigate();
  const currentUserId = auth.user?.id || auth.user?.subject || '';

  useEffect(() => {
    if (!auth.authInitialized || !auth.authenticated) return undefined;
    let cancelled = false;
    const loadRooms = async () => {
      try {
        setLoading(true);
        const page = await getPublicRooms(40, 0, sortBy);
        const items = Array.isArray(page?.content) ? page.content : [];
        if (!cancelled) setRooms(items);
      } catch {
        if (!cancelled) {
          setRooms([]);
          toast.error('Unable to load public rooms.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadRooms();
    return () => { cancelled = true; };
  }, [auth.authInitialized, auth.authenticated, sortBy]);

  const visibleRooms = useMemo(() => {
    let result = rooms.filter((room) => String(room?.roomId || '').toLowerCase().includes(search.trim().toLowerCase()));
    if (filter === 'active') result = result.filter((room) => Number.isFinite(Number(room?.memberCount)) && Number(room.memberCount) > 0);
    if (filter === 'large') result = result.filter((room) => Number.isFinite(Number(room?.memberCount)) && Number(room.memberCount) >= 10);
    return result;
  }, [rooms, search, filter]);

  const selectFilter = (nextFilter) => {
    setFilter(nextFilter);
    setSortBy(nextFilter === 'new' ? 'timestamp' : '');
  };

  const handleJoin = async (roomId) => {
    if (!currentUserId) return toast.error('Unable to identify the current user.');
    setJoining(roomId);
    try {
      const room = await joinChatApi(roomId, null);
      setCurrentUser(currentUserId);
      setRoomUsers(room?.avlUser || []);
      setIsDm(false);
      setDmTarget('');
      setRoomId(room?.roomId || roomId);
      setConnected(true);
      navigate('/chat');
    } catch (error) {
      const message = typeof error?.response?.data === 'string' ? error.response.data : 'Unable to join room. Private rooms must be opened from Home to enter a password.';
      toast.error(message);
    } finally {
      setJoining('');
    }
  };

  return (
      <div className="app-page discover-page">
        <div className="app-frame">
          <AppNav active="discover" />
          <main className="page-content discover-workspace page-enter">
            <div className="utility-bar">
              <button type="button" className="btn btn-quiet" onClick={() => navigate('/')}><MdArrowBack size={16} /> Home</button>
              <div className="discover-results-count">{loading ? 'Loading directory…' : `${visibleRooms.length} ${visibleRooms.length === 1 ? 'room' : 'rooms'} shown`}</div>
            </div>

            <section className="discover-heading">
              <div className="discover-heading-copy">
                <div className="page-kicker">public directory</div>
                <h1 className="discover-title">Find your people.</h1>
                <p className="page-description">Search public rooms and join a conversation that fits your work.</p>
              </div>
              <div className="discover-heading-mark" aria-hidden="true"><MdExplore size={28} /></div>
            </section>

            <section className="discover-controls" aria-label="Search and filter public rooms">
              <label className="discover-search">
                <MdSearch size={19} aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by room name…" aria-label="Search public rooms" />
                {search && <button type="button" className="discover-clear-search" onClick={() => setSearch('')} aria-label="Clear room search">×</button>}
              </label>
              <div className="discover-filter-row" aria-label="Room filters">
                <span className="discover-filter-label"><MdTune size={15} /> Filters</span>
                {filters.map((item) => (
                    <button key={item.id} type="button" className={`discover-filter-chip ${filter === item.id ? 'is-active' : ''}`} onClick={() => selectFilter(item.id)} aria-pressed={filter === item.id} title={item.description}>{item.label}</button>
                ))}
              </div>
            </section>

            {loading ? (
                <div className="discover-room-grid" aria-label="Loading public rooms">
                  {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="discover-room-skeleton skeleton" />)}
                </div>
            ) : visibleRooms.length === 0 ? (
                <div className="empty-state discover-empty">
                  <div className="empty-glyph"><MdExplore size={21} /></div>
                  <h2 className="empty-title">{rooms.length === 0 ? 'No public rooms yet' : 'No rooms match this view'}</h2>
                  <p className="empty-copy">{rooms.length === 0 ? 'Create a public room from Home and it will appear here.' : 'Try another search or filter. The directory only shows rooms returned by your server.'}</p>
                  {rooms.length === 0 ? <button type="button" className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => navigate('/')}>Create a room <MdArrowForward size={16} /></button> : <button type="button" className="btn btn-secondary" style={{ marginTop: 18 }} onClick={() => { setSearch(''); selectFilter('all'); }}>Clear filters</button>}
                </div>
            ) : (
                <div className="discover-room-grid">
                  {visibleRooms.map((room, index) => {
                    const memberCount = room?.memberCount !== null && room?.memberCount !== undefined && room.memberCount !== '' && Number.isFinite(Number(room.memberCount)) ? Number(room.memberCount) : null;
                    return (
                        <article className="discover-room-card" key={room.roomId} style={{ '--card-index': index }}>
                          <div className="discover-room-card-top">
                            <span className="discover-room-symbol"><MdMeetingRoom size={20} /></span>
                            <span className="discover-room-type"><span /> Public room</span>
                          </div>
                          <h2 className="discover-room-title" title={room.roomId}># {room.roomId}</h2>
                          <p className="discover-room-description">Open space for a conversation. Join to see messages and members.</p>
                          <div className="discover-room-card-bottom">
                            <span className="discover-room-members"><MdGroups size={16} /> {memberCount === null ? 'Member count unavailable' : `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}</span>
                            <button type="button" className="discover-join-button" onClick={() => handleJoin(room.roomId)} disabled={joining !== ''} aria-label={`Join room ${room.roomId}`}>
                              {joining === room.roomId ? 'Joining…' : <>Join <MdArrowForward size={16} /></>}
                            </button>
                          </div>
                        </article>
                    );
                  })}
                </div>
            )}
            <p className="discover-directory-note">Directory results are supplied by ChatCom. Presence and live activity are shown only when the server provides that data.</p>
          </main>
        </div>
      </div>
  );
};

export default DiscoverRooms;