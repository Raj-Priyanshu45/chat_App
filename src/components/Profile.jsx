import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowForward, MdCameraAlt, MdChatBubbleOutline, MdLogout, MdMeetingRoom, MdPeopleOutline } from 'react-icons/md';
import Avatar from './Avatar';
import AppNav from './AppNav';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { getMyProfile, uploadProfileImageApi } from '../services/ProfileService';
import { joinChatApi, computeDmRoomId } from '../services/RoomService';
import { getUsernamesByIds } from '../services/UserService';
import { useAvatars, primeAvatar } from '../hooks/useAvatars';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [friendNames, setFriendNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rejoining, setRejoining] = useState('');
  const fileInputRef = useRef(null);

  const { setRoomId, setCurrentUser, setConnected, setRoomUsers, setIsDm, setDmTarget } = useChatContext();
  const auth = useAuth();
  const navigate = useNavigate();
  const currentUserId = auth.user?.id || auth.user?.subject || '';
  const avatarOf = useAvatars(profile?.friends || []);

  useEffect(() => {
    if (!auth.authInitialized) return;
    if (!auth.authenticated) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;
    const loadProfile = async () => {
      try {
        const data = await getMyProfile();
        if (cancelled) return;
        setProfile(data);
        const friendIds = data?.friends || [];
        if (friendIds.length) {
          const names = await getUsernamesByIds(friendIds);
          if (!cancelled) setFriendNames(names);
        }
      } catch {
        if (!cancelled) toast.error('Unable to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadProfile();
    return () => { cancelled = true; };
  }, [auth.authInitialized, auth.authenticated, navigate]);

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be 5 MB or smaller.');

    setUploading(true);
    try {
      const response = await uploadProfileImageApi(file);
      const imageUri = response?.imageUri;
      if (!imageUri) throw new Error('Image URL was not returned by server.');
      setProfile((prev) => ({ ...prev, imageUri }));
      primeAvatar(currentUserId, imageUri);
      toast.success('Profile photo updated.');
    } catch (error) {
      const data = error?.response?.data;
      toast.error(typeof data === 'string' ? data : error?.message || 'Could not upload the photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleMessageFriend = (friendId) => {
    if (!currentUserId) return toast.error('Unable to identify the current user.');
    if (!friendId) return toast.error('Invalid friend.');
    setCurrentUser(currentUserId);
    setDmTarget(friendId);
    setRoomId(computeDmRoomId(currentUserId, friendId));
    setRoomUsers([]);
    setIsDm(true);
    setConnected(true);
    navigate('/chat');
  };

  const handleRejoinRoom = async (roomId) => {
    if (!currentUserId) return toast.error('Unable to identify the current user.');
    setRejoining(roomId);
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
      const message = typeof error?.response?.data === 'string' ? error.response.data : 'Unable to rejoin room.';
      toast.error(message);
    } finally {
      setRejoining('');
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

  if (loading) {
    return (
      <div className="app-page">
        <div className="app-frame">
          <AppNav active="profile" />
          <div className="page-content">
            <div className="surface" style={{ padding: 28 }}>
              <div className="skeleton" style={{ width: 92, height: 92, borderRadius: 22 }} />
              <div className="skeleton" style={{ width: '45%', height: 28, marginTop: 20 }} />
              <div className="skeleton" style={{ width: '30%', height: 13, marginTop: 10 }} />
              <div className="skeleton" style={{ width: '100%', height: 110, marginTop: 26 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app-page">
        <div className="app-frame">
          <AppNav active="profile" />
          <div className="page-content"><div className="empty-state"><div className="empty-glyph"><MdPeopleOutline size={20} /></div><h2 className="empty-title">Profile unavailable</h2><p className="empty-copy">We could not load your profile right now.</p></div></div>
        </div>
      </div>
    );
  }

  const friends = profile.friends || [];
  const roomHistory = profile.roomHistory || [];
  const displayName = profile.name || profile.username || 'member';
  const profileImage = profile.imageUri || profile.profilePicUrl;

  return (
    <div className="app-page">
      <div className="app-frame">
        <AppNav active="profile" />

        <main className="page-content">
          <div className="utility-bar">
            <button type="button" className="btn btn-quiet" onClick={() => navigate('/')}>
              <MdArrowForward size={16} style={{ transform: 'rotate(180deg)' }} />
              Home
            </button>
            <button type="button" className="btn btn-danger" onClick={handleLogout}><MdLogout size={15} /> Log out</button>
          </div>

          <div className="profile-layout" style={{ marginTop: 16 }}>
            <section className="surface profile-card page-enter">
              <div className="profile-hero">
                <div>
                  <button type="button" className="profile-avatar-button" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Change profile photo">
                    {profileImage ? <img src={profileImage} alt="Profile" /> : displayName[0]?.toUpperCase()}
                    <span className={`profile-avatar-overlay ${uploading ? 'is-loading' : ''}`}>
                      {uploading ? <span className="skeleton" style={{ width: 18, height: 18, borderRadius: 5 }} /> : <MdCameraAlt size={20} />}
                    </span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/bmp" onChange={handleImageSelect} className="hidden" />
                </div>

                <div className="min-w-0">
                  <div className="page-kicker">profile</div>
                  <h1 className="profile-name">{displayName}</h1>
                  <p className="profile-username">@{profile.username}</p>
                  {profile.gmail && <p className="profile-email">{profile.gmail}</p>}
                </div>

                <span className="connection-pill" style={{ justifySelf: 'end' }}><span className="live-dot" /> active</span>
              </div>

              <div className="profile-stat-strip">
                <div className="profile-stat"><div className="profile-stat-value">{friends.length}</div><div className="profile-stat-label">friends</div></div>
                <div className="profile-stat"><div className="profile-stat-value">{roomHistory.length}</div><div className="profile-stat-label">rooms visited</div></div>
              </div>

              <section className="surface-soft profile-section">
                <div className="section-head">
                  <div><div className="page-kicker">people</div><h2 className="section-title" style={{ marginTop: 5 }}>Friends</h2><p className="section-copy">Your direct conversations start here.</p></div>
                  <MdPeopleOutline size={19} style={{ color: 'var(--app-muted)' }} />
                </div>

                {friends.length === 0 ? (
                  <div className="empty-state" style={{ marginTop: 16, padding: '28px 18px' }}><div className="empty-glyph"><MdPeopleOutline size={18} /></div><h3 className="empty-title">No friends yet</h3><p className="empty-copy">Message someone from a room to start building your direct circle.</p></div>
                ) : (
                  <div style={{ marginTop: 14 }}>
                    {friends.map((friendId) => {
                      const username = friendNames[friendId] || 'Unknown user';
                      return (
                        <div className="friend-row" key={friendId}>
                          <Avatar src={avatarOf(friendId)} name={username} size={40} />
                          <div className="min-w-0"><div className="friend-name">@{username}</div><div className="collection-subtitle">available for a private chat</div></div>
                          <button type="button" className="icon-button" onClick={() => handleMessageFriend(friendId)} title={`Message ${username}`} aria-label={`Message ${username}`}><MdChatBubbleOutline size={17} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </section>

            <aside>
              <section className="surface side-card">
                <div className="page-kicker">room history</div>
                <h2 className="side-card-title" style={{ marginTop: 7 }}>Threads worth reopening.</h2>
                <p className="side-card-copy">Rooms stay easy to return to even after you leave the chat view.</p>

                {roomHistory.length === 0 ? (
                  <div className="empty-state" style={{ marginTop: 18, padding: '30px 18px' }}><div className="empty-glyph"><MdMeetingRoom size={18} /></div><h3 className="empty-title">No room history</h3><p className="empty-copy">Join or create a room from Home to build your history.</p></div>
                ) : (
                  <div className="room-list">
                    {roomHistory.map((historyRoomId) => (
                      <div className="room-row" key={historyRoomId}>
                        <div style={{ minWidth: 0 }}><span className="room-id">#{historyRoomId}</span><span className="room-meta"><span className="room-meta-dot" /> room history</span></div>
                        <button type="button" className="icon-button" style={{ width: 38, height: 38 }} onClick={() => handleRejoinRoom(historyRoomId)} disabled={rejoining === historyRoomId} title={`Rejoin ${historyRoomId}`} aria-label={`Rejoin ${historyRoomId}`}>
                          {rejoining === historyRoomId ? <span className="skeleton" style={{ width: 14, height: 14, borderRadius: 4 }} /> : <MdArrowForward size={16} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
