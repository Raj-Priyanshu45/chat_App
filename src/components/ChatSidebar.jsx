import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MdAdd, MdClose, MdMeetingRoom, MdSearch, MdLogout } from 'react-icons/md';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';
import { requestPaletteOpen } from './WorkspaceCommandPalette';
import useAuth from '../context/AuthContext';
import useChatContext from '../context/ChatContext';
import { getMyProfile } from '../services/ProfileService';
import { getMyActiveRoomsApi } from '../services/MyRoomsService';
import { computeDmRoomId, getUnreadCountApi } from '../services/RoomService';
import { lookupUsernamesApi } from '../services/UserService';
import { useAvatars } from '../hooks/useAvatars';

const isLikelyDmRoomId = (roomId, userId) =>
    Boolean(userId) && roomId.length === userId.length * 2 && roomId.includes(userId);

const ChatSidebar = ({ mobileOpen = false, presenceByUserId = {}, onCloseMobile, onOpenRoom, onOpenDm, onLogout }) => {
    const auth = useAuth();
    const navigate = useNavigate();
    const { roomId, isDm, dmTarget } = useChatContext();
    const currentUserId = auth.user?.id || auth.user?.subject || '';

    const [rooms, setRooms] = useState([]);
    const [friends, setFriends] = useState([]);
    const [usernames, setUsernames] = useState({});
    const [unreadByRoom, setUnreadByRoom] = useState({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const searchRef = useRef(null);

    const avatarOf = useAvatars(friends);

    useEffect(() => {
        if (!auth.authInitialized || !auth.authenticated || !currentUserId) return undefined;

        let cancelled = false;
        const loadSidebar = async () => {
            setLoading(true);
            const [roomResult, profileResult] = await Promise.allSettled([
                getMyActiveRoomsApi(),
                getMyProfile(),
            ]);

            if (cancelled) return;

            const activeRooms = roomResult.status === 'fulfilled' && Array.isArray(roomResult.value)
                ? roomResult.value.filter((id) => typeof id === 'string' && id.trim())
                : [];
            const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
            const friendIds = [...new Set((profile?.friends || []).filter((id) => typeof id === 'string' && id && id !== currentUserId))];
            const friendDmIds = new Set(friendIds.map((id) => computeDmRoomId(currentUserId, id)));

            setRooms(activeRooms.filter((id) => !friendDmIds.has(id) && !isLikelyDmRoomId(id, currentUserId)));
            setFriends(friendIds);

            if (friendIds.length) {
                try {
                    const names = await lookupUsernamesApi(friendIds);
                    if (!cancelled) setUsernames(names || {});
                } catch {
                    if (!cancelled) setUsernames({});
                }
            } else {
                setUsernames({});
            }

            if (!cancelled) setLoading(false);
        };

        void loadSidebar();
        return () => { cancelled = true; };
    }, [auth.authInitialized, auth.authenticated, currentUserId]);

    const refreshUnread = useCallback(async (specificRoomId = null) => {
        const allTargets = [
            ...rooms,
            ...friends.map((friendId) => computeDmRoomId(currentUserId, friendId)).filter(Boolean),
        ];
        const targets = specificRoomId ? [specificRoomId] : [...new Set(allTargets)];

        if (!targets.length) {
            setUnreadByRoom({});
            return;
        }

        const results = await Promise.allSettled(targets.map((id) => getUnreadCountApi(id)));
        const refreshed = Object.fromEntries(targets.map((id, index) => [
            id,
            results[index].status === 'fulfilled' ? Number(results[index].value) || 0 : 0,
        ]));

        if (specificRoomId) {
            setUnreadByRoom((previous) => ({ ...previous, ...refreshed }));
        } else {
            setUnreadByRoom(refreshed);
        }
    }, [rooms, friends, currentUserId]);

    useEffect(() => {
        void refreshUnread();
        const handleUnreadUpdate = (event) => {
            void refreshUnread(event.detail?.roomId || null);
        };
        const handleFocus = () => { void refreshUnread(); };
        window.addEventListener('chatcom:unread-updated', handleUnreadUpdate);
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('chatcom:unread-updated', handleUnreadUpdate);
            window.removeEventListener('focus', handleFocus);
        };
    }, [refreshUnread]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchRef.current?.focus();
            }
            if (event.key === 'Escape' && mobileOpen) onCloseMobile?.();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [mobileOpen, onCloseMobile]);

    const query = search.trim().toLowerCase();
    const currentDmRoomId = isDm ? computeDmRoomId(currentUserId, dmTarget) : '';
    const currentGroupRoom = !isDm && rooms.includes(roomId) ? roomId : '';

    const filteredRooms = useMemo(
        () => rooms.filter((id) => id.toLowerCase().includes(query)),
        [rooms, query]
    );
    const filteredFriends = useMemo(
        () => friends.filter((id) => `${usernames[id] || ''} ${id}`.toLowerCase().includes(query)),
        [friends, usernames, query]
    );

    const openRoom = (id) => {
        onOpenRoom?.(id);
        onCloseMobile?.();
    };

    const openDm = (id) => {
        onOpenDm?.(id);
        onCloseMobile?.();
    };

    const roomButton = (id, active = false, index = 0) => (
        <motion.button
            type="button"
            key={id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.17, delay: Math.min(index * 0.025, 0.15) }}
            className={`chat-sidebar-item ${active ? 'is-active' : ''}`}
            onClick={() => openRoom(id)}
            aria-current={active ? 'page' : undefined}
        >
            <span className="chat-sidebar-room-icon"><MdMeetingRoom size={16} /></span>
            <span className="chat-sidebar-item-copy">
        <span className="chat-sidebar-item-title">#{id}</span>
        <span className="chat-sidebar-item-subtitle">Room</span>
      </span>
            {unreadByRoom[id] > 0 && <span className="unread-badge">{unreadByRoom[id] > 99 ? '99+' : unreadByRoom[id]}</span>}
        </motion.button>
    );

    return (
        <>
            {mobileOpen && <button type="button" className="chat-sidebar-backdrop" aria-label="Close room list" onClick={onCloseMobile} />}
            <aside className={`chat-sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Room and direct message list">
                <div className="chat-sidebar-header">
                    <div className="chat-sidebar-brand">
                        <span className="chat-sidebar-mark" aria-hidden="true">C</span>
                        <span><strong>ChatCom</strong><small>your workspace</small></span>
                    </div>
                    <div className="chat-sidebar-header-actions">
                        <button type="button" className="chat-sidebar-icon-button" onClick={requestPaletteOpen} title="Search pages and rooms (⌘K)" aria-label="Open command palette"><MdSearch size={17} /></button>
                        <ThemeToggle compact className="chat-sidebar-icon-button theme-toggle-sidebar" />
                        <button type="button" className="chat-sidebar-icon-button" onClick={() => navigate('/')} title="Join or create a room" aria-label="Join or create a room"><MdAdd size={19} /></button>
                        <button type="button" className="chat-sidebar-icon-button chat-sidebar-mobile-close" onClick={onCloseMobile} title="Close room list" aria-label="Close room list"><MdClose size={19} /></button>
                    </div>
                </div>

                <label className="chat-sidebar-search">
                    <MdSearch size={17} aria-hidden="true" />
                    <input
                        ref={searchRef}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search rooms and people"
                        aria-label="Search rooms and people"
                    />
                    {!search && <kbd>⌘ K</kbd>}
                </label>

                <div className="chat-sidebar-scroll">
                    {currentGroupRoom && !query && (
                        <section className="chat-sidebar-section">
                            <div className="chat-sidebar-section-heading">Current room</div>
                            {roomButton(currentGroupRoom, true, 0)}
                        </section>
                    )}

                    <section className="chat-sidebar-section">
                        <div className="chat-sidebar-section-heading">
                            <span>Your rooms</span><span className="chat-sidebar-section-count">{filteredRooms.filter((id) => query || id !== currentGroupRoom).length}</span>
                        </div>
                        {loading ? (
                            <div className="chat-sidebar-skeletons"><span /><span /><span /></div>
                        ) : filteredRooms.filter((id) => query || id !== currentGroupRoom).length ? (
                            filteredRooms.filter((id) => query || id !== currentGroupRoom).map((id, index) => roomButton(id, !isDm && id === roomId, index))
                        ) : (
                            <p className="chat-sidebar-empty">{query ? 'No matching rooms.' : 'Rooms you join will appear here.'}</p>
                        )}
                    </section>

                    <section className="chat-sidebar-section">
                        <div className="chat-sidebar-section-heading">
                            <span>Direct messages</span><span className="chat-sidebar-section-count">{filteredFriends.length}</span>
                        </div>
                        {!loading && filteredFriends.length === 0 ? (
                            <p className="chat-sidebar-empty">{query ? 'No matching people.' : 'Start a conversation from a room member list.'}</p>
                        ) : filteredFriends.map((friendId) => {
                            const name = usernames[friendId] || 'Member';
                            const friendRoomId = computeDmRoomId(currentUserId, friendId);
                            const active = isDm && friendId === dmTarget;
                            return (
                                <motion.button
                                    type="button"
                                    key={friendId}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.99 }}
                                    transition={{ duration: 0.17, delay: Math.min(filteredFriends.indexOf(friendId) * 0.025, 0.15) }}
                                    className={`chat-sidebar-item chat-sidebar-dm ${active ? 'is-active' : ''}`}
                                    onClick={() => openDm(friendId)}
                                    aria-current={active ? 'page' : undefined}
                                >
                  <span className="chat-sidebar-avatar-wrap">
                    <Avatar src={avatarOf(friendId)} name={name} size={34} />
                      {typeof presenceByUserId[friendId] === 'boolean' && (
                          <span className={`chat-sidebar-presence-dot${presenceByUserId[friendId] ? ' is-online' : ''}`} title={presenceByUserId[friendId] ? 'Online' : 'Offline'} aria-label={presenceByUserId[friendId] ? 'Online' : 'Offline'} />
                      )}
                  </span>
                                    <span className="chat-sidebar-item-copy">
                    <span className="chat-sidebar-item-title">@{name}</span>
                    <span className="chat-sidebar-item-subtitle">{presenceByUserId[friendId] === true ? 'Online now' : presenceByUserId[friendId] === false ? 'Offline' : 'Direct message'}</span>
                  </span>
                                    {unreadByRoom[friendRoomId] > 0 && <span className="unread-badge">{unreadByRoom[friendRoomId] > 99 ? '99+' : unreadByRoom[friendRoomId]}</span>}
                                </motion.button>
                            );
                        })}
                    </section>
                </div>

                <div className="chat-sidebar-footer">
                    <Avatar src={auth.user?.imageUri} name={auth.user?.username || auth.user?.name || 'Member'} size={34} />
                    <span className="chat-sidebar-footer-copy">
            <strong>@{auth.user?.username || auth.user?.name || 'member'}</strong>
            <small>Signed in</small>
          </span>
                    <button type="button" className="chat-sidebar-icon-button" onClick={() => navigate('/profile')} aria-label="Open profile" title="Profile">↗</button>
                    <button type="button" className="chat-sidebar-icon-button chat-sidebar-logout" onClick={onLogout} aria-label="Log out" title="Log out"><MdLogout size={17} /></button>
                </div>
            </aside>
        </>
    );
};

export default ChatSidebar;