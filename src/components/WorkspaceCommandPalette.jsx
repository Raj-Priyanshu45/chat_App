import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  MdArrowForward,
  MdDarkMode,
  MdExplore,
  MdHome,
  MdKeyboardCommandKey,
  MdMeetingRoom,
  MdPerson,
  MdSearch,
  MdWbSunny,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import useAuth from '../context/AuthContext';
import useChatContext from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { getMyActiveRoomsApi } from '../services/MyRoomsService';
import { joinChatApi } from '../services/RoomService';

const isDmRoomId = (roomId, userId) => Boolean(userId) && roomId.length === userId.length * 2 && roomId.includes(userId);
const requestPaletteOpen = () => window.dispatchEvent(new Event('chatcom:open-command-palette'));

const WorkspaceCommandPalette = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { roomId, isDm, setRoomId, setCurrentUser, setConnected, setRoomUsers, setIsDm, setDmTarget } = useChatContext();
  const currentUserId = auth.user?.id || auth.user?.subject || '';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rooms, setRooms] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [joiningRoom, setJoiningRoom] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    const onOpenRequest = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('chatcom:open-command-palette', onOpenRequest);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('chatcom:open-command-palette', onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (!open || !auth.authenticated || !currentUserId) return undefined;
    let cancelled = false;
    getMyActiveRoomsApi()
      .then((ids) => {
        if (cancelled || !Array.isArray(ids)) return;
        setRooms(ids.filter((id) => typeof id === 'string' && id.trim() && !isDmRoomId(id, currentUserId)));
      })
      .catch(() => {
        if (!cancelled) setRooms([]);
      });
    return () => { cancelled = true; };
  }, [open, auth.authenticated, currentUserId]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => setActiveIndex(0), [query]);

  const commands = useMemo(() => [
    { id: 'home', label: 'Go to Home', detail: 'Join or create a room', icon: MdHome, terms: 'home dashboard join create', run: () => navigate('/') },
    { id: 'discover', label: 'Discover rooms', detail: 'Browse public rooms', icon: MdExplore, terms: 'discover public search rooms', run: () => navigate('/discover') },
    { id: 'profile', label: 'Open profile', detail: 'Your account and connections', icon: MdPerson, terms: 'profile account people friends', run: () => navigate('/profile') },
    ...(roomId && location.pathname !== '/chat' ? [{ id: 'chat', label: 'Return to current chat', detail: isDm ? 'Direct message' : `#${roomId}`, icon: MdMeetingRoom, terms: 'chat current conversation room', run: () => navigate('/chat') }] : []),
    { id: 'theme', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, detail: 'Change workspace appearance', icon: theme === 'dark' ? MdWbSunny : MdDarkMode, terms: 'theme appearance light dark color', run: () => toggleTheme(inputRef.current) },
  ], [navigate, roomId, isDm, location.pathname, theme, toggleTheme]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCommands = commands.filter((item) => `${item.label} ${item.detail} ${item.terms}`.toLowerCase().includes(normalizedQuery));
  const filteredRooms = rooms.filter((id) => id.toLowerCase().includes(normalizedQuery)).slice(0, 8);
  const items = [
    ...filteredCommands.map((item) => ({ ...item, kind: 'command' })),
    ...filteredRooms.map((id) => ({ id: `room:${id}`, label: `#${id}`, detail: 'Open saved room', icon: MdMeetingRoom, kind: 'room', roomId: id })),
  ];

  const selectRoom = useCallback(async (targetRoomId) => {
    setJoiningRoom(targetRoomId);
    try {
      const room = await joinChatApi(targetRoomId, null);
      setCurrentUser(currentUserId);
      setRoomUsers(room?.avlUser || []);
      setIsDm(false);
      setDmTarget('');
      setRoomId(room?.roomId || targetRoomId);
      setConnected(true);
      setOpen(false);
      navigate('/chat');
    } catch (error) {
      toast.error(error?.response?.status === 404
        ? 'That room no longer exists.'
        : 'Could not open this room. If it is password-protected, open it from Home to enter its password.');
    } finally {
      setJoiningRoom('');
    }
  }, [currentUserId, navigate, setConnected, setCurrentUser, setDmTarget, setIsDm, setRoomId, setRoomUsers]);

  const runItem = (item) => {
    if (!item) return;
    if (item.kind === 'room') {
      void selectRoom(item.roomId);
      return;
    }
    setOpen(false);
    item.run();
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => items.length ? (current + 1) % items.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => items.length ? (current - 1 + items.length) % items.length : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runItem(items[activeIndex]);
    }
  };

  if (!auth.authInitialized || !auth.authenticated) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="command-palette-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <motion.section
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <h2 id="command-palette-title" className="sr-only">Workspace command palette</h2>
            <div className="command-palette-search">
              <MdSearch size={20} aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search pages and your rooms…"
                aria-label="Search commands and rooms"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-results"
                aria-autocomplete="list"
              />
              <kbd>ESC</kbd>
            </div>
            <div id="command-palette-results" className="command-palette-results" role="listbox" aria-label="Commands and rooms">
              {items.length ? items.map((item, index) => {
                const Icon = item.icon;
                const active = index === activeIndex;
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`command-palette-item ${active ? 'is-active' : ''}`}
                    key={item.id}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runItem(item)}
                    disabled={Boolean(joiningRoom)}
                  >
                    <span className="command-palette-icon"><Icon size={17} /></span>
                    <span className="command-palette-item-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
                    {item.kind === 'room' && joiningRoom === item.roomId ? <span className="command-palette-loading" /> : <MdArrowForward size={15} className="command-palette-arrow" />}
                  </button>
                );
              }) : <p className="command-palette-empty">No commands or rooms match “{query}”.</p>}
            </div>
            <footer className="command-palette-footer">
              <span><kbd><MdKeyboardCommandKey size={11} /> K</kbd> to open</span>
              <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
              <span><kbd>↵</kbd> select</span>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { requestPaletteOpen };
export default WorkspaceCommandPalette;
