import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdMeetingRoom, MdArrowForward } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { joinChatApi } from '../services/RoomService';
import { getMyActiveRoomsApi } from '../services/MyRoomsService';

const isDmRoomId = (roomId, userId) => Boolean(userId) && roomId.length === userId.length * 2 && roomId.includes(userId);

const MyRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const { setRoomId, setCurrentUser, setConnected, setRoomUsers, setIsDm, setDmTarget } = useChatContext();
  const auth = useAuth();
  const navigate = useNavigate();
  const currentUserId = auth.user?.id || auth.user?.subject || '';

  useEffect(() => {
    if (!auth.authInitialized || !auth.authenticated) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const ids = await getMyActiveRoomsApi();
        if (!cancelled) setRooms(ids.filter((id) => typeof id === 'string' && !isDmRoomId(id, currentUserId)));
      } catch {
        if (!cancelled) toast.error('Unable to load your rooms.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [auth.authInitialized, auth.authenticated, currentUserId]);

  const enterRoom = (room, roomId) => {
    setCurrentUser(currentUserId);
    setRoomUsers([]);
    setIsDm(false);
    setDmTarget('');
    setRoomId(room?.roomId || roomId);
    setConnected(true);
    navigate('/chat');
  };

  const handleOpen = async (roomId) => {
    if (!currentUserId) return toast.error('Unable to identify the current user.');
    setJoiningId(roomId);
    try {
      let room;
      try {
        room = await joinChatApi(roomId, null);
      } catch (error) {
        if (error?.response?.status === 404) {
          toast.error('Room not found.');
          return;
        }
        const password = window.prompt('Enter the room password:');
        if (!password) return;
        try {
          room = await joinChatApi(roomId, password);
        } catch {
          toast.error('Wrong password or unable to join.');
          return;
        }
      }
      enterRoom(room, roomId);
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return (
      <div className="room-list">
        {[1, 2, 3].map((item) => <div className="skeleton" key={item} style={{ height: 48 }} />)}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 4, padding: '28px 18px' }}>
        <div className="empty-glyph"><MdMeetingRoom size={19} /></div>
        <h3 className="empty-title">No saved rooms</h3>
        <p className="empty-copy">Join or create a room above and it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="room-list">
      {rooms.map((roomId) => (
        <div key={roomId} className="room-row">
          <div style={{ minWidth: 0 }}>
            <span className="room-id">#{roomId}</span>
            <span className="room-meta"><span className="room-meta-dot" /> active membership</span>
          </div>
          <button type="button" className="icon-button" style={{ width: 38, height: 38 }} onClick={() => handleOpen(roomId)} disabled={joiningId === roomId} title={`Open ${roomId}`} aria-label={`Open ${roomId}`}>
            {joiningId === roomId ? <span className="skeleton" style={{ width: 14, height: 14, borderRadius: 4 }} /> : <MdArrowForward size={16} />}
          </button>
        </div>
      ))}
    </div>
  );
};

export default MyRooms;
